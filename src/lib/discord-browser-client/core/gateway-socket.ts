import { BaseWebSocket, SocketState } from '../utils/base-web-socket'
import type {
	GatewayHeartbeat,
	GatewayIdentify,
	GatewayReceivePayload,
	GatewayResume
} from 'discord-api-types/gateway'
import { GatewayOpcodes } from 'discord-api-types/gateway'
import {
	PresenceUpdateStatus,
	type GatewayDispatchPayload,
	GatewayDispatchEvents,
	GatewayCloseCodes,
	type GatewayIdentifyProperties,
	type GatewayPresenceUpdateData
} from 'discord-api-types/v10'
import { GatewayResumeError } from '../utils/errors'

const RECONNECTABLE_CLOSE_CODES = [
	GatewayCloseCodes.UnknownError,
	GatewayCloseCodes.UnknownOpcode,
	GatewayCloseCodes.DecodeError,
	GatewayCloseCodes.NotAuthenticated,
	GatewayCloseCodes.AlreadyAuthenticated,
	GatewayCloseCodes.InvalidSeq,
	GatewayCloseCodes.RateLimited,
	GatewayCloseCodes.SessionTimedOut
]

export interface GatewaySocket extends BaseWebSocket {
	on(event: 'packet', listener: (event: any) => void): this
	on(event: 'error', listener: (event: Event) => void): this
	on(event: 'open', listener: (event: Event) => void): this
	on(event: 'close', listener: (event: CloseEvent) => void): this
	on(event: 'ready', listener: () => void): this
}

export class GatewaySocket extends BaseWebSocket {
	private hartbeatInterval?: number
	private lastSequenceNumber: number | null = null
	private missedHeartbeats = 0
	private indentified = false

	private connectionData: {
		token: string
		initial_gateway_url?: string
		resume_gateway_url?: string
		session_id?: string
		intents: number
		properties: GatewayIdentifyProperties
	} = {
		token: '',
		intents: 0,
		properties: {
			os: 'linux',
			browser: 'dbc',
			device: 'dbc'
		}
	}

	private initalPresence: GatewayPresenceUpdateData = {
		since: Date.now(),
		activities: [],
		status: PresenceUpdateStatus.Online,
		afk: false
	}

	private _identity: {
		id?: string
		username?: string
		discriminator?: string
	} = {}

	private _ready = false

	public get session_id() {
		return this.connectionData.session_id
	}

	public get identity() {
		return this._identity
	}

	public get ready() {
		return this._ready
	}

	constructor(params: {
		address: string
		token: string
		intents: number
		properties?: GatewayIdentifyProperties
		presence?: GatewayPresenceUpdateData
		debug?: boolean
	}) {
		const { address, token, intents, properties, presence, debug } = params

		super({
			address: `wss://${address}/?v=10&encoding=json`,
			name: 'Gateway Socket',
			debug
		})

		this.connectionData.token = token
		this.connectionData.intents = intents
		if (properties) this.connectionData.properties = properties
		if (presence) this.initalPresence = presence

		this.on('packet', (p) => this.onPacket(p))
		this.on('close', (e) => {
			if (RECONNECTABLE_CLOSE_CODES.includes(e.code)) this.doResume()
			else this.destroy()
		})
	}

	private onPacket(packet: GatewayReceivePayload) {
		switch (packet.op) {
			case GatewayOpcodes.Heartbeat: {
				this.sendHeartbeat()
				break
			}

			case GatewayOpcodes.Hello: {
				this.startHartbeat(packet.d.heartbeat_interval)
				if (!this.indentified) this.sendIdentification()
				break
			}

			case GatewayOpcodes.HeartbeatAck: {
				this.missedHeartbeats = 0
				break
			}

			case GatewayOpcodes.InvalidSession: {
				if (packet.d === true) this.doResume()
				else this.destroy()
				break
			}
			case GatewayOpcodes.Reconnect: {
				this.doResume()
				break
			}

			case GatewayOpcodes.Dispatch: {
				this.onDispatch(packet)
				break
			}
		}
	}

	private onDispatch(packet: GatewayDispatchPayload) {
		this.lastSequenceNumber = packet.s

		switch (packet.t) {
			case GatewayDispatchEvents.Ready: {
				const {
					resume_gateway_url,
					session_id,
					user: { id, username, discriminator }
				} = packet.d

				this.connectionData.resume_gateway_url = resume_gateway_url
				this.connectionData.session_id = session_id
				this._identity = { id, username, discriminator }

				this.indentified = true
				this._ready = true
				this.emit('ready')
				break
			}
		}
	}

	private sendHeartbeat() {
		this.missedHeartbeats++
		this.sendPacket({
			op: GatewayOpcodes.Heartbeat,
			d: this.lastSequenceNumber
		} satisfies GatewayHeartbeat)
	}

	private startHartbeat(interval: number) {
		this.debug?.('Starting Heartbeat')
		interval = interval * Math.random()
		this.hartbeatInterval = setInterval(() => {
			if (this.missedHeartbeats > 1) {
				this.debug?.('Too many missed heartbeats.')
				return this.destroy()
			}
			this.sendHeartbeat()
		}, interval)
	}

	private sendIdentification() {
		this.debug?.('Sending Identification')

		this.sendPacket({
			op: GatewayOpcodes.Identify,
			d: {
				token: this.connectionData.token,
				intents: this.connectionData.intents,
				properties: this.connectionData.properties,
				presence: this.initalPresence
			}
		} satisfies GatewayIdentify)
	}

	private doResume() {
		this.debug?.('Resuming')

		this.destroy()

		const { resume_gateway_url, session_id } = this.connectionData

		if (!this.lastSequenceNumber || !resume_gateway_url || !session_id) {
			throw new GatewayResumeError('Lacking necessary data.')
		}

		this.closeSocket()
		this.openSocket(`wss://${resume_gateway_url}/?v=10&encoding=json`)

		this.sendPacket({
			op: GatewayOpcodes.Resume,
			d: {
				token: this.connectionData.token,
				seq: this.lastSequenceNumber,
				session_id
			}
		} satisfies GatewayResume)
	}

	public destroy(clean?: boolean) {
		this._ready = false
		if (this.hartbeatInterval) clearInterval(this.hartbeatInterval)
		if (this.state === SocketState.OPEN) this.closeSocket(clean ? 1_000 : undefined)
	}
}
