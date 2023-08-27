import EventEmitter from 'eventemitter3'
import { GatewayDispatchEvents, GatewayOpcodes } from 'discord-api-types/v10'
import type { GatewaySocket } from './gateway-socket'
import {
	VoiceSocket,
	type Codecs,
	type VoiceStateUpdate,
	type VoiceServerUpdate
} from './voice-socket'
import { VoiceRTC, type AudioSettings } from './voice-rtc'
import { VoiceOpcodes } from 'discord-api-types/voice'
import { VoiceConnectionError, VoiceSpeakingError } from './errors'

export type ConnectionParams = {
	guild_id: string
	channel_id: string
	audio_track: MediaStreamTrack
	audio_settings?: {
		initial_speaking?: boolean
		self_mute?: boolean
		self_deaf?: boolean
	} & AudioSettings
}
export interface VoiceManager extends EventEmitter {
	on(event: 'track', listener: (event: MediaStreamTrack) => void): this
	on(event: 'connected', listener: () => void): this
	on(event: 'disconnected', listener: () => void): this
	once(event: 'track', listener: (event: MediaStreamTrack) => void): this
	once(event: 'connected', listener: () => void): this
	once(event: 'disconnected', listener: () => void): this
	emit(event: 'track', track: MediaStreamTrack): boolean
	emit(event: 'connected'): boolean
	emit(event: 'disconnected'): boolean
}

export class VoiceManager extends EventEmitter {
	private guild_id: string | null = null
	private channel_id: string | null = null
	private self_mute = false
	private self_deaf = false

	private gateway: GatewaySocket
	private voice?: VoiceSocket
	private rtc?: VoiceRTC

	private track?: MediaStreamTrack
	private ssrc?: number

	private audio_settings?: AudioSettings
	private initial_speaking = false
	private debug = false

	constructor(params: { gatewaySocket: GatewaySocket; debug?: boolean }) {
		super()

		const { gatewaySocket, debug } = params

		this.gateway = gatewaySocket
		this.gateway.on('packet', (p) => this.handleGatewayPacket(p))

		this.debug = debug ?? false
	}

	public connect(params: ConnectionParams) {
		if (!this.gateway.ready) throw new VoiceConnectionError('Gateway not ready.')

		const { guild_id, channel_id, audio_track, audio_settings } = params

		this.guild_id = guild_id
		this.channel_id = channel_id
		this.self_mute = audio_settings?.self_mute ?? false
		this.self_deaf = audio_settings?.self_deaf ?? false

		this.track = audio_track ?? this.track
		this.audio_settings = audio_settings ?? this.audio_settings
		this.initial_speaking = audio_settings?.initial_speaking ?? false

		this.gateway.sendPacket({
			op: GatewayOpcodes.VoiceStateUpdate,
			d: {
				guild_id,
				channel_id,
				self_mute: this.self_mute,
				self_deaf: this.self_deaf
			}
		})
	}

	private async handleGatewayPacket(packet: any) {
		switch (packet.t) {
			case GatewayDispatchEvents.VoiceStateUpdate: {
				const { channel_id, user_id } = packet.d as VoiceStateUpdate['d']

				if (user_id !== this.gateway.identity.id) return

				this.channel_id === channel_id

				if (!channel_id) {
					this.rtc?.destroy()
					this.voice?.destroy(true)
					return
				}

				break
			}

			case GatewayDispatchEvents.VoiceServerUpdate: {
				const { endpoint, guild_id, token } = packet.d as VoiceServerUpdate['d']

				this.rtc?.destroy()
				this.rtc = new VoiceRTC({ debug: this.debug })
				this.rtc.on('track', (t) => this.emit('track', t))

				await this.rtc.openConnection(this.track!, this.audio_settings)
				const { sdp, codecs, ssrc } = await this.rtc.createOffer()

				this.ssrc = ssrc

				this.voice?.destroy()
				this.voice = new VoiceSocket({
					user_id: this.gateway.identity.id!,
					session_id: this.gateway.session_id!,
					address: endpoint,
					guild_id,
					token,
					debug: this.debug
				})
				this.voice.on('packet', (p) => this.handleVoicePacket(p, sdp, codecs))
				this.voice.on('close', () => {
					this.rtc?.destroy()
					this.emit('disconnected')
				})
			}
		}
	}

	private async handleVoicePacket(packet: any, sdp: string, codecs: Codecs) {
		switch (packet.op) {
			case VoiceOpcodes.Ready: {
				await this.voice!.sendSelectProtocol(sdp, codecs)
				break
			}

			case VoiceOpcodes.SessionDescription: {
				await this.rtc!.handleAnswer(packet.d.sdp)
				this.setSpeaking(this.initial_speaking)
				this.emit('connected')
				break
			}
		}
	}

	public setSpeaking(speaking: boolean) {
		if (!this.voice) throw new VoiceSpeakingError('Voice socket not open.')

		this.voice.sendPacket({
			op: VoiceOpcodes.Speaking,
			d: {
				speaking: speaking ? 1 : 0,
				delay: 0,
				ssrc: this.ssrc
			}
		})
	}

	public move(params: {
		guild_id: string
		channel_id: string
		self_mute?: boolean
		self_deaf?: boolean
	}) {
		const { guild_id, channel_id, self_deaf, self_mute } = params

		this.gateway.sendPacket({
			op: GatewayOpcodes.VoiceStateUpdate,
			d: {
				guild_id,
				channel_id,
				self_mute: self_mute ?? this.self_mute,
				self_deaf: self_deaf ?? this.self_deaf
			}
		})
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
		this.rtc?.destroy()
		this.voice?.destroy(true)
	}
}
