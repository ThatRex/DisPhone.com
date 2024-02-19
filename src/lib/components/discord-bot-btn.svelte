<script lang="ts">
	import { IconBrandDiscord } from '@tabler/icons-svelte'
	import Toggle from './core/toggle.svelte'
	import { config } from '$lib/stores/state.persistent'
	import { Client } from '$lib/discord-voice-client'
	import { type VoiceManager } from '$lib/discord-voice-client/voice-manager'
	import { GatewayDispatchEvents, PresenceUpdateStatus } from 'discord-api-types/v10'
	import { ColorsBtn } from './core/colors'
	import { onMount } from 'svelte'
	import { getUserMedia, subscribeKey } from '$lib/utils'

	export let running = false
	export let connected = false

	export let ac: AudioContext
	export let dst_i: MediaStreamAudioDestinationNode
	export let gin_o: GainNode

	let bot: Client | undefined
	let bot_user_id: string
	let bot_is_bot: boolean
	let bot_voice: VoiceManager | undefined

	let bot_guild_id: string | null = null
	let bot_channel_id: string | null = null

	let usr_guild_id: string | null = null
	let usr_channel_id: string | null = null

	$: running = !!bot

	type BtnState = keyof typeof BtnState
	const BtnState = {
		INITIAL: 'INITIAL',
		WAITING: 'WAITING',
		CONNECTING: 'CONNECTING',
		CONNECTED: 'CONNECTED',
		DONE: 'DONE',
		FAILED: 'FAILED'
	} as const

	let btn_state: BtnState = 'INITIAL'
	let btn_blink_on = false
	let btn_blink_interval = 0
	let btn_color_on: ColorsBtn = 'blue'
	let btn_color_off: ColorsBtn = 'mono'
	$: btn_color = { on: btn_color_on, off: btn_color_off }

	$: {
		connected = btn_state === 'CONNECTED'
		btn_color_off = 'mono'
		clearInterval(btn_blink_interval)
		switch (true) {
			case btn_state === 'WAITING': {
				btn_color_on = btn_blink_on ? 'blue' : 'mono'
				btn_blink_interval = setInterval(() => (btn_blink_on = !btn_blink_on), 1000)
				break
			}
			case btn_state === 'CONNECTING': {
				btn_color_on = btn_blink_on ? 'blue' : 'mono'
				btn_blink_interval = setInterval(() => (btn_blink_on = !btn_blink_on), 100)
				break
			}
			case btn_state === 'FAILED': {
				btn_color_on = 'red'
				btn_color_off = 'red'
				break
			}
			default: {
				btn_color_on = 'blue'
				break
			}
		}
	}

	async function init() {
		if (bot) return

		try {
			await getUserMedia({ audio: true }, true)
			$config.tgl_bot = true
		} catch {
			$config.tgl_bot = false
			return
		}

		const bot_config = $config.cfg_discord_profiles[0]

		bot = new Client({
			token: bot_config.bot_token!,
			debug: $config.cfg_debug_enabled,
			properties: {
				os: 'linux',
				browser: 'Discord Android',
				device: 'Discord Android'
			},
			presence: {
				since: 0,
				afk: false,
				status: PresenceUpdateStatus.Idle,
				activities: []
			}
		})

		bot.on('state', (state) => {
			switch (state) {
				case 'READY': {
					btn_state = btn_state === 'CONNECTED' ? 'CONNECTED' : 'WAITING'
					break
				}
				case 'DONE': {
					if (btn_state !== 'FAILED') btn_state = 'DONE'
					$config.tgl_bot = false
					break
				}
				case 'FAILED': {
					btn_state = 'FAILED'
					$config.tgl_bot = false
					break
				}
			}
		})

		bot.gateway.on('packet', ({ t, d }) => {
			if (t !== GatewayDispatchEvents.Ready) return
			bot_is_bot = d.user.bot
			bot_user_id = d.user.id
			if (bot_is_bot) return

			for (const { id, voice_states } of d.guilds) {
				for (const { user_id, channel_id } of voice_states) {
					if (user_id === bot_config.usr_user_id) {
						usr_channel_id = channel_id
						break
					}
				}

				if (usr_channel_id) {
					usr_guild_id = id
					break
				}
			}

			if (usr_channel_id && usr_guild_id) connect()
		})

		bot.gateway.on('packet', ({ t, d }) => {
			if (t !== GatewayDispatchEvents.VoiceStateUpdate) return

			const { member, channel_id, guild_id } = d
			const { id, username } = member.user

			if (id === bot_config.usr_user_id || username === bot_config.usr_user_id) {
				usr_channel_id = channel_id
				usr_guild_id = usr_channel_id ? guild_id : null

				if ($config.cfg_discord_follow_mode) {
					if (!usr_channel_id) bot_voice?.disconnect()
					else connect()
					return
				}

				if (usr_channel_id && !bot_channel_id) connect()
			}

			if (id === bot_user_id || username === bot_user_id) {
				bot_channel_id = channel_id
				bot_guild_id = bot_channel_id ? guild_id : null
				return
			}
		})

		bot.start()
	}

	async function connect() {
		if (!bot) return

		if (!bot_voice) {
			bot_voice = bot.createVoiceManager({ audio_settings: { mode: 'sendrecv' } })

			bot_voice.stream_i = dst_i.stream
			ac.createMediaStreamSource(bot_voice.stream_o).connect(gin_o)

			bot_voice.on('state', (state) => {
				switch (state) {
					case 'CONNECTING': {
						btn_state = 'CONNECTING'
						break
					}
					case 'CONNECTED': {
						btn_state = 'CONNECTED'
						break
					}
					case 'DISCONNECTED': {
						btn_state = 'WAITING'
						break
					}
					case 'FAILED': {
						btn_state = 'FAILED'
						$config.tgl_bot = false
						break
					}
				}
			})
		}

		bot_voice.update({
			guild_id: usr_guild_id,
			channel_id: usr_channel_id,
			speaking: true,
			self_deaf: $config.tgl_muted,
			self_mute: $config.tgl_deafened
		})
	}

	const destroy = () => {
		bot_voice?.disconnect()
		bot_voice = undefined

		bot?.shutdown()
		bot = undefined

		bot_guild_id = null
		bot_channel_id = null

		usr_guild_id = null
		usr_channel_id = null
	}

	onMount(async () => {
		subscribeKey(config, 'tgl_bot', (v) => (v ? init() : destroy()))
		subscribeKey(config, 'tgl_deafened', (v) => bot_voice?.update({ self_mute: v }))
		subscribeKey(config, 'tgl_muted', (v) => bot_voice?.update({ self_deaf: v }))
		subscribeKey(config, 'cfg_discord_follow_mode', (v) => {
			if (!v) return
			if (!usr_channel_id) bot_voice?.disconnect()
			else connect()
		})

		if ($config.tgl_bot && !bot) await init()
	})
</script>

<Toggle
	bind:value={$config.tgl_bot}
	tip="Discord Bot"
	icon={IconBrandDiscord}
	bind:color={btn_color}
/>
