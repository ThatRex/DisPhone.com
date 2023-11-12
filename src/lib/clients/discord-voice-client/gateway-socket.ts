import { Socket, SocketState } from './utils/socket'
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

const RECONNECTABLE_CLOSE_CODES = [
	1006, // abnormal closure
	GatewayCloseCodes.UnknownError,
	GatewayCloseCodes.UnknownOpcode,
	GatewayCloseCodes.DecodeError,
	GatewayCloseCodes.NotAuthenticated,
	GatewayCloseCodes.AlreadyAuthenticated,
	GatewayCloseCodes.InvalidSeq,
	GatewayCloseCodes.RateLimited,
	GatewayCloseCodes.SessionTimedOut
] as const

export interface GatewaySocket extends Socket {
	on(event: 'packet', listener: (event: any) => void): this
	on(event: 'error', listener: (event: Event) => void): this
	on(event: 'open', listener: (event: Event) => void): this
	on(event: 'resume', listener: (event: Event) => void): this
	on(event: 'close', listener: (event: CloseEvent) => void): this
	on(event: 'ready', listener: () => void): this
	on(event: 'done', listener: () => void): this
	once(event: 'packet', listener: (event: any) => void): this
	once(event: 'error', listener: (event: Event) => void): this
	once(event: 'open', listener: (event: Event) => void): this
	once(event: 'close', listener: (event: CloseEvent) => void): this
	once(event: 'ready', listener: () => void): this
	once(event: 'done', listener: () => void): this
	emit(event: 'packet'): boolean
	emit(event: 'error'): boolean
	emit(event: 'open'): boolean
	emit(event: 'close'): boolean
	emit(event: 'ready'): boolean
	emit(event: 'done'): boolean
}

export class GatewaySocket extends Socket {
	private hartbeat_interval?: number
	private last_sequence_number: number | null = null
	private missed_heartbeats = 0
	private resume_attempts = 0
	private indentified = false
	private resumed = false
	private _ready = false

	private connection_data: {
		token: string
		initial_gateway_url?: string
		resume_gateway_url?: string
		max_resume_attempts: number
		session_id?: string
		intents: number
		properties: GatewayIdentifyProperties
	} = {
		token: '',
		max_resume_attempts: 3,
		intents: 0,
		properties: {
			os: 'linux',
			browser: '',
			device: ''
		}
	}

	private inital_presence: GatewayPresenceUpdateData = {
		since: 0,
		activities: [],
		status: PresenceUpdateStatus.Online,
		afk: false
	}

	private _identity: {
		id?: string
		username?: string
		discriminator?: string
	} = {}

	public get session_id() {
		return this.connection_data.session_id
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
		max_resume_attempts?: number
		debug?: boolean
	}) {
		const { address, token, intents, properties, presence, max_resume_attempts, debug } = params

		super({
			address: `wss://${address}/?v=10&encoding=json`,
			name: 'Gateway Socket',
			debug
		})

		this.connection_data.token = token
		this.connection_data.intents = intents
		if (max_resume_attempts) this.connection_data.max_resume_attempts = max_resume_attempts
		if (properties) this.connection_data.properties = properties
		if (presence) this.inital_presence = presence

		this.on('packet', (p) => this.onPacket(p))
		this.on('error', () => this.doResume())

		this.on('close', (e) => {
			if (!e.code || RECONNECTABLE_CLOSE_CODES.includes(e.code)) this.doResume()
			else this.destroy()
		})

		this.on('resume', () => {
			this.sendPacket({
				op: GatewayOpcodes.Resume,
				d: {
					token: this.connection_data.token,
					seq: this.last_sequence_number!,
					session_id: this.connection_data.session_id!
				}
			} satisfies GatewayResume)
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
				this.missed_heartbeats = 0
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
		this.last_sequence_number = packet.s
		switch (packet.t) {
			case GatewayDispatchEvents.Ready: {
				const {
					resume_gateway_url,
					session_id,
					user: { id, username, discriminator }
				} = packet.d

				this.connection_data.resume_gateway_url = resume_gateway_url
				this.connection_data.session_id = session_id
				this._identity = { id, username, discriminator }

				this.indentified = true
				this._ready = true
				this.emit('ready')
				break
			}
			case GatewayDispatchEvents.Resumed: {
				this.resume_attempts = 0
				this.resumed = true
				this._ready = true
			}
		}
	}

	private sendHeartbeat() {
		this.missed_heartbeats++
		this.sendPacket({
			op: GatewayOpcodes.Heartbeat,
			d: this.last_sequence_number
		} satisfies GatewayHeartbeat)
	}

	private startHartbeat(interval: number) {
		this.debug?.('Starting Heartbeat')
		this.missed_heartbeats = 0
		interval = interval * Math.random()
		this.hartbeat_interval = setInterval(() => {
			if (this.missed_heartbeats > 2) {
				this.debug?.('Too many missed heartbeats. Attempting to resume.')
				this.doResume()
				return
			}
			this.sendHeartbeat()
		}, interval)
	}

	private sendIdentification() {
		this.debug?.('Sending Identification')

		this.sendPacket({
			op: GatewayOpcodes.Identify,
			d: {
				token: this.connection_data.token,
				intents: this.connection_data.intents,
				properties: this.connection_data.properties
			}
		} satisfies GatewayIdentify)

		this.sendPacket({
			op: GatewayOpcodes.PresenceUpdate,
			d: this.inital_presence
		})
	}

	private async doResume() {
		this.debug?.('Resuming')

		const { max_resume_attempts, resume_gateway_url, session_id } = this.connection_data

		if (this.resume_attempts === max_resume_attempts) {
			this.debug?.(`Max resume attempts (${max_resume_attempts}) reached. Destroying.`)
			this.destroy()
			return
		}

		if (!this.last_sequence_number || !resume_gateway_url || !session_id) {
			this.debug?.('Lacking necessary data to resume. Destroying.')
			this.destroy()
			return
		}

		this._ready = false
		this.resume_attempts++

		clearInterval(this.hartbeat_interval)
		await this.closeSocket({ resume_url: `${resume_gateway_url}/?v=10&encoding=json` })

		this.resumed = false
		setTimeout(() => {
			if (!this.resumed) {
				this.debug?.('Failed to resume. Destroying.')
				this.destroy()
			}
		}, 2500)
	}

	public destroy(clean?: boolean) {
		this.emit('done')
		this._ready = false
		clearInterval(this.hartbeat_interval)
		if (this.state === SocketState.OPEN) this.closeSocket({ code: clean ? 1_000 : undefined })
	}
}
