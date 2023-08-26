import {
	ActivityType,
	GatewayIntentBits,
	PresenceUpdateStatus,
	type GatewayIdentifyProperties,
	type GatewayPresenceUpdateData
} from 'discord-api-types/v10'
import { GatewaySocket } from './gateway-socket'
import { VoiceManager, type ConnectionParams } from './voice-manager'
import EventEmitter from 'eventemitter3'

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

// export interface Client extends EventEmitter {
// 	on(event: 'ready', listener: () => void): this
// 	once(event: 'ready', listener: () => void): this
// 	emit(event: 'ready'): boolean
// }

class Client extends EventEmitter {
	private _gateway: GatewaySocket
	private _debug: boolean
	public onready: ((...args: any) => any) | null = null

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

	public connect(params: ConnectionParams) {
		const voice = new VoiceManager({
			gatewaySocket: this._gateway,
			debug: this._debug
		})

		voice.connect(params)

		return voice
	}
}

export { Client }
export default Client
