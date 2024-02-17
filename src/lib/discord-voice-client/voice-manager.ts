/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	SocketState,
	type AudioSettings,
	type VoiceStateUpdate,
	type VoiceServerUpdate,
	type Codecs
} from './types'
import type { GatewaySocket } from './gateway-socket'
import EventEmitter from 'eventemitter3'
import { GatewayDispatchEvents, GatewayOpcodes } from 'discord-api-types/v10'
import { VoiceOpcodes } from 'discord-api-types/voice'
import { VoiceSocket } from './voice-socket'
import { VoiceRTC } from './voice-rtc'
import { VoiceManagerConnectionError, VoiceManagerSpeakingError } from './errors'

export type VoiceManagerState = keyof typeof VoiceManagerState
export const VoiceManagerState = {
	INITIAL: 'INITIAL',
	CONNECTING: 'CONNECTING',
	CONNECTED: 'CONNECTED',
	RECONNECTING: 'RECONNECTING',
	DISCONNECTED: 'DISCONNECTED',
	FAILED: 'FAILED'
} as const

export interface VoiceManager extends EventEmitter {
	on(event: 'state', listener: (state: VoiceManagerState) => void): this
	on(event: '', listener: () => void): this
	emit(event: 'state', state: VoiceManagerState): boolean
	emit(event: ''): boolean
}

export class VoiceManager extends EventEmitter {
	private readonly ac = new AudioContext()
	private readonly dst_i = this.ac.createMediaStreamDestination()
	private readonly dst_o = this.ac.createMediaStreamDestination()

	public set stream_i(stream: MediaStream) {
		this.ac.createMediaStreamSource(stream).connect(this.dst_i)
	}

	public get stream_o() {
		return this.dst_o.stream
	}

	private gateway: GatewaySocket
	private voice?: VoiceSocket
	private rtc?: VoiceRTC

	private guild_id: string | null = null
	private channel_id: string | null = null
	private self_mute = false
	private self_deaf = false

	private audio_settings: AudioSettings
	private speaking = false

	private ssrc?: number

	private select_protocol_sdp?: string
	private codecs?: Codecs
	private endpoint?: string
	private token?: string

	private reconnect_attempts = 0

	private _state: VoiceManagerState = VoiceManagerState.INITIAL

	public get state() {
		return this._state
	}

	private readonly debug?: (...args: any) => void

	constructor(params: {
		gateway_socket: GatewaySocket
		audio_settings?: Partial<AudioSettings>
		debug?: boolean
	}) {
		super()

		const { gateway_socket, debug, audio_settings } = params

		this.debug = !debug ? undefined : (...args) => console.debug('[Voice Manager]', ...args)

		this.gateway = gateway_socket
		this.gateway.on('packet', (p) => this.onGatewayPacket(p))
		this.gateway.on('state', (s) => ['DONE', 'FAILED'].includes(s) ?? this._disconnect())

		this.audio_settings = {
			stereo: audio_settings?.stereo ?? false,
			bitrate_kbps: audio_settings?.bitrate_kbps ?? 64,
			mode: audio_settings?.mode ?? 'sendonly'
		}

		this.on('state', (s) => {
			this._state = s
			this.debug?.(`State Update: ${s}`)
		})
	}

	/** Update voice state. This can be used to connect to or move voice channels */
	public update(params: {
		guild_id?: string | null
		channel_id?: string | null
		self_mute?: boolean
		self_deaf?: boolean
		speaking?: boolean
		audio_settings?: Partial<AudioSettings>
	}) {
		if (this.gateway.state !== SocketState.READY) {
			throw new VoiceManagerConnectionError('Gateway not ready.')
		}

		const { guild_id, channel_id, audio_settings, speaking, self_deaf, self_mute } = params

		this.guild_id = guild_id ?? this.guild_id
		this.channel_id = channel_id ?? this.channel_id
		this.self_mute = self_mute ?? this.self_mute
		this.self_deaf = self_deaf ?? this.self_deaf

		if (this.state !== VoiceManagerState.CONNECTED) {
			this.speaking = speaking ?? this.speaking
		} else if (speaking) {
			this.setSpeaking(speaking)
		}

		if (audio_settings) {
			this.audio_settings = {
				stereo: audio_settings?.stereo ?? this.audio_settings.stereo,
				bitrate_kbps: audio_settings?.bitrate_kbps ?? this.audio_settings.bitrate_kbps,
				mode: audio_settings?.mode ?? this.audio_settings.mode
			}
		}

		this.gateway.sendPacket({
			op: GatewayOpcodes.VoiceStateUpdate,
			d: {
				guild_id: this.guild_id,
				channel_id: this.channel_id,
				self_mute: this.self_mute,
				self_deaf: this.self_deaf
			}
		})
	}

	private updateState() {
		const rtc_state = this.rtc?.state
		const voice_state = this.voice?.state

		if (!rtc_state || !voice_state) return

		switch (true) {
			case this.state !== 'RECONNECTING' && ['DONE', 'FAILED'].includes(voice_state): {
				this._disconnect(voice_state === VoiceManagerState.FAILED)
				break
			}

			case rtc_state === 'failed': {
				if (!(this.reconnect_attempts > 1) && this.endpoint && this.guild_id && this.token) {
					this.reconnect_attempts++
					this.emit('state', VoiceManagerState.RECONNECTING)
					this.initConnection(this.endpoint, this.guild_id, this.token)
				} else this._disconnect(true)
				break
			}

			case this.state === 'RECONNECTING' && voice_state === 'RESUMING': {
				this.emit('state', VoiceManagerState.RECONNECTING)
				break
			}

			case this.state !== 'RECONNECTING' &&
				(voice_state === 'INITIALISING' || rtc_state === 'connecting'): {
				this.emit('state', VoiceManagerState.CONNECTING)
				break
			}

			case rtc_state === 'connected': {
				this.reconnect_attempts = 0
				this.emit('state', VoiceManagerState.CONNECTED)
				break
			}
		}
	}

	private async initConnection(endpoint: string, guild_id: string, token: string) {
		this.rtc?.close()
		this.voice?.destroy()

		this.rtc = new VoiceRTC({ debug: !!this.debug })
		this.rtc.on('state', () => this.updateState())

		this.rtc.stream_i = this.dst_i.stream
		this.ac.createMediaStreamSource(this.rtc.stream_o).connect(this.dst_o)

		const { select_protocol_sdp, codecs, ssrc } = await this.rtc.init({
			audio_settings: this.audio_settings
		})

		this.guild_id = guild_id
		this.token = token
		this.endpoint = endpoint

		this.select_protocol_sdp = select_protocol_sdp
		this.codecs = codecs
		this.ssrc = ssrc

		this.voice = new VoiceSocket({
			user_id: this.gateway.identity.id!,
			session_id: this.gateway.session_id!,
			address: endpoint,
			guild_id,
			token,
			debug: !!this.debug
		})
		this.voice.on('state', () => this.updateState())
		this.voice.on('packet', (p) => this.onVoicePacket(p))
	}

	private onGatewayPacket(packet: any) {
		switch (packet.t) {
			case GatewayDispatchEvents.VoiceStateUpdate: {
				const { channel_id, user_id } = packet.d as VoiceStateUpdate['d']

				if (user_id !== this.gateway.identity.id) break
				if (channel_id) break

				this.rtc?.close()
				this.voice?.destroy()

				break
			}

			case GatewayDispatchEvents.VoiceServerUpdate: {
				const { endpoint, guild_id, token } = packet.d as VoiceServerUpdate['d']
				this.emit('state', VoiceManagerState.CONNECTING)
				this.initConnection(endpoint, guild_id, token)
			}
		}
	}

	private onVoicePacket(packet: any) {
		switch (packet.op) {
			case VoiceOpcodes.Ready: {
				this.voice!.sendSelectProtocol(this.select_protocol_sdp!, this.codecs!)
				break
			}

			case VoiceOpcodes.SessionDescription: {
				this.rtc!.setDiscordSDP(packet.d.sdp)
				this.setSpeaking(this.speaking)
				break
			}

			case VoiceOpcodes.Resumed: {
				this.setSpeaking(this.speaking)
				break
			}

			case VoiceOpcodes.Speaking: {
				const { user_id, ssrc } = packet.d
				this.rtc!.addUserAudioReceiver(user_id, ssrc)
				break
			}

			case VoiceOpcodes.ClientDisconnect: {
				const { user_id } = packet.d
				this.rtc!.stopUserAudioReceiver(user_id)
				break
			}
		}
	}

	public setSpeaking(speaking: boolean) {
		this.speaking = speaking

		if (!this.voice) {
			throw new VoiceManagerSpeakingError('Voice socket not open.')
		}

		this.voice.sendPacket({
			op: VoiceOpcodes.Speaking,
			d: {
				speaking: speaking ? 1 : 0,
				delay: 0,
				ssrc: this.ssrc
			}
		})
	}

	private _disconnect(failed?: boolean) {
		if (['DISCONNECTED', 'FAILED'].includes(this.state)) return

		if (failed && this.gateway.state === SocketState.READY) {
			this.gateway.sendPacket({
				op: GatewayOpcodes.VoiceStateUpdate,
				d: {
					guild_id: this.guild_id,
					channel_id: null,
					self_mute: this.self_mute,
					self_deaf: this.self_deaf
				}
			})
		}

		this.rtc?.close()
		this.voice?.destroy()

		this.rtc = undefined
		this.voice = undefined
		this.guild_id = null
		this.channel_id = null

		this.emit('state', failed ? VoiceManagerState.FAILED : VoiceManagerState.DISCONNECTED)
	}

	public disconnect() {
		this.gateway.sendPacket({
			op: GatewayOpcodes.VoiceStateUpdate,
			d: {
				guild_id: this.guild_id,
				channel_id: null,
				self_mute: this.self_mute,
				self_deaf: this.self_deaf
			}
		})

		this._disconnect()
	}
}
