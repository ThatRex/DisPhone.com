/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import Client from '$lib/client-discord-browser'
import type { VoiceManager } from '$lib/client-discord-browser/voice-manager'
import {
	ActivityType,
	GatewayDispatchEvents,
	GatewayIntentBits,
	PresenceUpdateStatus,
	type GatewayPresenceUpdateData
} from 'discord-api-types/v10'
import EventEmitter from 'eventemitter3'

export type BotButtonClientState = keyof typeof BotButtonClientState
export const BotButtonClientState = {
	INITIAL: 'INITIAL',
	WAITING: 'WAITING',
	CONNECTING: 'CONNECTING',
	CONNECTED: 'CONNECTED',
	DONE: 'DONE',
	FAILED: 'FAILED'
} as const

export type VoiceBotButtonPresence = {
	status: PresenceUpdateStatus
	text?: string
}

interface BotButtonClient extends EventEmitter {
	on(event: 'state', listener: (state: BotButtonClientState) => void): this
	on(event: '', listener: () => void): this
	emit(event: 'state', state: BotButtonClientState): boolean
	emit(event: ''): boolean
}

class BotButtonClient extends EventEmitter {
	private readonly ac: AudioContext
	private readonly dst_i: MediaStreamAudioDestinationNode
	private readonly src_i: MediaStreamAudioSourceNode
	private readonly dst_o: MediaStreamAudioDestinationNode
	private readonly src_o: MediaStreamAudioSourceNode

	public get dst() {
		return this.dst_i
	}

	public get src() {
		return this.src_o
	}

	private bot: Client | undefined
	private voice: VoiceManager | undefined

	private bot_follow_mode = true
	private speaking = false
	private self_mute = false
	private self_deaf = false
	private bot_presence: GatewayPresenceUpdateData = {
		since: 0,
		afk: false,
		status: PresenceUpdateStatus.Invisible,
		activities: []
	}
	private bot_user_id: string | null = null
	private usr_user_id: string | null = null
	private usr_guild_id: string | null = null
	private usr_channel_id: string | null = null
	private bot_channel_id: string | null = null

	private _state: BotButtonClientState = 'INITIAL'

	public get state() {
		return this._state
	}

	constructor(ac: AudioContext) {
		super()
		this.ac = ac
		this.dst_i = this.ac.createMediaStreamDestination()
		this.src_i = this.ac.createMediaStreamSource(this.dst_i.stream)
		this.dst_o = this.ac.createMediaStreamDestination()
		this.src_o = this.ac.createMediaStreamSource(this.dst_o.stream)
	}

	private updateState() {
		const state_bot = this.bot?.state
		const state_voice = this.voice?.state

		switch (true) {
			case state_voice === 'FAILED' || state_bot === 'FAILED': {
				this._state = 'FAILED'
				this.shutdown()
				break
			}
			case state_bot === 'DONE': {
				this._state = 'DONE'
				break
			}
			case state_voice === 'CONNECTING': {
				this._state = 'CONNECTING'
				break
			}
			case state_voice === 'CONNECTED': {
				this._state = 'CONNECTED'
				break
			}
			case state_voice === 'DISCONNECTED': {
				this._state = 'WAITING'
				break
			}
			case state_bot === 'READY': {
				this._state = 'WAITING'
				if (this.voice) break
				this.voice = this.bot!.createVoiceManager({
					ac: this.ac,
					audio_settings: { mode: 'sendrecv' }
				})
				this.voice.on('state', () => this.updateState())
				this.src_i.connect(this.voice.dst)
				this.voice.src.connect(this.dst_o)
				break
			}
		}

		this.emit('state', this.state)
	}

	public async init(params: { token: string; debug?: boolean }) {
		this.bot = new Client({
			token: params.token,
			debug: params.debug,
			intents: GatewayIntentBits.GuildVoiceStates,
			properties: {
				os: 'linux',
				browser: 'Discord Android',
				device: 'Discord Android'
			},
			presence: this.bot_presence
		})

		this.bot.on('state', () => this.updateState())

		this.bot.gateway.on('packet', ({ t, d }) => {
			if (t !== GatewayDispatchEvents.Ready) return
			this.bot_user_id = d.user.id
			if (d.user.bot) return // only non bots recieve voice states

			for (const { id, voice_states } of d.guilds) {
				for (const { user_id, channel_id } of voice_states) {
					if (user_id === this.usr_user_id) {
						this.usr_channel_id = channel_id
						break
					}
				}

				if (this.usr_channel_id) {
					this.usr_guild_id = id
					break
				}
			}

			if (this.usr_channel_id) {
				this.move({
					guild_id: this.usr_guild_id,
					channel_id: this.usr_channel_id
				})
			}
		})

		this.bot.gateway.on('packet', ({ t, d }) => {
			if (t !== GatewayDispatchEvents.VoiceStateUpdate) return

			const { member, channel_id, guild_id } = d
			const { id, username } = member.user

			if (id === this.usr_user_id || username === this.usr_user_id) {
				this.usr_channel_id = channel_id
				this.usr_guild_id = this.usr_channel_id ? guild_id : null

				if (this.bot_follow_mode || (this.usr_channel_id && !this.bot_channel_id)) {
					if (!this.usr_channel_id) this.voice?.disconnect()
					else if (this.bot_channel_id !== this.usr_channel_id) {
						this.move({
							guild_id: this.usr_guild_id,
							channel_id: this.usr_channel_id
						})
					}
					return
				}
			}

			if (id === this.bot_user_id) {
				this.bot_channel_id = channel_id
			}
		})

		this.bot.start()
	}

	public setFollowMode(params: { mode: boolean; user_id: string }) {
		const { mode, user_id } = params
		this.bot_follow_mode = mode
		this.usr_user_id = user_id
		if (!mode) return
		if (!this.usr_channel_id) this.voice?.disconnect()
		else {
			this.move({
				guild_id: this.usr_guild_id,
				channel_id: this.usr_channel_id
			})
		}
	}

	public setPresence(params: VoiceBotButtonPresence) {
		const { status, text } = params
		const activities = !text ? [] : [{ name: '', type: ActivityType.Custom, state: text }]
		this.bot_presence = { since: 0, afk: false, status, activities }
		if (this.bot?.state !== 'READY') return
		this.bot?.setPresence(this.bot_presence)
	}

	private move(params: { guild_id: string | null; channel_id: string | null }) {
		this.voice?.update({
			speaking: this.speaking,
			self_deaf: this.self_deaf,
			self_mute: this.self_mute,
			...params
		})
	}

	public update(params: { speaking?: boolean; self_mute?: boolean; self_deaf?: boolean }) {
		const { speaking, self_deaf, self_mute } = params
		this.speaking = speaking !== undefined ? speaking : this.speaking
		this.self_deaf = self_deaf !== undefined ? self_deaf : this.self_deaf
		this.self_mute = self_mute !== undefined ? self_mute : this.self_mute
		this.voice?.update(params)
	}

	public shutdown() {
		this.bot?.shutdown()
		this.voice = undefined
		this.bot = undefined
		this.usr_channel_id = null
		this.usr_guild_id = null
		this.bot_channel_id = null
		this._state === 'INITIAL'
	}
}

export { BotButtonClient as Client }
export default BotButtonClient
