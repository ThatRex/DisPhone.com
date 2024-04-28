<script lang="ts">
	import Button from '$lib/components/core/button.svelte'
	import ProfileSelector from '$lib/components/profile-selector.svelte'
	import Toggle from '$lib/components/core/toggle.svelte'
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
	import CallDisplay from '$lib/components/display/display.svelte'
	import DialPanel from '$lib/components/dial-panel.svelte'
	import SecondaryPanel from '$lib/components/secondary-panel/secondary-panel.svelte'
	import Dialpad from '$lib/components/dialpad/dialpad.svelte'
	import { config } from '$lib/stores/config.persistent'
	import ToggleMulti from '$lib/components/core/toggle-multi.svelte'
	import { DTMFSimulator, subscribeKey } from '$lib/utils'
	import { onMount, setContext } from 'svelte'
	import { call_ids_active, call_ids_connected, calls } from '$lib/stores/calls.volitile'
	import { addActiveKey, redial_string } from '$lib/stores/dial.volitile'
	import Dialog from '$lib/components/core/dialog.svelte'
	import ButtonText from '$lib/components/core/button-text.svelte'
	import PhoneClient from '$lib/client-phone'
	import BotBtnClient, { BotButtonClientState } from '$lib/client-bot-button'
	import Level from '$lib/components/core/level.svelte'
	import SoundPlayer from '$lib/utils/sound-player'
	import UserMediaManager from '$lib/utils/user-media-manager'
	import type { ColorsBtn } from '$lib/components/core/colors'
	import { PresenceUpdateStatus } from 'discord-api-types/v10'

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

	$: gin_i_browser.gain.value = !$config.muted_in && !bot_connected ? $config.level_in / 100 : 0
	$: {
		// prevents the popping when adjusting the volume.
		const lvl = !$config.muted_out && !bot_connected ? $config.level_out / 100 : 0
		gin_o_browser.gain.linearRampToValueAtTime(lvl === 0 ? 0.0001 : lvl, ac.currentTime + 0.02)
	}

	$: gin_i_bot.gain.value = !$config.muted_in && bot_connected ? $config.level_in / 100 : 0
	$: {
		// prevents the popping when adjusting the volume.
		const lvl = !$config.muted_out && bot_connected ? $config.level_out / 100 : 0
		gin_o_bot.gain.linearRampToValueAtTime(lvl === 0 ? 0.0001 : lvl, ac.currentTime + 0.02)
	}

	// Browser Audio
	const audio_browser = new Audio()
	audio_browser.srcObject = dst_o_browser.stream

	// User Media Manager
	const user_media_manager = new UserMediaManager(ac)
	$: user_media_manager.gain = $config.muted_in ? 0 : 100
	user_media_manager.src.connect(gin_i_browser)

	// DTMF Simulator
	const dtmf_simulator = new DTMFSimulator(ac)
	$: dtmf_simulator.gain = $config.simulate_dtmf ? 10 : 0
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

	const player_conf = new SoundPlayer<Pick<LoadedSounds, 'connected' | 'disconnected'>>(ac)
	player_conf.src.connect(dst_i_phone)

	const player_browser = new SoundPlayer<LoadedSounds>(ac)
	const player_bot = new SoundPlayer<LoadedSounds>(ac)

	$: {
		player_browser.src.disconnect()
		player_bot.src.disconnect()
		if (bot_connected) player_bot.src.connect(dst_o_bot)
		else player_browser.src.connect(dst_o_browser)
	}

	let stopRingIn: (() => void) | undefined
	let stopRingOut: (() => void) | undefined

	const playSound = async (sound: keyof LoadedSounds) => {
		switch (sound) {
			case 'ring_in': {
				if (stopRingIn) break
				const stopRingInBrowser = await player_browser.play({
					name: sound,
					loop: true,
					volume: $config.sound_browser_level_ring_in
				})
				const stopRingInBot = await player_bot.play({
					name: sound,
					loop: true,
					volume: $config.sound_bot_level_ring_in,
					onstarted: () => bot_sounds_playing_count++,
					onended: () => bot_sounds_playing_count--
				})
				stopRingIn = () => {
					stopRingInBrowser()
					stopRingInBot()
					stopRingIn = undefined
				}
				break
			}
			case 'ring_out': {
				if (stopRingOut) break
				const stopRingOutBrowser = await player_browser.play({
					name: sound,
					loop: true,
					volume: $config.sound_browser_level_ring_in
				})
				const stopRingOutBot = await player_bot.play({
					name: sound,
					loop: true,
					volume: $config.sound_bot_level_ring_out,
					onstarted: () => bot_sounds_playing_count++,
					onended: () => bot_sounds_playing_count--
				})
				stopRingOut = () => {
					stopRingOutBrowser()
					stopRingOutBot()
					stopRingOut = undefined
				}
				break
			}
			case 'connected':
			case 'disconnected':
			case 'auto_answered': {
				const name = sound === 'auto_answered' ? 'connected' : sound
				if ($config.conference_play_sounds) await player_conf.play({ name })
			}
			default: {
				await player_browser.play({ name: sound })
				await player_bot.play({
					name: sound,
					onstarted: () => bot_sounds_playing_count++,
					onended: () => bot_sounds_playing_count--
				})
			}
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
			const ids = !$config.conference_enabled ? [] : $calls.map((c) => c.id)
			phone.conference({ ids })

			const hidden = cu.type === 'INBOUND' && $config.inbound_call_mode === 'DND'
			const selected = !$calls.filter((c) => c.selected).length
			$calls.push({ ...cu, selected, hidden })
			$calls = $calls

			if (cu.type !== 'INBOUND') return

			switch ($config.inbound_call_mode) {
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
					}, $config.auto_answer_delay_ms)
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

		const connecting_i = $calls.filter((c) => c.progress === 'CONNECTING' && c.type === 'INBOUND')
		if (!connecting_i.length) stopRingIn?.()

		const connecting_o = $calls.filter((c) => c.progress === 'CONNECTING' && c.type === 'OUTBOUND')
		!$call_ids_connected.length && connecting_o.length ? playSound('ring_out') : stopRingOut?.()

		switch (cu.progress) {
			case 'CONNECTED': {
				if (call.progress === 'CONNECTED') break
				if (cu.type === 'INBOUND' && cu.destination) $redial_string = cu.destination
				call.type === 'INBOUND' && $config.inbound_call_mode === 'AA'
					? playSound('auto_answered')
					: playSound('connected')
				break
			}
			case 'DISCONNECTED': {
				if (call.progress === 'DISCONNECTED') break
				setTimeout(
					() => ($calls = $calls.filter((c) => c.id !== call.id)),
					$config.disconnected_timeout_ms
				)
				if (call.type === 'INBOUND' && $config.inbound_call_mode === 'DND') return
				$call_ids_active.length ? playSound('disconnected') : playSound('done')
				break
			}
		}
	})

	// Bot
	const bot = new BotBtnClient(ac)
	bot.src.connect(gin_i_bot)
	src_o_bot.connect(bot.dst)

	let bot_state: BotButtonClientState = 'INITIAL'
	let bot_running = false
	let bot_connected = false
	let bot_btn_blink_on = false
	let bot_btn_blink_interval = 0
	let bot_btn_color_on: ColorsBtn = 'blue'
	let bot_btn_color_off: ColorsBtn = 'mono'
	$: bot_btn_color = { on: bot_btn_color_on, off: bot_btn_color_off }

	const botBtnBlink = () => (bot_btn_color_on = bot_btn_color_on === 'mono' ? 'blue' : 'mono')

	// TODO: Stop user media access when bot connects on mobile browsers. Restart when bot disconnects.
	let bot_sounds_playing_count = 0
	$: speaking = bot_sounds_playing_count > 0 || (!$config.muted_out && !!$call_ids_connected.length)
	$: if (speaking) bot.update({ speaking: true })
	else setTimeout(() => speaking || bot.update({ speaking: false }), 125)

	$: calls_connected = !!$call_ids_connected.length
	$: bot.setPresence({
		status:
			bot_connected && calls_connected ? PresenceUpdateStatus.Online : PresenceUpdateStatus.Idle
	})

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

	async function getMedia() {
		console.info('Getting Media')

		if (!interaction && 'chrome' in window) {
			alert_dialog_issue = 'interaction'
			return false
		}

		const got_user_media = await user_media_manager.start()
		if (!got_user_media) {
			alert_dialog_issue = 'media'
			return false
		}

		await audio_browser.play()
		if (ac.state === 'suspended') await ac.resume()

		alert_dialog_issue = undefined
		return true
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

		console.info('Loading Sounds')

		const loaded_sounds_browser = await SoundPlayer.load({
			ring_in: $config.sound_browser_ring_in,
			ring_out: $config.sound_browser_ring_out,
			connected: $config.sound_browser_connected,
			disconnected: $config.sound_browser_disconnected,
			auto_answered: $config.sound_browser_auto_answered,
			done: $config.sound_browser_done
		})

		const loaded_sounds_bot = await SoundPlayer.load({
			ring_in: $config.sound_bot_ring_in,
			ring_out: $config.sound_bot_ring_out,
			connected: $config.sound_bot_connected,
			disconnected: $config.sound_bot_disconnected,
			auto_answered: $config.sound_bot_auto_answered,
			done: $config.sound_bot_done
		})

		const loaded_sounds_conf = await SoundPlayer.load({
			connected: $config.sound_conf_connected,
			disconnected: $config.sound_conf_disconnected
		})

		player_browser.loadSounds(loaded_sounds_browser)
		player_bot.loadSounds(loaded_sounds_bot)
		player_conf.loadSounds(loaded_sounds_conf)

		const profile = $config.cfg_sip_profiles[0]

		if (profile) {
			await phone.addProfile({
				id: profile.id,
				sip_server: profile.sip_server,
				username: profile.username,
				login: profile.login ? profile.login : undefined,
				password: profile.password ? profile.password : undefined,
				register: profile.register
			})
		}

		if ($config.cfg_discord_profiles[0].bot_token && $config.bot_discord_autostart) {
			bot.init({
				token: $config.cfg_discord_profiles[0].bot_token,
				debug: $config.bot_discord_debug_enabled
			})
		}

		initiated = true
		console.info('Initiated')
	}

	onMount(init)
	window.onbeforeunload = () => {
		if ($call_ids_active.length) return false
	}

	/* Toggles */

	// users often try enabling DND to stop inbound ringing
	subscribeKey(config, 'inbound_call_mode', (v) => v !== 'DND' || stopRingIn?.())

	subscribeKey(config, 'conference_enabled', (v) => {
		const ids = !v ? [] : $calls.map((c) => c.id)
		phone.conference({ ids })
	})

	let muted_in_previously = $config.muted_in
	subscribeKey(config, 'mute_on_deafen', () => {
		if (!$config.muted_out) return
		muted_in_previously = $config.muted_in
		$config.muted_in = true
	})
	subscribeKey(config, 'muted_in', () => {
		if (!$config.mute_on_deafen) return
		if ($config.muted_in) return
		muted_in_previously = false
		$config.muted_out = false
	})
	subscribeKey(config, 'muted_out', () => {
		if (!$config.mute_on_deafen) return
		if ($config.muted_out) {
			muted_in_previously = $config.muted_in
			$config.muted_in = true
		} else {
			$config.muted_in = muted_in_previously
		}
	})

	subscribeKey(config, 'muted_in', (v) => bot.update({ self_deaf: v }))
	subscribeKey(config, 'muted_out', (v) => bot.update({ self_mute: v }))
	subscribeKey(config, 'bot_discord_follow_mode_enabled', (v) =>
		bot.setFollowMode({ mode: v, user_id: $config.cfg_discord_profiles[0].usr_user_id })
	)
</script>

<Dialog open={!!alert_dialog_issue} closable={false} role="alertdialog">
	<div class="flex flex-col gap-6">
		<span class="font-medium text-lg">
			{#if alert_dialog_issue === 'webrtc'}
				DisPhone requires WebRTC to function. Please enable WebRTC and try again.
			{:else if alert_dialog_issue === 'media'}
				DisPhone requires media access to function. Please unblock access and try again.
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

<div class="flex flex-col gap-4 max-sm:flex-col-reverse grow">
	<div class="flex flex-col gap-y-4 gap-x-2 flex-wrap max-sm:flex-col-reverse">
		<div class="flex gap-2 flex-wrap max-sm:flex-wrap-reverse">
			<div class="flex gap-2 flex-wrap max-sm:grow">
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
						const input = $config.cfg_sip_profiles[0].voicemail_number || vm_dest
						phone.dial({ profile_id: $config.cfg_sip_profiles[0].id, input })
					}}
					icon={IconRecordMail}
					color={vm_qty ? 'red' : 'mono'}
					disabled={!vm_dest}
				/>
			</div>

			<ProfileSelector />

			<div class="flex gap-2 flex-wrap max-sm:grow">
				{#if bot_running || ($config.cfg_discord_profiles[0]?.usr_user_id && $config.cfg_discord_profiles[0]?.bot_token)}
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
									token: $config.cfg_discord_profiles[0].bot_token,
									debug: $config.bot_discord_debug_enabled
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

	<div
		class="
			flex grow gap-2
			{$config.window_mode_enabled ? 'min-h-[166px] max-h-[448px] basis-full' : ' h-[166px]'}
			"
	>
		<CallDisplay />
		{#if $config.dialpad_enabled}
			<div class="max-sm:hidden">
				<Dialpad />
			</div>
		{/if}
		<div class="flex flex-col gap-2">
			<div class="flex gap-2 h-full">
				{#if bot_connected}
					<div class="flex {$config.level_selected === 'IN' ? 'max-[340px]:hidden' : ''}">
						<Level
							bind:muted={$config.muted_in}
							bind:value={$config.level_in}
							tip={{ on: 'Undeafen', off: 'Deafen' }}
							icon={{ on: IconHeadphonesOff, off: IconHeadphones }}
							color="blue"
						/>
					</div>
					<div class="flex {$config.level_selected === 'OUT' ? 'max-[340px]:hidden' : ''}">
						<Level
							bind:muted={$config.muted_out}
							bind:value={$config.level_out}
							tip={{ on: 'Unmute', off: 'Mute' }}
							icon={{ on: IconMicrophoneOff, off: IconMicrophone }}
							color="blue"
						/>
					</div>
				{:else}
					<div class="flex {$config.level_selected === 'IN' ? 'max-[340px]:hidden' : ''}">
						<Level
							bind:muted={$config.muted_in}
							bind:value={$config.level_in}
							tip={{ on: 'Unmute', off: 'Mute' }}
							icon={{ on: IconMicrophoneOff, off: IconMicrophone }}
						/>
					</div>
					<div class="flex {$config.level_selected === 'OUT' ? 'max-[340px]:hidden' : ''}">
						<Level
							bind:muted={$config.muted_out}
							bind:value={$config.level_out}
							tip={{ on: 'Undeafen', off: 'Deafen' }}
							icon={{ on: IconHeadphonesOff, off: IconHeadphones }}
						/>
					</div>
				{/if}
			</div>
			<div class="max-[340px]:flex hidden grow">
				<Toggle
					on:toggle={() =>
						($config.level_selected = $config.level_selected === 'IN' ? 'OUT' : 'IN')}
					tip="Switch Level"
					value={$config.level_selected === 'IN'}
					icon={IconSwitchHorizontal}
				/>
			</div>
		</div>
	</div>
	{#if $config.secondary_panel_enabled}
		<SecondaryPanel />
	{/if}
</div>
