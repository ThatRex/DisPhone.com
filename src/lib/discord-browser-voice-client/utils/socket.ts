import EventEmitter from 'eventemitter3'
import { SocketClosedError, SocketOpenError } from '../errors'

export enum SocketState {
	CLOSED,
	OPEN
}

export interface Socket extends EventEmitter {
	on(event: 'packet', listener: (event: any) => void): this
	on(event: 'error', listener: (event: Event) => void): this
	on(event: 'open', listener: (event: Event) => void): this
	on(event: 'close', listener: (event: CloseEvent) => void): this
}

export class Socket extends EventEmitter {
	private ws?: WebSocket
	private _state = SocketState.CLOSED

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

	public openSocket(address: string) {
		if (this._state === SocketState.OPEN) {
			throw new SocketOpenError('Socket is already open.')
		}
		this.debug?.('Opening')
		this.ws = new WebSocket(address)
		this.ws.onmessage = (e) => this.onMessage(e)
		this.ws.onerror = (e) => this.emit('error', e)
		this.ws.onopen = (e) => {
			this._state = SocketState.OPEN
			this.emit('open', e)
		}
		this.ws.onclose = (e) => {
			this._state = SocketState.CLOSED
			this.emit('close', e)
		}
	}

	public closeSocket(code?: number, reason?: string) {
		if (this._state === SocketState.CLOSED) {
			throw new SocketClosedError('Socket is already closed.')
		}
		this.debug?.('Closing')
		this.ws?.close(code, reason)
	}
}
