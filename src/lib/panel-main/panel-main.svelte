<script lang="ts">
	import Button from './ui/button.svelte'
	import ProfileSelector from './profile-selector.svelte'
	import Toggle from './ui/toggle.svelte'
	import {
		IconBellOff,
		IconBellRinging,
		IconLayoutBottombarCollapse,
		IconLayoutBottombarExpandFilled,
		IconPhoneIncoming,
		IconRecordMail,
		IconUsersGroup,
		IconMicrophone,
		IconMicrophoneOff,
		IconHeadphones,
		IconHeadphonesOff,
		IconSwitchHorizontal,
		IconBrandDiscord
	} from '@tabler/icons-svelte'
	import Display from './display/display.svelte'
	import DialPanel from './dial-panel.svelte'
	import Dialpad from './dialpad/dialpad.svelte'
	import { config } from '$lib/stores/config.persistent'
	import ToggleMulti from './ui/toggle-multi.svelte'
	import { DTMFSimulator, subscribeKey } from '$lib/utils'
	import { onMount, setContext } from 'svelte'
	import {
		calls,
		call_ids_active,
		call_ids_selected,
		call_ids_unselected,
		call_ids_connected,
		call_ids_connecting_o,
		call_ids_connecting_i,
		call_ids_has_media
	} from '$lib/stores/calls.volitile'
	import { addActiveKey, redial_string } from '$lib/stores/dial.volitile'
	import Dialog from '$lib/components/dialog.svelte'
	import ButtonText from '$lib/components/button-text.svelte'
	import PhoneClient from '$lib/client-phone'
	import BotBtnClient, { BotButtonClientState } from '$lib/client-bot-button'
	import Level from './ui/level.svelte'
	import SoundPlayer from '$lib/utils/sound-player'
	import UserMediaManager from '$lib/utils/user-media-manager'
	import type { ColorsBtn } from '$lib/components/colors'
	import { PresenceUpdateStatus } from 'discord-api-types/v10'

	$: ({
		sound_level_ring_out,
		sound_level_ring_in,
		conference_play_sounds,
		conference_enabled,
		inbound_call_mode,
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
		muted_in,
		muted_out,
		level_in,
		level_out,
		simulate_dtmf,
		mute_on_deafen,
		dialpad_enabled,
		level_selected
	} = $config)

	const ac = new AudioContext()

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
	$: {
		// prevents the popping when adjusting the volume.
		const lvl = !muted_out && !bot_connected ? level_out / 100 : 0
		gin_o_browser.gain.linearRampToValueAtTime(lvl === 0 ? 0.0001 : lvl, ac.currentTime + 0.02)
	}

	$: gin_i_bot.gain.value = !muted_in && bot_connected ? level_in / 100 : 0
	$: {
		// prevents the popping when adjusting the volume.
		const lvl = !muted_out && bot_connected ? level_out / 100 : 0
		gin_o_bot.gain.linearRampToValueAtTime(lvl === 0 ? 0.0001 : lvl, ac.currentTime + 0.02)
	}

	// Browser Audio
	const audio_browser = new Audio()
	audio_browser.srcObject = dst_o_browser.stream

	// User Media Manager
	const user_media_manager = new UserMediaManager(ac)
	$: user_media_manager.gain = muted_in ? 0 : 100
	user_media_manager.src.connect(gin_i_browser)

	// DTMF Simulator
	const dtmf_simulator = new DTMFSimulator(ac)
	$: dtmf_simulator.gain = simulate_dtmf ? 10 : 0
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

	const player = new SoundPlayer<LoadedSounds>(ac)
	const player_conf = new SoundPlayer<Pick<LoadedSounds, 'connected' | 'disconnected'>>(ac)
	player_conf.src.connect(dst_i_phone)

	$: {
		player.src.disconnect()
		if (bot_connected) player.src.connect(dst_o_bot)
		else player.src.connect(dst_o_browser)
	}

	let stopRingIn: (() => void) | undefined
	let stopRingOut: (() => void) | undefined

	const playSound = (sound: keyof LoadedSounds) => {
		switch (sound) {
			case 'ring_in': {
				if (stopRingIn) break
				const stopRing = player.play({
					name: sound,
					loop: true,
					volume: sound_level_ring_in,
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
				const stopRing = player.play({
					name: sound,
					loop: true,
					volume: sound_level_ring_out,
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
	const phone = new PhoneClient({ ac, debug: $config.sip_debug_enabled })
	src_i_phone.connect(phone.dst)
	phone.src.connect(dst_o_phone)
	setContext('phone', phone)

	let initiated = false
	let interaction = false

	let alert_dialog_issue: 'media' | 'webrtc' | 'interaction' | undefined

	let vm_qty = 0
	let vm_dest = ''

	phone.on('dtmf', (dtmf) => {
		addActiveKey(dtmf)
		dtmf_simulator.press(dtmf)
	})

	phone.on('profile-update', (pu) => {
		vm_qty = pu.voicemail_qty
		vm_dest = pu.voicemail_dest || ''
	})

	phone.on('call-update', (cu) => {
		const getCallIdx = () => $calls.findIndex((c) => c.id === cu.id)
		const initial_call_idx = getCallIdx()

		// new call
		if (initial_call_idx === -1) {
			const ids = !conference_enabled ? [] : $calls.map((c) => c.id)
			phone.conference({ ids })

			const hidden = cu.type === 'INBOUND' && inbound_call_mode === 'DND'

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
				{ ...cu, hidden, selected }
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
					setTimeout(() => {
						const call = $calls[getCallIdx()]
						if (!call || call.progress !== 'CONNECTING') return
						phone.answer({ ids: [cu.id] })
					}, auto_answer_delay_ms)
					break
				}
			}

			return
		}

		// existing call
		const call = $calls[initial_call_idx]

		if (call.progress === 'CONNECTED' && cu.progress === 'WAITING') {
			playSound('disconnected')
		}

		const hidden =
			call.progress === 'DISCONNECTED' && cu.progress !== 'DISCONNECTED' ? false : call.hidden
		$calls[initial_call_idx] = { ...call, ...cu, hidden }

		if (!$call_ids_connecting_i.length) stopRingIn?.()

		switch (cu.progress) {
			case 'CONNECTED': {
				if (call.progress === 'CONNECTED') break
				if (cu.type === 'INBOUND' && cu.destination) $redial_string = cu.destination
				call.type === 'INBOUND' && inbound_call_mode === 'AA'
					? playSound('auto_answered')
					: playSound('connected')
				break
			}
			case 'DISCONNECTED': {
				if (call.progress === 'DISCONNECTED') break
				setTimeout(() => ($calls = $calls.filter((c) => c.id !== call.id)), disconnected_timeout_ms)
				if (call.type === 'INBOUND' && inbound_call_mode === 'DND') return
				$call_ids_active.length ? playSound('disconnected') : playSound('done')
				break
			}
		}
	})

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
	let bot_btn_color_on: ColorsBtn = 'blue'
	let bot_btn_color_off: ColorsBtn = 'mono'
	$: bot_btn_color = { on: bot_btn_color_on, off: bot_btn_color_off }

	const botBtnBlink = () => (bot_btn_color_on = bot_btn_color_on === 'mono' ? 'blue' : 'mono')

	const statMedia = () => user_media_manager.start()
	const stopMedia = () => user_media_manager.stop()
	$: if (initiated) bot_connected ? stopMedia() : statMedia()

	$: calls_connected = !!$call_ids_connected.length
	$: media_available = !!$call_ids_has_media.length

	let bot_sounds_playing_count = 0
	$: speaking = bot_sounds_playing_count > 0 || (!muted_out && (calls_connected || media_available))
	$: if (speaking) bot.update({ speaking: true })
	else setTimeout(() => speaking || bot.update({ speaking: false }), 125)

	$: status = bot_discord_profiles[0].bot_invisible
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
				if (bot_state !== 'FAILED') bot_state = 'DONE'
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

		// if (!interaction && 'chrome' in window) {
		// 	alert_dialog_issue = 'interaction'
		// 	return false
		// }

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

		const loaded_sounds = await SoundPlayer.load({
			ring_in: sound_ring_in,
			ring_out: sound_ring_out,
			connected: sound_connected,
			disconnected: sound_disconnected,
			auto_answered: sound_auto_answered,
			done: sound_done
		})

		const loaded_sounds_conf = await SoundPlayer.load({
			connected: sound_connected,
			disconnected: sound_disconnected
		})

		player.loadSounds(loaded_sounds)
		player_conf.loadSounds(loaded_sounds_conf)
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

		const profile_sip = sip_profiles[0]
		phone.addProfile(profile_sip)

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

	/* Toggles */

	// users often try enabling DND to stop inbound ringing
	$: inbound_call_mode !== 'DND' || stopRingIn?.()

	subscribeKey(config, 'conference_enabled', (v) => {
		const ids = !v ? [] : $calls.map((c) => c.id)
		phone.conference({ ids })
		if (hold_unselected_calls) phone.setHold({ ids, value: false })
	})

	subscribeKey(config, 'hold_unselected_calls', (v) => v || phone.setHold({ value: false }))
	$: if (hold_unselected_calls && !conference_enabled) {
		phone.setHold({ ids: $call_ids_selected, value: false })
		phone.setHold({ ids: $call_ids_unselected, value: true })
	}

	let muted_in_previously = muted_in
	subscribeKey(config, 'mute_on_deafen', () => {
		if (!muted_out) return
		muted_in_previously = muted_in
		muted_in = true
	})
	subscribeKey(config, 'muted_in', () => {
		if (!mute_on_deafen) return
		if (muted_in) return
		muted_in_previously = false
		muted_out = false
	})
	subscribeKey(config, 'muted_out', () => {
		if (!mute_on_deafen) return
		if (muted_out) {
			muted_in_previously = muted_in
			muted_in = true
		} else {
			muted_in = muted_in_previously
		}
	})
</script>

<Dialog open={!!alert_dialog_issue} closable={false} label="Media Issue" role="alertdialog">
	<div class="flex flex-col gap-6">
		<span class="font-medium text-lg">
			{#if alert_dialog_issue === 'webrtc'}
				DisPhone requires WebRTC to function. Please enable WebRTC and try again.
			{:else if alert_dialog_issue === 'media'}
				DisPhone requires media access to function. Please clear permissions and try again.
			{:else if alert_dialog_issue === 'interaction'}
				Chrome based browsers require user interaction to play audio. Just click okay.
			{/if}
		</span>
		<ButtonText
			label={alert_dialog_issue === 'interaction' ? 'Okay' : 'Try Again'}
			on:click={() => {
				interaction = true
				if (alert_dialog_issue === 'webrtc') location.reload()
				else !initiated ? init() : getMedia()
			}}
		/>
	</div>
</Dialog>

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
					bind:value={$config.secondary_panel_enabled}
					tip="Secondary Panel"
					icon={{
						on: IconLayoutBottombarExpandFilled,
						off: IconLayoutBottombarCollapse
					}}
				/>
				<Button
					tip="{vm_qty} {vm_qty === 1 ? 'Voicemail' : 'Voicemails'}"
					on:trigger={() => {
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
						tip="Discord Bot"
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
					bind:value={$config.inbound_call_mode}
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
					bind:value={$config.conference_enabled}
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
						<Level
							bind:state={$config.muted_in}
							bind:value={$config.level_in}
							label="Level In"
							tip={{ on: 'Undeafen', off: 'Deafen' }}
							icon={{ on: IconHeadphonesOff, off: IconHeadphones }}
							color="blue"
						/>
					</div>
					<div class="flex {level_selected === 'OUT' ? 'max-xs:hidden' : ''}">
						<Level
							bind:state={$config.muted_out}
							bind:value={$config.level_out}
							label="Level Out"
							tip={{ on: 'Unmute', off: 'Mute' }}
							icon={{ on: IconMicrophoneOff, off: IconMicrophone }}
							color="blue"
						/>
					</div>
				{:else}
					<div class="flex {level_selected === 'IN' ? 'max-xs:hidden' : ''}">
						<Level
							bind:state={$config.muted_in}
							bind:value={$config.level_in}
							label="Level In"
							tip={{ on: 'Unmute', off: 'Mute' }}
							icon={{ on: IconMicrophoneOff, off: IconMicrophone }}
						/>
					</div>
					<div class="flex {level_selected === 'OUT' ? 'max-xs:hidden' : ''}">
						<Level
							bind:state={$config.muted_out}
							bind:value={$config.level_out}
							label="Level Out"
							tip={{ on: 'Undeafen', off: 'Deafen' }}
							icon={{ on: IconHeadphonesOff, off: IconHeadphones }}
						/>
					</div>
				{/if}
			</div>
			<div class="max-xs:flex hidden grow">
				<Toggle
					on:toggle={() => ($config.level_selected = level_selected === 'IN' ? 'OUT' : 'IN')}
					tip="Switch Level"
					value={$config.level_selected === 'IN'}
					icon={IconSwitchHorizontal}
				/>
			</div>
		</div>
	</div>
</section>
