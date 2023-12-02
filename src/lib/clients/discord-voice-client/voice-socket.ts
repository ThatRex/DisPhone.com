/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from 'eventemitter3'
import { type Codecs, SocketState } from './types'
import { VoiceCloseCodes, VoiceOpcodes } from 'discord-api-types/voice'
import { GatewayCloseCodes } from 'discord-api-types/v10'
import { wait } from '$lib/clients/utils/wait'
import { VocieSocketError, VocieSocketNotReadyError } from './errors'

const RECONNECTABLE_CLOSE_CODES = [
	1005, // No Status Rcvd
	1006, // Abnormal Closure
	GatewayCloseCodes.UnknownError,
	VoiceCloseCodes.UnknownOpcode,
	VoiceCloseCodes.FailedToDecode,
	VoiceCloseCodes.NotAuthenticated,
	VoiceCloseCodes.AlreadyAuthenticated,
	VoiceCloseCodes.SessionTimeout,
	VoiceCloseCodes.VoiceServerCrashed
] as const

export interface VoiceSocket extends EventEmitter {
	on(event: 'packet', listener: (packet: any) => void): this
	on(event: 'state', listener: (state: SocketState) => void): this
	emit(event: 'packet', packet: any): boolean
	emit(event: 'state', state: SocketState): boolean
}

export class VoiceSocket extends EventEmitter {
	private ws!: WebSocket

	private hartbeat_interval?: number
	private missed_heartbeats = 0

	private indentified = false

	private resumed = false
	private resume_attempts = 0

	private _state: SocketState = SocketState.INITIAL

	public get state() {
		return this._state
	}

	private connection_data: {
		guild_id: string
		user_id: string
		session_id: string
		token: string
		address: string
	}

	private readonly debug?: (...args: any) => void

	constructor(params: {
		address: string
		guild_id: string
		user_id: string
		session_id: string
		token: string
		debug?: boolean
	}) {
		super()

		this.debug = !params.debug ? undefined : (...args) => console.debug(`[Voice Socket]`, ...args)

		this.connection_data = {
			guild_id: params.guild_id,
			session_id: params.session_id,
			token: params.token,
			user_id: params.user_id,
			address: params.address
		}

		this.on('packet', (p) => this.onPacket(p))
		this.on('state', (s) => {
			this._state = s
			this.debug?.(`State Update: ${s}`)
		})

		this.emit('state', SocketState.INITIALISING)
		this.openSocket(`wss://${params.address}/?v=7`)
	}

	private openSocket(address: string) {
		if (
			this.ws &&
			(this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
		) {
			throw new VocieSocketError('Socket is already open or connecting.')
		}

		this.debug?.('Opening. Address:', address)

		this.ws = new WebSocket(address)
		this.ws.onmessage = (e) => this.onMessage(e)
		this.ws.onopen = () => {
			if (this.state !== SocketState.RESUMING) return

			const { guild_id: server_id, session_id, token } = this.connection_data

			this.sendPacket({
				op: VoiceOpcodes.Resume,
				d: {
					server_id,
					session_id,
					token
				}
			})

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
				this.openSocket(`wss://${this.connection_data.address}/?v=7`)
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
			throw new VocieSocketNotReadyError(`Unable to send packet. Packet: ${JSON.stringify(packet)}`)
		}

		try {
			this.debug?.('Sending Packet:', packet)
			this.ws.send(JSON.stringify(packet))
		} catch (err) {
			this.debug?.('Error Sending Packet:', err)
		}
	}

	private onPacket(packet: any) {
		switch (packet.op) {
			case VoiceOpcodes.Hello: {
				this.startHartbeat(packet.d.heartbeat_interval)
				if (!this.indentified) this.sendIdentification()
				break
			}

			case VoiceOpcodes.Ready: {
				this._state = SocketState.READY
				this.emit('state', SocketState.READY)
				break
			}

			case VoiceOpcodes.Resumed: {
				this.resume_attempts = 0
				this.resumed = true
				break
			}

			case VoiceOpcodes.HeartbeatAck: {
				this.missed_heartbeats = 0
				break
			}
		}
	}

	private sendHeartbeat() {
		this.missed_heartbeats++
		this.sendPacket({
			op: VoiceOpcodes.Heartbeat,
			d: Math.floor(Math.random() * 100_000_000_000)
		})
	}

	private startHartbeat(interval: number) {
		this.debug?.('Starting Heartbeat')
		clearInterval(this.hartbeat_interval)
		this.hartbeat_interval = setInterval(() => {
			if (this.missed_heartbeats > 2) {
				if (this.state === SocketState.READY) this.doResume('Too many missed heartbeats.')
				return
			}
			this.sendHeartbeat()
		}, interval)
	}

	private async doResume(reason: string) {
		this.debug?.('Maybe Resuming. Reason:', reason)

		if (this.resume_attempts === 3) {
			this.debug?.(`Max resume attempts (3) reached. Destroying.`)
			this.destroy()
			return
		}

		this.resume_attempts++
		if (this.state !== SocketState.RESUMING) {
			this.emit('state', SocketState.RESUMING)
		} else {
			await wait(1000 * this.resume_attempts)
			if (this.state !== SocketState.RESUMING) return
		}

		this.debug?.('Resuming')

		if (this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
			this.openSocket(`wss://${this.connection_data.address}/?v=7`)
		} else this.ws.close()
	}

	private sendIdentification() {
		this.debug?.('Sending Identification')
		const { guild_id: server_id, session_id, token, user_id } = this.connection_data
		this.sendPacket({
			op: VoiceOpcodes.Identify,
			d: {
				server_id,
				user_id,
				session_id,
				token,
				video: false
			}
		})
		this.indentified = true
	}

	public sendSelectProtocol(sdp: string, codecs: Codecs) {
		this.debug?.('Selecting Protocol')
		this.sendPacket({
			op: VoiceOpcodes.SelectProtocol,
			d: {
				protocol: 'webrtc',
				data: sdp,
				sdp: sdp,
				codecs
			}
		})
	}

	public destroy(failed?: boolean) {
		if (['DONE', 'FAILED'].includes(this.state)) return
		this._state = failed ? SocketState.FAILED : SocketState.DONE
		this.emit('state', this.state)
		this.debug?.('Destroying. Reason:', this.state)
		this.ws.close(1_000)
	}
}
