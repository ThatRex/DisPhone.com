import { BaseWebSocket } from './base-web-socket'
import { VoiceOpcodes } from 'discord-api-types/voice'

export class VoiceWebSocket extends BaseWebSocket {
	private hartbeatInterval?: number
	private indentified = false

	private connectionData: {
		guild_id: string
		user_id: string
		session_id: string
		token: string
	}

	constructor(params: {
		address: string
		guild_id: string
		user_id: string
		session_id: string
		token: string
		debug?: boolean
	}) {
		super({
			address: `wss://${params.address}/?v=7`,
			name: 'Voice Socket',
			debug: params.debug
		})

		const { guild_id, session_id, token, user_id } = params
		this.connectionData = { guild_id, session_id, token, user_id }

		this.on('packet', (p) => this.onPacket(p))
		this.on('close', () => this.destroy(false))
	}

	private onPacket(packet: any) {
		if (packet.op === VoiceOpcodes.Hello) {
			this.startHartbeat(packet.d.heartbeat_interval)
			if (!this.indentified) this.sendIdentification()
		}
	}

	private sendHeartbeat() {
		this.sendPacket({
			op: VoiceOpcodes.Heartbeat,
			d: Math.floor(Math.random() * 100_000_000_000)
		})
	}

	private startHartbeat(interval: number) {
		this.debug?.('Starting Heartbeat')
		this.hartbeatInterval = setInterval(() => this.sendHeartbeat(), interval)
	}

	private sendResume() {
		this.debug?.('Resuming')
		const { guild_id: server_id, session_id, token } = this.connectionData
		this.sendPacket({
			op: VoiceOpcodes.Resume,
			d: {
				server_id,
				session_id,
				token
			}
		})
	}

	private sendIdentification(video?: boolean) {
		this.debug?.('Sending Identification')
		const { guild_id: server_id, session_id, token, user_id } = this.connectionData
		this.sendPacket({
			op: VoiceOpcodes.Identify,
			d: {
				server_id,
				user_id,
				session_id,
				token,
				video: video ?? false
			}
		})
	}

	public sendSelectProtocol(
		sdp: string,
		codecs: {
			name: string
			type: string
			priority: number
			payload_type: number
			rtx_payload_type: number | null
		}[]
	) {
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

	public destroy(clean: boolean) {
		if (this.hartbeatInterval) clearInterval(this.hartbeatInterval)
		this.closeSocket(clean ? 1_000 : undefined)
	}
}
