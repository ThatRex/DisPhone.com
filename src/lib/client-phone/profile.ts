/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from 'eventemitter3'
import { UserAgent, Registerer, Web, Invitation, RegistererState, type LogConnector } from 'sip.js'
import Call, { type OutboundCallDetail } from './call'
import { makeURI } from './utils'
import { generateDummyStream } from '../utils'
import type { SessionDescriptionHandlerConfiguration } from 'sip.js/lib/platform/web'

export type ProfileState = keyof typeof ProfileState
export const ProfileState = {
	INITIAL: 'INITIAL',
	CONNECTING: 'CONNECTING',
	CONNECTED: 'CONNECTED',
	REGISTERED: 'REGISTERED',
	RECONNECTING: 'RECONNECTING',
	DISCONNECTED: 'DISCONNECTED',
	FAILED: 'FAILED'
} as const

export type ProfileDetail = {
	state: ProfileState
	voicemail_qty: number
	voicemail_dest?: string
}

export interface Profile extends EventEmitter {
	on(event: 'detail', listener: (detail: ProfileDetail) => void): this
	on(event: 'call', listener: (call: Call) => void): this
	emit(event: 'detail', detail: ProfileDetail): boolean
	emit(event: 'call', call: Call): boolean
}

export class Profile extends EventEmitter {
	private readonly debug?: (...args: any) => void

	public readonly ac: AudioContext
	public readonly id: string
	public readonly ua: UserAgent

	public get server() {
		const { host, port } = this.ua.configuration.uri
		return port ? `${host}:${port}` : host
	}

	private readonly registerer: Registerer
	private register = false

	private readonly reconnection_attempts = 3
	private readonly reconnection_delay = 4
	private attempting_reconnection = false
	private should_be_connected = true

	private detail: ProfileDetail = {
		state: 'INITIAL',
		voicemail_dest: '',
		voicemail_qty: 0
	}

	constructor(params: {
		ac: AudioContext
		id: string
		username: string
		login?: string
		password?: string
		sip_server: string
		ws_server?: string
		stun_server?: string
		debug?: boolean
	}) {
		super()
		const { ac, id, username, login, password, sip_server, ws_server, stun_server, debug } = params

		this.debug = !debug ? undefined : (...args) => console.debug(`[Profile ${this.id}]`, ...args)

		this.on('detail', (d) => (this.detail = d))

		this.ac = ac
		this.id = id

		const uri = makeURI(username, sip_server)
		if (!uri) throw new Error('Error creating URI.')

		const sessionDescriptionHandlerFactory = Web.defaultSessionDescriptionHandlerFactory(
			this.mediaStreamFactory
		)

		const logConnector: LogConnector = (level, category, _, content) => {
			switch (level) {
				case 'debug':
				case 'log': {
					this.debug?.(`${category} - ${content}`)
					break
				}
				case 'warn': {
					console.error(`[Profile ${this.id}] ${category} - ${content}`)
					break
				}
				case 'error': {
					console.error(`[Profile ${this.id}] ${category} - ${content}`)
					break
				}
			}
		}

		const sessionDescriptionHandlerFactoryOptions: SessionDescriptionHandlerConfiguration = {
			iceGatheringTimeout: 500,
			peerConnectionConfiguration: {
				iceServers: stun_server ? [{ urls: `stun:${stun_server}` }] : undefined
			}
		}

		this.ua = new UserAgent({
			uri,
			authorizationUsername: login ?? username,
			authorizationPassword: password,
			transportOptions: {
				server: ws_server ? `wss://${ws_server}` : `wss://${sip_server}:8089/ws`
			},
			sessionDescriptionHandlerFactoryOptions,
			sessionDescriptionHandlerFactory,
			logBuiltinEnabled: false,
			logConnector
		})

		this.registerer = new Registerer(this.ua)

		this.registerer.stateChange.addListener((s) => {
			if (s === RegistererState.Registered) this.updateDetail({ state: 'REGISTERED' })
		})

		this.ua.delegate = {
			onInvite: async (invitation) => this.initCall({ type: 'INBOUND', invitation }),
			onConnect: async () => {
				if (this.register) await this.registerer.register()
				this.updateDetail({ state: 'CONNECTED' })
			},
			onDisconnect: async (error?: Error) => {
				if (this.register) await this.registerer.unregister()
				if (error) this.attemptReconnection()
				else this.updateDetail({ state: 'DISCONNECTED' })
			},
			onNotify: ({ request: { body } }) => {
				const regex_dest = /Message-Account: sip:(\S+)@/
				const regex_qty = /Voice-Message: (\d+)\//
				const dest = body.match(regex_dest)?.[1]
				const qty = body.match(regex_qty)?.[1]
				this.updateDetail({ voicemail_dest: dest, voicemail_qty: qty ? Number(qty) : 0 })
			}
		}

		window.addEventListener('online', () => this.attemptReconnection())
	}

	private updateDetail(detail: Partial<ProfileDetail>) {
		this.emit('detail', { ...this.detail, ...detail })
	}

	public async start(register = false) {
		this.register = register
		this.should_be_connected = true
		this.updateDetail({ state: 'CONNECTING' })
		await this.ua.start()
	}

	public async stop() {
		this.should_be_connected = false
		await this.ua.start()
		if (this.registerer.state === RegistererState.Registered) await this.registerer.unregister()
	}

	public async setRegister(value: boolean) {
		if (this.register === value) return
		if (value) await this.registerer.register()
		else await this.registerer.unregister()
		this.register = value
	}

	public initCall(
		params:
			| { type: 'INBOUND'; invitation: Invitation }
			| { type: 'OUTBOUND'; detail: OutboundCallDetail }
	) {
		this.debug?.('Initiating Call:', params)

		let call: Call

		switch (params.type) {
			case 'INBOUND': {
				call = new Call({
					profile: this,
					type: params.type,
					invitation: params.invitation,
					debug: !!this.debug
				})
				break
			}
			case 'OUTBOUND': {
				call = new Call({
					profile: this,
					type: params.type,
					detail: params.detail,
					debug: !!this.debug
				})
				break
			}
		}

		this.emit('call', call)
	}

	private mediaStreamFactory: Web.MediaStreamFactory = async (_, sessionDescriptionHandler) => {
		sessionDescriptionHandler.close = () => {
			const { peerConnection, dataChannel } = sessionDescriptionHandler

			if (peerConnection === undefined) return

			for (const receiver of peerConnection.getReceivers()) {
				receiver.track && receiver.track.stop()
			}

			dataChannel?.close()
			if (peerConnection.signalingState !== 'closed') peerConnection.close()
		}

		return Promise.resolve(generateDummyStream())
	}

	private attemptReconnection(reconnection_attempt = 1) {
		if (!this.should_be_connected) return
		if (this.attempting_reconnection) return
		if (reconnection_attempt > this.reconnection_attempts) {
			this.updateDetail({ state: 'FAILED' })
			return
		}

		this.attempting_reconnection = true
		this.updateDetail({ state: 'RECONNECTING' })

		const timeout = reconnection_attempt === 1 ? 0 : this.reconnection_delay * 1000

		setTimeout(async () => {
			if (!this.should_be_connected) {
				this.attempting_reconnection = false
				return
			}

			try {
				await this.ua.reconnect()
				this.attempting_reconnection = false
			} catch {
				this.attempting_reconnection = false
				this.attemptReconnection(++reconnection_attempt)
			}
		}, timeout)
	}
}
