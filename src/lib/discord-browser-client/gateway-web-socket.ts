import { BaseWebSocket } from './base-web-socket'
import type {
	GatewayHeartbeat,
	GatewayIdentify,
	GatewayReceivePayload,
	GatewayResume
} from 'discord-api-types/gateway'
import { GatewayOpcodes } from 'discord-api-types/gateway'
import {
	PresenceUpdateStatus,
	GatewayIntentBits,
	type GatewayDispatchPayload,
	GatewayDispatchEvents
} from 'discord-api-types/v10'

export class GatewayWebSocket extends BaseWebSocket {
	private hartbeatInterval?: number
	private lastSequenceNumber: number | null = null
	private missedHeartbeats = 0
	private indentified = false

	private connectionData: {
		token: string
		initial_gateway_url?: string
		resume_gateway_url?: string
		session_id?: string
	} = { token: '' }

	private _identity: {
		id?: string
		username?: string
		discriminator?: string
	} = {}

	public get session_id() {
		return this.connectionData.session_id
	}

	public get identity() {
		return this._identity
	}

	constructor(params: { address: string; token: string; debug?: boolean }) {
		super({
			address: `wss://${params.address}/?v=10&encoding=json`,
			name: 'Gateway Socket',
			debug: params.debug
		})

		this.connectionData.token = params.token

		this.on('packet', (p) => this.onPacket(p))
		this.on('close', () => this.destroy(false))
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
				this.missedHeartbeats = 0
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
		this.lastSequenceNumber = packet.s

		switch (packet.t) {
			case GatewayDispatchEvents.Ready: {
				this.indentified = true

				const {
					resume_gateway_url,
					session_id,
					user: { id, username, discriminator }
				} = packet.d

				this.connectionData.resume_gateway_url = resume_gateway_url
				this.connectionData.session_id = session_id
				this._identity = { id, username, discriminator }

				break
			}
		}
	}

	private sendHeartbeat() {
		this.missedHeartbeats++
		this.sendPacket({
			op: GatewayOpcodes.Heartbeat,
			d: this.lastSequenceNumber
		} satisfies GatewayHeartbeat)
	}

	private startHartbeat(interval: number) {
		this.debug?.('Starting Heartbeat')
		interval = interval * Math.random()
		this.hartbeatInterval = setInterval(() => {
			if (this.missedHeartbeats > 1) return this.destroy(false)
			this.sendHeartbeat()
		}, interval)
	}

	private sendIdentification() {
		this.debug?.('Sending Identification')

		this.sendPacket({
			op: GatewayOpcodes.Identify,
			d: {
				token: this.connectionData.token,
				intents: GatewayIntentBits.GuildVoiceStates,
				properties: {
					os: 'linux',
					browser: 'bk',
					device: 'bk'
				},
				presence: {
					since: Date.now(),
					activities: [],
					status: PresenceUpdateStatus.Online,
					afk: false
				}
			}
		} satisfies GatewayIdentify)
	}

	private doResume() {
		this.debug?.('Resuming')

		this.destroy(false)

		const { resume_gateway_url, session_id } = this.connectionData

		if (!this.lastSequenceNumber || !resume_gateway_url || !session_id) {
			this.emit('error', 'Unable to resume; lacking necessary data.')
			return
		}

		this.closeSocket()
		this.openSocket(`wss://${resume_gateway_url}/?v=10&encoding=json`)

		this.sendPacket({
			op: GatewayOpcodes.Resume,
			d: {
				token: this.connectionData.token,
				seq: this.lastSequenceNumber,
				session_id: session_id
			}
		} satisfies GatewayResume)
	}

	public destroy(clean: boolean) {
		if (this.hartbeatInterval) clearInterval(this.hartbeatInterval)
		this.closeSocket(clean ? 1_000 : undefined)
	}
}
