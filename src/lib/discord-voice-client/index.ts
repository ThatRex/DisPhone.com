/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import EventEmitter from 'eventemitter3'
import {
	GatewayIntentBits,
	type GatewayIdentifyProperties,
	type GatewayPresenceUpdateData,
	GatewayOpcodes
} from 'discord-api-types/v10'
import { GatewaySocket } from './gateway-socket'
import { VoiceManager } from './voice-manager'
import type { AudioSettings, SocketState } from './types'

interface Client extends EventEmitter {
	on(event: '', listener: () => void): this
	on(event: 'state', listener: (state: SocketState) => void): this
	emit(event: ''): boolean
	emit(event: 'state', state: SocketState): boolean
}

class Client extends EventEmitter {
	private _gateway: GatewaySocket
	private _voice?: VoiceManager
	private _debug: boolean

	public get gateway() {
		return this._gateway
	}

	public get state() {
		return this.gateway.state
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
			token: params.token,
			intents: params.intents ?? GatewayIntentBits.GuildVoiceStates,
			presence: params.presence,
			properties: params.properties,
			debug: this._debug
		})

		this._gateway.on('state', (s) => this.emit('state', s))
	}

	public start() {
		this.gateway.init()
	}

	public setPresence(params: GatewayPresenceUpdateData) {
		this._gateway.sendPacket({
			op: GatewayOpcodes.PresenceUpdate,
			d: params
		})
	}

	public createVoiceManager(params: { audio_settings?: Partial<AudioSettings> }) {
		return new VoiceManager({
			gateway_socket: this._gateway,
			debug: this._debug,
			audio_settings: params.audio_settings
		})
	}

	public shutdown() {
		this._voice?.disconnect()
		this._gateway.destroy()
	}
}

export { Client }
export default Client
