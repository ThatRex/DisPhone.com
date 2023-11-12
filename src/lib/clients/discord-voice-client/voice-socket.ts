import { Socket, SocketState } from './utils/socket'
import type { Codecs } from './types'
import { VoiceOpcodes } from 'discord-api-types/voice'

export class VoiceSocket extends Socket {
	private hartbeat_interval?: number
	private missed_heartbeats = 0
	private indentified = false
	private resumed = false
	private resume_attempts = 0

	private connection_data: {
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

		this.connection_data = { guild_id, session_id, token, user_id, address }

		this.on('packet', (p) => this.onPacket(p))
		this.on('close', () => this.destroy())
		this.on('error', () => this.doResume())

		this.on('resume', () => {
			const { guild_id: server_id, session_id, token } = this.connection_data

			this.sendPacket({
				op: VoiceOpcodes.Resume,
				d: {
					server_id,
					session_id,
					token
				}
			})

			return
		})
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
		this.hartbeat_interval = setInterval(() => {
			if (this.missed_heartbeats > 2) {
				this.debug?.('Too many missed heartbeats. Attempting to resume.')
				this.doResume()
				return
			}
			this.sendHeartbeat()
		}, interval)
	}

	public doResume() {
		this.debug?.('Resuming')

		if (this.resume_attempts === 3) {
			this.debug?.(`Max resume attempts (3) reached. Destroying.`)
			this.destroy()
			return
		}

		clearInterval(this.hartbeat_interval)
		this.closeSocket({ resume_url: `wss://${this.connection_data.address}/?v=7` })

		this.resumed = false
		setTimeout(() => {
			if (!this.resumed) {
				this.debug?.('Failed to resume. Destroying.')
				this.destroy()
			}
		}, 2500)
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

	public destroy(clean?: boolean) {
		clearInterval(this.hartbeat_interval)
		if (this.state === SocketState.OPEN) this.closeSocket({ code: clean ? 1_000 : undefined })
	}
}
