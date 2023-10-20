import EventEmitter from 'eventemitter3'
import { GatewayDispatchEvents, GatewayOpcodes } from 'discord-api-types/v10'
import { VoiceOpcodes } from 'discord-api-types/voice'
import type { GatewaySocket } from './gateway-socket'
import { VoiceSocket } from './voice-socket'
import { VoiceRTC } from './voice-rtc'
import { VoiceConnectionError, VoiceSpeakingError } from './errors'
import type { AudioSettings, VoiceStateUpdate, VoiceServerUpdate, Codecs } from './types'
import { generateDummyStream } from './utils/generate-dummy-stream'

export interface VoiceManager extends EventEmitter {
	on(event: 'track', listener: (event: MediaStreamTrack) => void): this
	on(event: 'sender', listener: (event: RTCRtpSender) => void): this
	on(event: 'connected', listener: () => void): this
	on(event: 'disconnected', listener: () => void): this
	once(event: 'track', listener: (event: MediaStreamTrack) => void): this
	once(event: 'sender', listener: (event: RTCRtpSender) => void): this
	once(event: 'connected', listener: () => void): this
	once(event: 'disconnected', listener: () => void): this
	emit(event: 'track', track: MediaStreamTrack): boolean
	emit(event: 'sender', sender: RTCRtpSender): boolean
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

	private audio_settings: AudioSettings
	private initial_speaking = false
	private debug = false

	constructor(params: {
		gateway_socket: GatewaySocket
		audio_track?: MediaStreamTrack
		audio_settings?: Partial<AudioSettings>
		debug?: boolean
	}) {
		super()

		const { gateway_socket, debug, audio_track, audio_settings } = params

		this.gateway = gateway_socket
		this.gateway.on('packet', (p) => this.handleGatewayPacket(p))

		this.track = audio_track
		this.audio_settings = {
			stereo: audio_settings?.stereo ?? false,
			bitrate_kbps: audio_settings?.bitrate_kbps ?? 64,
			mode: audio_settings?.mode ?? 'sendonly'
		}

		this.debug = debug ?? false
	}

	public connect(params: {
		guild_id: string
		channel_id: string
		audio_track?: MediaStreamTrack
		initial_speaking?: boolean
		self_mute?: boolean
		self_deaf?: boolean
		audio_settings?: AudioSettings
	}) {
		if (!this.gateway.ready) {
			throw new VoiceConnectionError('Gateway not ready.')
		}

		const {
			guild_id,
			channel_id,
			audio_track,
			audio_settings,
			initial_speaking,
			self_deaf,
			self_mute
		} = params

		this.guild_id = guild_id
		this.channel_id = channel_id
		this.self_mute = self_mute ?? this.self_mute
		this.self_deaf = self_deaf ?? this.self_deaf

		if (!this.track) {
			if (!audio_track) {
				console.warn('An audio track was not provided. Using dummy track.')
				const [audio_track] = generateDummyStream().getAudioTracks()
				this.track = audio_track
			} else {
				this.track = audio_track
			}
		}

		this.initial_speaking = initial_speaking ?? this.initial_speaking
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
				this.rtc.on('sender', (t) => this.emit('sender', t))

				const { select_protocol_sdp, codecs, ssrc } = await this.rtc.init({
					audio_track: this.track,
					audio_settings: this.audio_settings
				})

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
				this.voice.on('packet', (p) => this.handleVoicePacket(p, select_protocol_sdp, codecs))
				this.voice.on('close', () => {
					this.rtc?.destroy()
					this.emit('disconnected')
				})
			}
		}
	}

	private handleVoicePacket(packet: any, sdp: string, codecs: Codecs) {
		switch (packet.op) {
			case VoiceOpcodes.Ready: {
				this.voice!.sendSelectProtocol(sdp, codecs)
				break
			}

			case VoiceOpcodes.SessionDescription: {
				this.rtc!.setDiscordSDP(packet.d.sdp)
				this.setSpeaking(this.initial_speaking)
				this.emit('connected')
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
		if (!this.voice) {
			throw new VoiceSpeakingError('Voice socket not open.')
		}

		try {
			this.voice.sendPacket({
				op: VoiceOpcodes.Speaking,
				d: {
					speaking: speaking ? 1 : 0,
					delay: 0,
					ssrc: this.ssrc
				}
			})
		} catch {
			return
		}
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

		this.channel_id = null
		this.guild_id = null
	}
}
