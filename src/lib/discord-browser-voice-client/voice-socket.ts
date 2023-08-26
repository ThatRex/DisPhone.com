import { Socket, SocketState } from './socket'
import { VoiceOpcodes } from 'discord-api-types/voice'

export type Codecs = {
	name: string
	type: string
	priority: number
	payload_type: number
	rtx_payload_type: number | null
}[]

export class VoiceSocket extends Socket {
	private hartbeatInterval?: number
	private missedHeartbeats = 0
	private indentified = false
	private resumed = false

	private connectionData: {
		guild_id: string
		user_id: string
		session_id: string
		token: string
		address: string
	}

	constructor(params: {
		address: string
		guild_id: string
		user_id: string
		session_id: string
		token: string
		debug?: boolean
	}) {
		const { guild_id, session_id, token, user_id, address } = params

		super({
			address: `wss://${address}/?v=7`,
			name: 'Voice Socket',
			debug: params.debug
		})

		this.connectionData = { guild_id, session_id, token, user_id, address }

		this.on('packet', (p) => this.onPacket(p))
		this.on('close', () => this.destroy())
	}

	private onPacket(packet: any) {
		switch (packet.op) {
			case VoiceOpcodes.Hello: {
				this.startHartbeat(packet.d.heartbeat_interval)
				if (!this.indentified) this.sendIdentification()
				break
			}

			case VoiceOpcodes.Resumed: {
				this.resumed = true
				break
			}

			case VoiceOpcodes.HeartbeatAck: {
				this.missedHeartbeats = 0
				break
			}
		}
	}

	private sendHeartbeat() {
		this.missedHeartbeats++
		this.sendPacket({
			op: VoiceOpcodes.Heartbeat,
			d: Math.floor(Math.random() * 100_000_000_000)
		})
	}

	private startHartbeat(interval: number) {
		this.debug?.('Starting Heartbeat')
		this.hartbeatInterval = setInterval(() => {
			if (this.missedHeartbeats > 2) {
				this.debug?.('Too many missed heartbeats.')
				this.destroy()
				return
			}
			this.sendHeartbeat()
		}, interval)
	}

	public sendResume() {
		this.debug?.('Resuming')
		const { guild_id: server_id, session_id, token, address } = this.connectionData

		this.closeSocket()
		this.openSocket(`wss://${address}/?v=7`)

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
				this.debug?.('Failed to resume.')
				this.destroy()
			}
		}, 250)
	}

	private sendIdentification() {
		this.debug?.('Sending Identification')
		const { guild_id: server_id, session_id, token, user_id } = this.connectionData
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

	public destroy(clean?: boolean) {
		if (this.hartbeatInterval) clearInterval(this.hartbeatInterval)
		if (this.state === SocketState.OPEN) this.closeSocket(clean ? 1_000 : undefined)
	}
}
