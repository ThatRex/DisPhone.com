import EventEmitter from 'eventemitter3'
import {
	ActivityType,
	GatewayIntentBits,
	PresenceUpdateStatus,
	type GatewayIdentifyProperties,
	type GatewayPresenceUpdateData,
	GatewayOpcodes
} from 'discord-api-types/v10'
import { GatewaySocket } from './gateway-socket'
import { VoiceManager } from './voice-manager'
import type { AudioSettings } from './types'

function getBrowserName() {
	for (const [matcher, name] of [
		['Firefox', 'Firefox'],
		['Edg', 'Edge'],
		['Chrome', 'Chrome']
	]) {
		if (navigator.userAgent.includes(matcher)) return name
	}
	return 'A Browser'
}

export interface Client extends EventEmitter {
	on(event: 'ready', listener: () => void): this
	on(event: 'done', listener: () => void): this
	once(event: 'ready', listener: () => void): this
	once(event: 'done', listener: () => void): this
	emit(event: 'ready'): boolean
	emit(event: 'done'): boolean
}

export class Client extends EventEmitter {
	private _gateway: GatewaySocket
	private _voice?: VoiceManager
	private _debug: boolean

	public get gateway() {
		return this._gateway
	}

	constructor(params: {
		token: string
		intents?: number
		properties?: GatewayIdentifyProperties
		presence?: GatewayPresenceUpdateData
		debug?: boolean
	}) {
		super()

		this._debug = params.debug ?? false
		this._gateway = new GatewaySocket({
			address: 'gateway.discord.gg',
			token: params.token,
			intents: params.intents ?? GatewayIntentBits.GuildVoiceStates,
			debug: this._debug,
			presence: params.presence ?? {
				since: null,
				afk: false,
				status: PresenceUpdateStatus.Online,
				activities: [
					{
						name: `from ${getBrowserName()}`,
						type: ActivityType.Streaming,
						url: 'https://www.youtube.com/watch?v=0'
					}
				]
			}
		})

		this._gateway.on('ready', () => this.emit('ready'))
	}

	public setPresence(params: GatewayPresenceUpdateData) {
		this._gateway.sendPacket({
			op: GatewayOpcodes.PresenceUpdate,
			d: params
		})
	}

	public connect(params: {
		guild_id: string
		channel_id: string
		audio_track: MediaStreamTrack
		initial_speaking?: boolean
		self_mute?: boolean
		self_deaf?: boolean
		audio_settings?: Partial<AudioSettings>
	}) {
		const { audio_track, audio_settings, ...rest_settings } = params

		this._voice = new VoiceManager({
			gateway_socket: this._gateway,
			debug: this._debug,
			audio_track,
			audio_settings
		})

		this._voice.connect(rest_settings)

		return this._voice
	}

	public shutdown() {
		this._voice?.disconnect()
		this._gateway.destroy(true)
		this.emit('done')
	}
}
