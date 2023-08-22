import EventEmitter from 'eventemitter3'

export interface BaseWebSocket extends EventEmitter {
	on(event: 'packet', listener: (event: any) => void): this
	on(event: 'error', listener: (event: MessageEvent<any>) => void): this
	on(event: 'open', listener: (event: MessageEvent<any>) => void): this
	on(event: 'close', listener: (event: MessageEvent<any>) => void): this
}

export enum SocketState {
	CLOSED,
	OPEN
}

export class BaseWebSocket extends EventEmitter {
	private ws?: WebSocket
	private _wsState = SocketState.CLOSED

	private readonly name: string
	public readonly debug: ((...args: any) => void) | null

	public get wsState() {
		return this._wsState
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
		if (this._wsState === SocketState.CLOSED) {
			this.emit('error', 'Unable to send packet because socket is not open.')
			return
		}
		try {
			this.debug?.('Sending Packet:', packet)
			this.ws?.send(JSON.stringify(packet))
		} catch (err) {
			this.emit('error', err)
		}
	}

	public openSocket(address: string) {
		if (this._wsState === SocketState.OPEN) {
			this.emit('error', 'Unable to open socket because socket is not closed.')
			return
		}
		this.debug?.('Opening')
		this.ws = new WebSocket(address)
		this.ws.onmessage = (e) => this.onMessage(e)
		this.ws.onerror = (e) => this.emit('error', e)
		this.ws.onopen = (e) => {
			this._wsState = SocketState.OPEN
			this.emit('open', e)
		}
		this.ws.onclose = (e) => {
			this._wsState = SocketState.CLOSED
			this.emit('close', e)
		}
	}

	public closeSocket(code?: number, reason?: string) {
		if (this._wsState === SocketState.CLOSED) {
			this.emit('error', 'Unable to close socket because socket is not open.')
			return
		}
		this.debug?.('Closing')
		this.ws?.close(code, reason)
	}
}
