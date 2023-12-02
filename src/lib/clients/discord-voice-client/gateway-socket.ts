/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from 'eventemitter3'
import { SocketState } from './types'
import { GatewaySocketError, GatewaySocketInitError, GatewaySocketNotReadyError } from './errors'
import {
	type GatewayHeartbeat,
	type GatewayIdentify,
	type GatewayReceivePayload,
	type GatewayResume,
	GatewayOpcodes
} from 'discord-api-types/gateway'
import {
	type GatewayDispatchPayload,
	type GatewayIdentifyProperties,
	type GatewayPresenceUpdateData,
	PresenceUpdateStatus,
	GatewayDispatchEvents,
	GatewayCloseCodes
} from 'discord-api-types/v10'
import { wait } from '$lib/clients/utils'

const RECONNECTABLE_CLOSE_CODES = [
	1005, // No Status Rcvd
	1006, // Abnormal Closure
	GatewayCloseCodes.UnknownError,
	GatewayCloseCodes.UnknownOpcode,
	GatewayCloseCodes.DecodeError,
	GatewayCloseCodes.NotAuthenticated,
	GatewayCloseCodes.AlreadyAuthenticated,
	GatewayCloseCodes.InvalidSeq,
	GatewayCloseCodes.RateLimited,
	GatewayCloseCodes.SessionTimedOut
] as const

export interface GatewaySocket extends EventEmitter {
	on(event: 'packet', listener: (packet: any) => void): this
	on(event: 'state', listener: (state: SocketState) => void): this
	emit(event: 'packet', packet: any): boolean
	emit(event: 'state', state: SocketState): boolean
}

export class GatewaySocket extends EventEmitter {
	private ws!: WebSocket

	private hartbeat_interval?: number
	private missed_heartbeats = 0
	private last_sequence_number: number | null = null

	private indentified = false

	private resumed = false
	private resume_attempts = 0

	private _state: SocketState = SocketState.INITIAL

	public get state() {
		return this._state
	}

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

	private readonly debug?: (...args: any) => void

	constructor(params: {
		token: string
		intents: number
		properties?: GatewayIdentifyProperties
		presence?: GatewayPresenceUpdateData
		max_resume_attempts?: number
		debug?: boolean
	}) {
		super()
		const { token, intents, properties, presence, max_resume_attempts, debug } = params

		this.debug = !debug ? undefined : (...args) => console.debug('[Gateway Socket]', ...args)

		this.connection_data.token = token
		this.connection_data.intents = intents
		if (max_resume_attempts) this.connection_data.max_resume_attempts = max_resume_attempts
		if (properties) this.connection_data.properties = properties
		if (presence) this.inital_presence = presence

		this.on('packet', (p) => this.onPacket(p))
		this.on('state', (s) => {
			this._state = s
			this.debug?.(`State Update: ${s}`)
		})
	}

	public init() {
		if (['INITIALISING', 'READY', 'RESUMING'].includes(this.state)) {
			throw new GatewaySocketInitError('Socket State is either INITIALISING, READY or RESUMING.')
		}

		this.emit('state', SocketState.INITIALISING)
		this.openSocket(`wss://gateway.discord.gg/?v=10&encoding=json`)
	}

	private openSocket(address: string) {
		if (
			this.ws &&
			(this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
		) {
			throw new GatewaySocketError('Socket is already open or connecting.')
		}

		this.debug?.('Opening. Address:', address)

		this.ws = new WebSocket(address)
		this.ws.onmessage = (e) => this.onMessage(e)
		this.ws.onopen = () => {
			if (this.state !== SocketState.RESUMING) return

			this.sendPacket({
				op: GatewayOpcodes.Resume,
				d: {
					token: this.connection_data.token,
					seq: this.last_sequence_number!,
					session_id: this.connection_data.session_id!
				}
			} satisfies GatewayResume)

			this.resumed = false
			setTimeout(() => {
				if (!this.resumed) {
					this.debug?.('Failed to resume. Destroying.')
					this.destroy(true)
				}
			}, 2500)
		}

		this.ws.onclose = (e) => {
			clearInterval(this.hartbeat_interval)
			if (['DONE', 'FAILED'].includes(this.state)) return

			if (this.state === SocketState.RESUMING) {
				this.openSocket(`${this.connection_data.resume_gateway_url}/?v=10&encoding=json`)
				return
			}

			if (RECONNECTABLE_CLOSE_CODES.includes(e.code)) {
				this.doResume('Socket was closed with a reconnectable close code.')
				return
			}

			this.destroy()
		}
	}

	private onMessage(e: MessageEvent<any>) {
		try {
			const packet = JSON.parse(e.data)
			this.debug?.('Received Packet:', packet)
			this.emit('packet', packet)
		} catch (err) {
			this.debug?.('Error Parsing Packet:', err)
		}
	}

	public sendPacket(packet: { op: number; d: any; [key: string]: any }) {
		if (this.ws.readyState !== WebSocket.OPEN) {
			throw new GatewaySocketNotReadyError('Unable to send packet.')
		}

		try {
			this.debug?.('Sending Packet:', packet)
			this.ws.send(JSON.stringify(packet))
		} catch (err) {
			this.debug?.('Error Sending Packet:', err)
		}
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
				if (packet.d === true) this.doResume('Invalid Session Packet Received.')
				else this.destroy()
				break
			}

			case GatewayOpcodes.Reconnect: {
				this.doResume('Reconnect Packet Received')
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
				this.emit('state', SocketState.READY)
				break
			}
			case GatewayDispatchEvents.Resumed: {
				this.emit('state', SocketState.READY)
				this.resume_attempts = 0
				this.resumed = true
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
		clearInterval(this.hartbeat_interval)
		this.hartbeat_interval = setInterval(() => {
			if (this.missed_heartbeats > 2) {
				if (this.state !== SocketState.RESUMING) this.doResume('Too many missed heartbeats.')
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

	private async doResume(reason: string) {
		this.debug?.('Maybe Resuming. Reason:', reason)

		const { max_resume_attempts, resume_gateway_url, session_id } = this.connection_data

		if (this.resume_attempts === max_resume_attempts) {
			this.debug?.(`Max resume attempts (${max_resume_attempts}) reached.`)
			this.destroy(true)
			return
		}

		if (!this.last_sequence_number || !resume_gateway_url || !session_id) {
			this.debug?.('Lacking necessary data to resume.')
			this.destroy(true)
			return
		}

		this.resume_attempts++
		if (this.state !== SocketState.RESUMING) {
			this.emit('state', SocketState.RESUMING)
		} else {
			await wait(1000 * this.resume_attempts)
		}

		this.debug?.('Resuming')

		if (this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
			this.openSocket(`${resume_gateway_url}/?v=10&encoding=json`)
		} else this.ws.close()
	}

	public destroy(failed?: boolean) {
		if (['DONE', 'FAILED'].includes(this.state)) return
		this.emit('state', failed ? SocketState.FAILED : SocketState.DONE)
		this.debug?.('Destroying. Reason:', this.state)
		this.ws.close(1_000)
	}
}
