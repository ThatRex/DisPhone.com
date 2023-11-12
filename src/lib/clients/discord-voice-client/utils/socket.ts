import EventEmitter from 'eventemitter3'
import { SocketClosedError, SocketOpenError } from '../errors'

export type SocketState = keyof typeof SocketState
export const SocketState = {
	CLOSED: 'CLOSED',
	OPEN: 'OPEN'
} as const

export interface Socket extends EventEmitter {
	on(event: 'packet', listener: (event: any) => void): this
	on(event: 'error', listener: (event: Event) => void): this
	on(event: 'open', listener: (event: Event) => void): this
	on(event: 'resume', listener: (event: Event) => void): this
	on(event: 'close', listener: (event: CloseEvent) => void): this
}

export class Socket extends EventEmitter {
	private ws?: WebSocket
	private resume_url?: string
	private _state: SocketState = SocketState.CLOSED

	private readonly name: string
	public readonly debug: ((...args: any) => void) | null

	public get state() {
		return this._state
	}

	constructor(params: { address: string; name: string; debug?: boolean }) {
		super()

		this.name = params.name
		this.debug = !params.debug ? null : (...args) => console.debug(`[${this.name}]`, ...args)
		this.openSocket(params.address)
	}

	private onMessage(e: MessageEvent<any>) {
		try {
			const packet = JSON.parse(e.data)
			this.debug?.('Received Packet:', packet)
			this.emit('packet', packet)
		} catch (err) {
			this.emit('error', err)
		}
	}

	public sendPacket(packet: { op: number; d: any; [key: string]: any }) {
		if (this._state === SocketState.CLOSED) {
			throw new SocketClosedError('Unable to send packet.')
		}
		try {
			this.debug?.('Sending Packet:', packet)
			this.ws?.send(JSON.stringify(packet))
		} catch (err) {
			this.emit('error', err)
		}
	}

	public async openSocket(address: string) {
		if (this._state === SocketState.OPEN) {
			throw new SocketOpenError('Socket is already open.')
		}
		this.debug?.('Opening')
		this.ws = new WebSocket(address)
		this.ws.onmessage = (e) => this.onMessage(e)
		this.ws.onerror = (e) => this.emit('error', e)
		this.ws.onopen = (e) => {
			this._state = SocketState.OPEN

			if (this.resume_url) {
				this.emit('resume', e)
				this.resume_url = undefined
				return
			}

			this.emit('open', e)
		}
		this.ws.onclose = (e) => {
			this._state = SocketState.CLOSED

			if (this.resume_url) {
				this.openSocket(this.resume_url)
				return
			}

			this.emit('close', e)
		}
	}

	public async closeSocket(params: { code?: number; reason?: string; resume_url?: string }) {
		if (this._state === SocketState.CLOSED) {
			throw new SocketClosedError('Socket is already closed.')
		}

		const { code, reason, resume_url } = params
		this.resume_url = resume_url

		this.debug?.('Closing')
		this.ws?.close(code, reason)
	}
}
