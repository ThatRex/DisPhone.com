<script lang="ts">
	import Button from './ui/button.svelte'
	import ProfileSelector from './profile-selector.svelte'
	import Toggle from './ui/toggle.svelte'
	import {
		IconBellOff,
		IconBellRinging,
		IconPhoneIncoming,
		IconRecordMail,
		IconUsersGroup,
		IconMicrophone,
		IconMicrophoneOff,
		IconHeadphones,
		IconHeadphonesOff,
		IconSwitchHorizontal,
		IconBrandDiscord,
		IconChevronDown,
		IconChevronUp
	} from '@tabler/icons-svelte'
	import Display from './display/display.svelte'
	import DialPanel from './dial-panel.svelte'
	import Dialpad from './dialpad/dialpad.svelte'
	import { state } from '$lib/stores/state.svelte'
	import { config } from '$lib/stores/config.svelte'
	import ToggleMulti from './ui/toggle-multi.svelte'
	import { DTMFSimulator, subscribeKey } from '$lib/utils'
	import { getContext, onMount, setContext } from 'svelte'
	import {
		calls,
		call_ids_active,
		call_ids_selected,
		call_ids_unselected,
		call_ids_connected,
		call_ids_connecting_o,
		call_ids_connecting_i,
		call_ids_has_media,
		removeCall
	} from '$lib/stores/calls.svelte'
	import { addActiveKey, redial_string } from '$lib/stores/dial.svelte'
	import UI from '$lib/components/ui'
	import type { ColorsBtn } from '$lib/components/ui/colors'
	import PhoneClient from '$lib/client-phone'
	import BotBtnClient, { BotButtonClientState } from '$lib/client-bot-button'
	import SoundPlayer from '$lib/utils/sound-player'
	import UserMediaManager from '$lib/utils/user-media-manager'
	import { PresenceUpdateStatus } from 'discord-api-types/v10'

	$: ({
		sound_level_simulated_dtmf,
		sound_level_ring_out,
		sound_level_ring_in,
		conference_play_sounds,
		after_dial_call_selection_mode,
		auto_answer_delay_ms,
		disconnected_timeout_ms,
		sound_ring_in,
		sound_ring_out,
		sound_connected,
		sound_disconnected,
		sound_auto_answered,
		sound_done,
		sip_profiles,
		bot_discord_profiles,
		bot_discord_autostart_enabled,
		bot_discord_follow_mode_enabled,
		bot_discord_debug_enabled,
		close_confirmation_mode,
		hold_unselected_calls,
		dialpad_enabled
	} = $config)

	$: ({
		conference_enabled,
		inbound_call_mode,
		muted_in,
		muted_out,
		level_in,
		level_out,
		level_selected
	} = $state)

	const ac = getContext<AudioContext>('ac')

	const dst_i_browser = ac.createMediaStreamDestination()
	const src_i_browser = ac.createMediaStreamSource(dst_i_browser.stream)
	const gin_i_browser = ac.createGain()
	gin_i_browser.connect(dst_i_browser)

	const dst_o_browser = ac.createMediaStreamDestination()
	// const src_o_browser = ac.createMediaStreamSource(dst_o_browser.stream)
	const gin_o_browser = ac.createGain()
	gin_o_browser.connect(dst_o_browser)

	const dst_i_bot = ac.createMediaStreamDestination()
	const src_i_bot = ac.createMediaStreamSource(dst_i_bot.stream)
	const gin_i_bot = ac.createGain()
	gin_i_bot.connect(dst_i_bot)

	const dst_o_bot = ac.createMediaStreamDestination()
	const src_o_bot = ac.createMediaStreamSource(dst_o_bot.stream)
	const gin_o_bot = ac.createGain()
	gin_o_bot.connect(dst_o_bot)

	const dst_i_phone = ac.createMediaStreamDestination()
	const src_i_phone = ac.createMediaStreamSource(dst_i_phone.stream)

	const dst_o_phone = ac.createMediaStreamDestination()
	const src_o_phone = ac.createMediaStreamSource(dst_o_phone.stream)

	src_i_browser.connect(dst_i_phone)
	src_o_phone.connect(gin_o_browser)

	src_i_bot.connect(dst_i_phone)
	src_o_phone.connect(gin_o_bot)

	$: gin_i_browser.gain.value = !muted_in && !bot_connected ? level_in / 100 : 0
	$: lvl_out_browser = !muted_out && !bot_connected ? level_out / 100 : 0
	$: !lvl_out_browser
		? gin_o_browser.gain.linearRampToValueAtTime(0, ac.currentTime + 0.05)
		: gin_o_browser.gain.exponentialRampToValueAtTime(lvl_out_browser, ac.currentTime + 0.05)

	$: gin_i_bot.gain.value = !muted_in && bot_connected ? level_in / 100 : 0
	$: lvl_out_bot = !muted_out && bot_connected ? level_out / 100 : 0
	$: !lvl_out_bot
		? gin_o_bot.gain.linearRampToValueAtTime(0, ac.currentTime + 0.05)
		: gin_o_bot.gain.exponentialRampToValueAtTime(lvl_out_bot, ac.currentTime + 0.05)

	// Browser Audio
	const audio_browser = new Audio()
	audio_browser.srcObject = dst_o_browser.stream

	// User Media Manager
	const user_media_manager = new UserMediaManager(ac)
	$: user_media_manager.gain = muted_in ? 0 : 100
	user_media_manager.src.connect(gin_i_browser)

	// DTMF Simulator
	const dtmf_simulator = new DTMFSimulator(ac)
	$: dtmf_simulator.gain = sound_level_simulated_dtmf
	dtmf_simulator.src.connect(dst_o_browser)
	setContext('dtmf_simulator', dtmf_simulator)

	// Sounds
	type LoadedSounds = {
		ring_in: AudioBuffer
		ring_out: AudioBuffer
		connected: AudioBuffer
		disconnected: AudioBuffer
		auto_answered: AudioBuffer
		done: AudioBuffer
	}

	const player = new SoundPlayer<Omit<LoadedSounds, 'ring_in' | 'ring_out'>>(ac)
	const player_conf = new SoundPlayer<Pick<LoadedSounds, 'connected' | 'disconnected'>>(ac)
	const player_ring_in = new SoundPlayer<Pick<LoadedSounds, 'ring_in'>>(ac)
	const player_ring_out = new SoundPlayer<Pick<LoadedSounds, 'ring_out'>>(ac)

	$: player_ring_in.gain = sound_level_ring_in
	$: player_ring_out.gain = sound_level_ring_out

	player_conf.src.connect(dst_i_phone)

	$: {
		player.src.disconnect()
		player_ring_in.src.disconnect()
		player_ring_out.src.disconnect()
		if (bot_connected) {
			player.src.connect(dst_o_bot)
			player_ring_in.src.connect(dst_o_bot)
			player_ring_out.src.connect(dst_o_bot)
		} else {
			player.src.connect(dst_o_browser)
			player_ring_in.src.connect(dst_o_browser)
			player_ring_out.src.connect(dst_o_browser)
		}
	}

	let stopRingIn: (() => void) | undefined
	let stopRingOut: (() => void) | undefined

	const playSound = (sound: keyof LoadedSounds) => {
		switch (sound) {
			case 'ring_in': {
				if (stopRingIn) break
				const stopRing = player_ring_in.play({
					name: sound,
					loop: true,
					onstarted: () => bot_sounds_playing_count++,
					onended: () => bot_sounds_playing_count--
				})
				stopRingIn = () => {
					stopRing()
					stopRingIn = undefined
				}
				break
			}
			case 'ring_out': {
				if (stopRingOut) break
				const stopRing = player_ring_out.play({
					name: sound,
					loop: true,
					onstarted: () => bot_sounds_playing_count++,
					onended: () => bot_sounds_playing_count--
				})
				stopRingOut = () => {
					stopRing()
					stopRingOut = undefined
				}
				break
			}
			case 'connected':
			case 'disconnected':
			case 'auto_answered': {
				const name = sound === 'auto_answered' ? 'connected' : sound
				if (conference_play_sounds) player_conf.play({ name })
			}
			default: {
				player.play({
					name: sound,
					onstarted: () => bot_sounds_playing_count++,
					onended: () => bot_sounds_playing_count--
				})
			}
		}
	}

	const getSelectedCallWithMedia = () =>
		$calls
			.filter((c) => c.selected)
			.filter((c) => c.media)
			.map((c) => c.id)

	$: switch (true) {
		case $call_ids_connecting_o.length && !$call_ids_has_media.length && conference_enabled: {
			playSound('ring_out')
			break
		}
		case $call_ids_connecting_o.length &&
			!conference_enabled &&
			(hold_unselected_calls ? !getSelectedCallWithMedia().length : !$call_ids_has_media.length): {
			playSound('ring_out')
			break
		}
		default: {
			stopRingOut?.()
		}
	}

	// Phone
	const phone = getContext<PhoneClient>('phone')
	src_i_phone.connect(phone.dst)
	phone.src.connect(dst_o_phone)
	setContext('phone', phone)

	let initiated = false
	let interaction = false

	let alert_dialog_issue: 'media' | 'webrtc' | 'interaction' | undefined

	let vm_qty = 0
	let vm_dest = ''

	phone.on('dtmf', ({ value }) => {
		addActiveKey(value)
		dtmf_simulator.press(value)
	})

	phone.on('profile-update', (pu) => {
		vm_qty = pu.voicemail_qty
		vm_dest = pu.voicemail_dest || ''
	})

	phone.on('call-update', (cu) => {
		const initial_call_idx = $calls.findIndex((c) => c.id === cu.id)

		// new call
		if (initial_call_idx === -1) {
			if (cu.progress === 'DISCONNECTED') return // dont re-add a disconnected call after its removed

			const ids = !conference_enabled ? [] : $calls.map((c) => c.id)
			phone.conference({ ids })

			const unselect_all = after_dial_call_selection_mode === 'always' && cu.type === 'OUTBOUND'

			let selected = false
			switch (true) {
				case after_dial_call_selection_mode === 'always' && cu.type === 'OUTBOUND': {
					selected = true
					break
				}
				case after_dial_call_selection_mode !== 'never' || cu.type === 'INBOUND': {
					selected = !$call_ids_selected.length
					break
				}
			}

			$calls = [
				...$calls.map((c) => {
					c.selected = unselect_all ? false : c.selected
					return c
				}),
				{ ...cu, selected }
			]

			if (cu.type !== 'INBOUND') return

			switch (inbound_call_mode) {
				case 'R': {
					playSound('ring_in')
					break
				}

				case 'DND': {
					phone.hangup({ ids: [cu.id] })
					break
				}

				case 'AA': {
					playSound('ring_in')
					setTimeout(() => phone.answer({ ids: [cu.id] }), auto_answer_delay_ms)
					break
				}
			}

			return
		}

		// existing call
		const call = $calls[initial_call_idx]
		const disconnect_timeout = cu.hungup ? 0 : disconnected_timeout_ms
		!disconnect_timeout && cu.progress === 'DISCONNECTED'
			? removeCall(cu.id)
			: ($calls[initial_call_idx] = { ...call, ...cu })

		if (call.progress === cu.progress) return
		if (!$call_ids_connecting_i.length) stopRingIn?.()
		if (call.progress === 'CONNECTED' && cu.progress === 'WAITING') playSound('disconnected')

		switch (cu.progress) {
			case 'CONNECTED': {
				if (cu.type === 'INBOUND' && cu.destination) $redial_string = cu.destination
				cu.type === 'INBOUND' && inbound_call_mode === 'AA'
					? playSound('auto_answered')
					: playSound('connected')
				break
			}
			case 'DISCONNECTED': {
				if (disconnect_timeout) setTimeout(() => removeCall(cu.id), disconnect_timeout)
				if (cu.type === 'INBOUND' && inbound_call_mode === 'DND') break
				$call_ids_active.length ? playSound('disconnected') : playSound('done')
				break
			}
		}
	})

	$: some_calls = !!$calls.length
	$: calls_connected = !!$call_ids_connected.length
	$: media_available = !!$call_ids_has_media.length

	// Screen Wake Lock
	let release: (() => Promise<void>) | undefined
	$: lock = some_calls || bot_connected
	$: (async () => {
		try {
			if (!lock) release?.()
			else if (lock && !release) {
				const wls = await navigator.wakeLock.request('screen')
				release = async () => {
					await wls.release()
					release = undefined
				}
			}
		} catch {}
	})()

	// Bot
	const bot = new BotBtnClient(ac)
	bot.src.connect(gin_i_bot)
	src_o_bot.connect(bot.dst)

	$: bot.update({ self_deaf: muted_in })
	$: bot.update({ self_mute: muted_out })
	$: user_id = bot_discord_profiles[0].usr_user_id
	$: bot.setFollowMode({
		mode: bot_discord_follow_mode_enabled,
		user_id
	})

	let bot_state: BotButtonClientState = 'INITIAL'
	let bot_running = false
	let bot_connected = false
	let bot_btn_blink_on = false
	let bot_btn_blink_interval = 0
	let bot_btn_color_on: ColorsBtn = 'mono'
	let bot_btn_color_off: ColorsBtn = 'mono'
	$: bot_btn_color = { on: bot_btn_color_on, off: bot_btn_color_off }

	const botBtnBlink = () => (bot_btn_color_on = bot_btn_color_on === 'mono' ? 'blue' : 'mono')

	// stop media when bot connected; only only app can use the mic at a time on mobile
	const statMedia = () => user_media_manager.start()
	const stopMedia = () => user_media_manager.stop()
	$: if (initiated) bot_connected ? stopMedia() : statMedia()

	// bot speaking
	let bot_sounds_playing_count = 0
	$: speaking = bot_sounds_playing_count > 0 || (!muted_out && (calls_connected || media_available))
	$: if (speaking) bot.update({ speaking: true })
	else setTimeout(() => speaking || bot.update({ speaking: false }), 125)

	// bot presence
	$: bot_invisible = bot_discord_profiles[0].bot_invisible
	$: status = bot_invisible
		? PresenceUpdateStatus.Invisible
		: bot_connected && calls_connected
			? PresenceUpdateStatus.Online
			: PresenceUpdateStatus.Idle
	const getTextStatus = () => bot_discord_profiles[0].bot_status_text
	$: bot.setPresence({ status, text: getTextStatus() })

	bot.on('state', (s) => {
		bot_running = !['DONE', 'FAILED'].includes(s)
		bot_connected = s === 'CONNECTED'
		bot_btn_color_off = 'mono'
		clearInterval(bot_btn_blink_interval)
		switch (s) {
			case 'WAITING': {
				bot_btn_color_on = bot_btn_blink_on ? 'blue' : 'mono'
				bot_btn_blink_interval = setInterval(botBtnBlink, 1000)
				break
			}
			case 'CONNECTING': {
				bot_btn_blink_interval = setInterval(botBtnBlink, 100)
				break
			}
			case 'CONNECTED': {
				bot_btn_color_on = 'blue'
				break
			}
			case 'DONE': {
				if (bot_state === 'FAILED') break
				bot_btn_color_on = 'mono'
				bot_state = 'DONE'
				break
			}
			case 'FAILED': {
				bot_btn_color_on = 'red'
				bot_btn_color_off = 'red'
				break
			}
		}

		bot_state = s
	})

	const getMedia = async () => {
		console.info('Getting Media')

		const got_user_media = await user_media_manager.start()
		if (!got_user_media) {
			alert_dialog_issue = 'media'
			return false
		}

		await ac.resume()
		await audio_browser.play()

		alert_dialog_issue = undefined
		return true
	}

	async function loadSounds() {
		console.info('Loading Sounds')

		const { ring_in, ring_out, connected, disconnected, auto_answered, done } =
			await SoundPlayer.load({
				ring_in: sound_ring_in,
				ring_out: sound_ring_out,
				connected: sound_connected,
				disconnected: sound_disconnected,
				auto_answered: sound_auto_answered,
				done: sound_done
			})

		player.loadSounds({ connected, disconnected, auto_answered, done })
		player_conf.loadSounds({ connected, disconnected })
		player_ring_in.loadSounds({ ring_in })
		player_ring_out.loadSounds({ ring_out })
	}

	async function init() {
		if (initiated) return

		console.info('Initiating')

		alert_dialog_issue = undefined

		if (!window.RTCPeerConnection) {
			alert_dialog_issue = 'webrtc'
			return
		}

		const got_media = await getMedia()
		if (!got_media) return

		loadSounds()

		for (const p of sip_profiles) phone.addProfile(p)

		const profile_bot = bot_discord_profiles[0]
		if (profile_bot.bot_token && bot_discord_autostart_enabled) {
			bot.init({
				token: profile_bot.bot_token,
				debug: bot_discord_debug_enabled
			})
		}

		initiated = true
		console.info('Initiated')
	}

	onMount(() => {
		document.documentElement.addEventListener('click', () => (interaction = true))
		init()
	})
	window.onbeforeunload = () => {
		if (close_confirmation_mode === 'always') return false
		if ($call_ids_active.length && close_confirmation_mode !== 'never') return false
	}

	// Toggles

	// users often try enabling DND to stop inbound ringing
	$: inbound_call_mode !== 'DND' || stopRingIn?.()

	subscribeKey(state, 'conference_enabled', (v) => {
		const ids = !v ? [] : $calls.map((c) => c.id)
		phone.conference({ ids })
		if (hold_unselected_calls) phone.setHold({ ids, value: false })
	})

	subscribeKey(config, 'hold_unselected_calls', (v) => v || phone.setHold({ value: false }))
	$: if (hold_unselected_calls && !conference_enabled) {
		phone.setHold({ ids: $call_ids_selected, value: false })
		phone.setHold({ ids: $call_ids_unselected, value: true })
	}

	let muted_in_previously = $state.muted_in
	subscribeKey(config, 'mute_on_deafen', () => {
		if (!$state.muted_out) return
		muted_in_previously = $state.muted_in
		$state.muted_in = true
	})
	subscribeKey(state, 'muted_in', () => {
		if (!$config.mute_on_deafen) return
		if ($state.muted_in) return
		muted_in_previously = false
		$state.muted_out = false
	})
	subscribeKey(state, 'muted_out', () => {
		if (!$config.mute_on_deafen) return
		if ($state.muted_out) {
			muted_in_previously = $state.muted_in
			$state.muted_in = true
		} else {
			$state.muted_in = muted_in_previously
		}
	})
</script>

<UI.Dialog open={!!alert_dialog_issue} closable={false} label="Media Issue" role="alertdialog">
	<div class="flex flex-col gap-6">
		<span class="font-medium text-lg">
			{#if alert_dialog_issue === 'webrtc'}
				DisPhone requires WebRTC to function. Please enable WebRTC and try again.
			{:else if alert_dialog_issue === 'media'}
				DisPhone requires media access to function. Please clear permissions and try again.
			{/if}
		</span>
		<UI.ButtonText
			label={alert_dialog_issue === 'interaction' ? 'Okay' : 'Try Again'}
			on:click={() => {
				interaction = true
				if (alert_dialog_issue === 'webrtc') location.reload()
				else !initiated ? init() : getMedia()
			}}
		/>
	</div>
</UI.Dialog>

<section
	class="
		flex flex-col max-xs:flex-col-reverse basis-full
		max-xs:h-svh xs:max-h-[576px] max-xs:min-h-[290px]
		p-3 gap-y-4 snap-start scroll-mt-3
		"
>
	<div class="flex flex-col gap-y-4 gap-x-2 flex-wrap max-xs:flex-col-reverse">
		<div class="flex gap-2 flex-wrap max-xs:flex-wrap-reverse">
			<div class="flex gap-2 flex-wrap max-xs:grow">
				<Toggle
					bind:value={$state.secondary_panel_enabled}
					tip={{ on: 'Hide Subpanel', off: 'Show Subpanel' }}
					icon={{ on: IconChevronUp, off: IconChevronDown }}
				/>
				<Button
					tip="{vm_qty} {vm_qty === 1 ? 'Voicemail' : 'Voicemails'}"
					on:trigger={({ detail }) => {
						if (detail !== 0) return
						const input = sip_profiles[0].number_voicemail || vm_dest
						phone.dial({ profile_id: $config.sip_profiles[0].id, input })
					}}
					icon={IconRecordMail}
					color={vm_qty ? 'red' : 'mono'}
					disabled={!sip_profiles[0].number_voicemail && !vm_dest}
				/>
			</div>

			<ProfileSelector />

			<div class="flex gap-2 flex-wrap max-xs:grow">
				{#if bot_running || (bot_discord_profiles[0].usr_user_id && bot_discord_profiles[0].bot_token)}
					<Toggle
						value={bot_running}
						tip="Discord Dialer"
						icon={IconBrandDiscord}
						bind:color={bot_btn_color}
						on:toggle={() => {
							if (bot_running) {
								bot.shutdown()
							} else {
								bot.init({
									token: bot_discord_profiles[0].bot_token,
									debug: bot_discord_debug_enabled
								})
							}
						}}
					/>
				{/if}
				<ToggleMulti
					bind:value={$state.inbound_call_mode}
					modes={[
						{
							icon: IconBellRinging,
							tip: 'Ring',
							value: 'R'
						},
						{
							icon: IconBellOff,
							tip: 'Do Not Disturb',
							value: 'DND',
							color: 'red',
							on: true
						},
						{
							icon: IconPhoneIncoming,
							tip: 'Auto Answer',
							value: 'AA',
							color: 'orange',
							on: true
						}
					]}
				/>
				<Toggle
					bind:value={$state.conference_enabled}
					tip="Conference"
					icon={IconUsersGroup}
					color={{ on: 'yellow', off: 'mono' }}
				/>
			</div>
		</div>

		<DialPanel />
	</div>

	<div class="flex grow gap-2 h-[166px]">
		<Display />
		{#if dialpad_enabled}
			<Dialpad />
		{/if}
		<div class="flex flex-col gap-2">
			<div class="flex gap-2 h-full">
				{#if bot_connected}
					<div class="flex {level_selected === 'IN' ? 'max-xs:hidden' : ''}">
						<UI.Level
							bind:state={$state.muted_in}
							bind:value={$state.level_in}
							label="Level In"
							tip={{ on: 'Undeafen', off: 'Deafen' }}
							icon={{ on: IconHeadphonesOff, off: IconHeadphones }}
							color="blue"
						/>
					</div>
					<div class="flex {level_selected === 'OUT' ? 'max-xs:hidden' : ''}">
						<UI.Level
							bind:state={$state.muted_out}
							bind:value={$state.level_out}
							label="Level Out"
							tip={{ on: 'Unmute', off: 'Mute' }}
							icon={{ on: IconMicrophoneOff, off: IconMicrophone }}
							color="blue"
						/>
					</div>
				{:else}
					<div class="flex {level_selected === 'IN' ? 'max-xs:hidden' : ''}">
						<UI.Level
							bind:state={$state.muted_in}
							bind:value={$state.level_in}
							label="Level In"
							tip={{ on: 'Unmute', off: 'Mute' }}
							icon={{ on: IconMicrophoneOff, off: IconMicrophone }}
						/>
					</div>
					<div class="flex {level_selected === 'OUT' ? 'max-xs:hidden' : ''}">
						<UI.Level
							bind:state={$state.muted_out}
							bind:value={$state.level_out}
							label="Level Out"
							tip={{ on: 'Undeafen', off: 'Deafen' }}
							icon={{ on: IconHeadphonesOff, off: IconHeadphones }}
						/>
					</div>
				{/if}
			</div>
			<div class="max-xs:flex hidden grow">
				<Toggle
					on:toggle={() => ($state.level_selected = level_selected === 'IN' ? 'OUT' : 'IN')}
					tip="Switch Level"
					value={$state.level_selected === 'IN'}
					icon={IconSwitchHorizontal}
				/>
			</div>
		</div>
	</div>
</section>
