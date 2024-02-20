<script lang="ts">
	import Button from '$lib/components/core/button.svelte'
	import ProfileSelector from '$lib/components/profile-selector.svelte'
	import Toggle from '$lib/components/core/toggle.svelte'
	import Panel from '$lib/components/core/panel.svelte'
	import {
		IconBellOff,
		IconBellRinging,
		IconDialpad,
		IconDialpadOff,
		IconLayoutBottombarCollapse,
		IconLayoutBottombarExpandFilled,
		IconPhoneIncoming,
		IconRecordMail,
		IconUsersGroup,
		IconMicrophone,
		IconMicrophoneOff,
		IconHeadphones,
		IconHeadphonesOff
	} from '@tabler/icons-svelte'
	import Group from '$lib/components/core/group.svelte'
	import CallDisplay from '$lib/components/display/display.svelte'
	import DialPanel from '$lib/components/dial-panel.svelte'
	import SecondaryPanel from '$lib/components/secondary-panel/secondary-panel.svelte'
	import Dialpad from '$lib/components/dialpad.svelte'
	import { version } from '$app/environment'
	import { config } from '$lib/stores/state.persistent'
	import ToggleMulti from '$lib/components/core/toggle-multi.svelte'
	import { getUserMedia, subscribeKey, DTMFSimulator, AudioPlayer, noop } from '$lib/utils'
	import { onMount, setContext } from 'svelte'
	import { addActiveKey, calls } from '$lib/stores/state.volitile'
	import Dialog from '$lib/components/core/dialog.svelte'
	import ButtonText from '$lib/components/core/button-text.svelte'
	import DiscordBotBtn from '$lib/components/discord-bot-btn.svelte'
	import Manager from '$lib/phone-client/manager'
	import Level from '$lib/components/core/level.svelte'

	const player = new AudioPlayer()
	const phone = new Manager({ debug: $config.cfg_debug_enabled })
	setContext('phone', phone)

	let stop_ringger_out: undefined | (() => void)
	let stop_ringger_in: undefined | (() => void)

	phone.on('call-update', (cu) => {
		const getCallIdx = () => $calls.findIndex((c) => c.id === cu.id)
		const initial_call_idx = getCallIdx()

		if (initial_call_idx === -1) {
			const ids = !$config.tgl_auto_conference ? [] : $calls.map((c) => c.id)
			phone.conference({ ids })

			const hidden = cu.type === 'INBOUND' && $config.tgl_call_response_mode === 'DND'
			const selected = !$calls.filter((c) => c.selected).length
			$calls.push({ ...cu, selected, hidden })
			$calls = $calls

			if (cu.type !== 'INBOUND') return

			switch ($config.tgl_call_response_mode) {
				case 'AA': {
					setTimeout(() => {
						const call = $calls[getCallIdx()]
						if (!call || call.progress !== 'CONNECTING') return
						phone.answer({ ids: [cu.id] })
					}, $config.cfg_auto_answer_delay_ms)
					break
				}

				case 'DND': {
					phone.hangup({ ids: [cu.id] })
					break
				}

				case 'RNG': {
					if (stop_ringger_in) break
					const url = $config.snd_ringing_in
					stop_ringger_in = player.play({ url, loop: true, volume: 50 })
					break
				}
			}

			return
		}

		const call = $calls[initial_call_idx]

		if (call.progress === 'CONNECTED' && cu.progress === 'WAITING') {
			player.play({ url: $config.snd_disconnected_one })
		}

		const hidden =
			call.progress === 'DISCONNECTED' && cu.progress !== 'DISCONNECTED' ? false : call.hidden
		$calls[initial_call_idx] = { ...call, ...cu, hidden }

		const calls_inbound_connecting = $calls.filter((c) => {
			return c.progress === 'CONNECTING' && c.type === 'INBOUND'
		}).length
		if (!calls_inbound_connecting) {
			stop_ringger_in?.()
			stop_ringger_in = undefined
		}

		const calls_connecting = $calls.filter((c) => c.progress === 'CONNECTING').length

		switch (cu.progress) {
			case 'CONNECTING': {
				if (!stop_ringger_out) {
					const url = $config.snd_ringing_out
					stop_ringger_out = player.play({ url, volume: 50, loop: true })
				}
				break
			}
			case 'CONNECTED': {
				if (!calls_connecting && stop_ringger_out) {
					stop_ringger_out()
					stop_ringger_out = undefined
				}
				if (call.progress === 'CONNECTED') break
				const url =
					call.type === 'INBOUND' && $config.tgl_call_response_mode === 'AA'
						? $config.snd_auto_answer
						: $config.snd_connected_one
				player.play({ url })
				break
			}
			case 'DISCONNECTED': {
				if (!calls_connecting && stop_ringger_out) {
					stop_ringger_out()
					stop_ringger_out = undefined
				}
				if (call.progress === 'DISCONNECTED') break
				setTimeout(() => ($calls = $calls.filter((c) => c.id !== call.id)), 2500)
				if (call.type === 'INBOUND' && $config.tgl_call_response_mode === 'DND') return
				const calls_active = $calls.filter((c) => c.progress !== 'DISCONNECTED').length
				const url = calls_active ? $config.snd_disconnected_one : $config.snd_disconnected
				player.play({ url })
				break
			}
		}
	})

	subscribeKey(config, 'tgl_auto_conference', (v) => {
		const ids = !v ? [] : $calls.map((c) => c.id)
		phone.conference({ ids })
	})

	let dtmf_sim: DTMFSimulator
	$: dsim = $config.cfg_simulate_dtmf ? dtmf_sim : undefined

	phone.on('dtmf', (dtmf) => {
		addActiveKey(dtmf)
		dsim?.press(dtmf)
	})

	let voicemail_qty = 0
	let voicemial_dest = ''

	phone.on('profile-update', (pu) => {
		voicemail_qty = pu.voicemail_qty
		voicemial_dest = pu.voicemail_dest
	})

	let initiated = false
	let alert_dialog_issue: 'media' | 'webrtc' | undefined
	let bot_running: boolean
	let bot_connected: boolean

	let ac: AudioContext

	let sounds_source: MediaStreamAudioSourceNode

	let phone_dst_i: MediaStreamAudioDestinationNode
	let phone_dst_o: MediaStreamAudioDestinationNode

	let browser_dst_i: MediaStreamAudioDestinationNode
	let browser_dst_o: MediaStreamAudioDestinationNode
	let bot_dst_i: MediaStreamAudioDestinationNode
	let bot_dst_o: MediaStreamAudioDestinationNode

	let browser_gin_i: GainNode
	let browser_gin_o: GainNode
	let bot_gin_i: GainNode
	let bot_gin_o: GainNode

	$: (() => {
		if (!browser_gin_i) return
		if (!browser_gin_o) return
		browser_gin_i.gain.value = !$config.tgl_muted && !bot_connected ? $config.lvl_in / 100 : 0
		browser_gin_o.gain.value = !$config.tgl_deafened && !bot_connected ? $config.lvl_out / 100 : 0
	})()

	$: (() => {
		if (!bot_gin_i) return
		if (!bot_gin_o) return
		bot_gin_i.gain.value = !$config.tgl_deafened && bot_connected ? $config.lvl_out / 100 : 0
		bot_gin_o.gain.value = !$config.tgl_muted && bot_connected ? $config.lvl_in / 100 : 0
	})()

	$: (() => {
		if (!sounds_source) return
		if (!bot_dst_i) return
		if (!browser_dst_i) return

		try {
			sounds_source.connect(bot_connected ? bot_dst_i : browser_dst_o)
		} catch {
			noop()
		}
		try {
			sounds_source.disconnect(!bot_connected ? bot_dst_i : browser_dst_o)
		} catch {
			noop()
		}
	})()

	const init = async () => {
		if (initiated) return

		console.info('Initiating')

		if (!window.RTCPeerConnection) {
			alert_dialog_issue = 'webrtc'
			return
		}

		let browser_stream_i: MediaStream

		try {
			browser_stream_i = await getUserMedia({ audio: true }, true)
			alert_dialog_issue = undefined
		} catch {
			alert_dialog_issue = 'media'
			return
		}

		ac = new AudioContext()

		sounds_source = ac.createMediaStreamSource(player.stream)

		phone_dst_i = ac.createMediaStreamDestination()
		phone_dst_o = ac.createMediaStreamDestination()

		browser_dst_i = ac.createMediaStreamDestination()
		browser_dst_o = ac.createMediaStreamDestination()
		browser_gin_i = ac.createGain()
		browser_gin_o = ac.createGain()
		ac.createMediaStreamSource(browser_stream_i).connect(browser_gin_i)

		browser_gin_i.connect(browser_dst_i)
		ac.createMediaStreamSource(browser_dst_i.stream).connect(phone_dst_i)
		ac.createMediaStreamSource(phone_dst_o.stream).connect(browser_gin_o).connect(browser_dst_o)

		bot_dst_i = ac.createMediaStreamDestination()
		bot_dst_o = ac.createMediaStreamDestination()
		bot_gin_i = ac.createGain()
		bot_gin_o = ac.createGain()

		ac.createMediaStreamSource(bot_dst_o.stream).connect(phone_dst_i)
		ac.createMediaStreamSource(phone_dst_o.stream).connect(bot_gin_i).connect(bot_dst_i)
		bot_gin_o.connect(bot_dst_o)

		dtmf_sim = new DTMFSimulator()
		const dtmf_gin = ac.createGain()
		dtmf_gin.gain.value = 0.1
		dtmf_gin.connect(browser_dst_o)
		ac.createMediaStreamSource(dtmf_sim.stream).connect(dtmf_gin)

		phone.stream_i = phone_dst_i.stream
		ac.createMediaStreamSource(phone.stream_o).connect(phone_dst_o)

		const a = new Audio()
		a.srcObject = browser_dst_o.stream
		await a.play()

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

		initiated = true
	}

	onMount(init)

	window.onbeforeunload = () => {
		if ($calls.length) return confirm()
	}
</script>

<Dialog open={!!alert_dialog_issue} closable={false} role="alertdialog">
	<div class="flex flex-col gap-6">
		<span class="font-medium text-lg">
			DisPhone requires
			{#if alert_dialog_issue === 'webrtc'}
				WebRTC to function. Please enable WebRTC and try again.
			{:else}
				media access to function. Please unblock access and try again.
			{/if}
		</span>
		<ButtonText
			on:click={() => {
				if (alert_dialog_issue === 'webrtc') location.reload()
				else init()
			}}
			label="Try Again"
		/>
	</div>
</Dialog>

<Panel>
	<div class="flex flex-col gap-4 max-sm:flex-col-reverse">
		<div class="flex gap-2 flex-wrap max-sm:flex-wrap-reverse">
			<div class="flex gap-2 flex-wrap max-sm:grow">
				<Toggle
					bind:value={$config.tgl_secondary_panel}
					tip="Secondary Panel"
					icon={{
						on: IconLayoutBottombarExpandFilled,
						off: IconLayoutBottombarCollapse
					}}
				/>
				<div class="flex grow max-sm:hidden">
					<Toggle
						bind:value={$config.tgl_dialpad}
						tip="Dialpad"
						icon={{ on: IconDialpad, off: IconDialpadOff }}
					/>
				</div>
				<Button
					tip="{voicemail_qty} {voicemail_qty === 1 ? 'Voicemail' : 'Voicemails'}"
					on:trigger={() =>
						phone.dial({ profile_id: $config.cfg_sip_profiles[0].id, input: voicemial_dest })}
					icon={IconRecordMail}
					color={voicemail_qty ? 'red' : 'mono'}
					disabled={!voicemial_dest}
				/>
			</div>

			<ProfileSelector
				on:new={() => {
					$config.tab_secondary_panel = 'config'
					$config.tab_secondary_panel_config = 'phone'
					$config.tgl_secondary_panel = true
				}}
			/>

			<div class="flex gap-2 flex-wrap max-sm:grow">
				{#if bot_running || ($config.cfg_discord_profiles[0]?.usr_user_id && $config.cfg_discord_profiles[0]?.bot_token)}
					<DiscordBotBtn
						bind:connected={bot_connected}
						bind:running={bot_running}
						{ac}
						gin_o={bot_gin_o}
						dst_i={bot_dst_i}
					/>
				{/if}
				<ToggleMulti
					bind:value={$config.tgl_call_response_mode}
					modes={[
						{
							icon: IconBellRinging,
							tip: 'Ring',
							value: 'RNG'
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
					bind:value={$config.tgl_auto_conference}
					tip="Conference"
					icon={IconUsersGroup}
					color={{ on: 'yellow', off: 'mono' }}
				/>
			</div>
		</div>

		<Group>
			<DialPanel on:dtmf={(e) => dsim?.press(e.detail)} />
		</Group>

		<Group>
			{#if $config.tgl_dialpad}
				<div class="max-sm:hidden flex">
					<Dialpad on:dtmf={(e) => dsim?.press(e.detail)} />
				</div>
			{/if}
			<CallDisplay />
			<div class="flex gap-2">
				{#if bot_connected}
					<Level
						bind:muted={$config.tgl_deafened}
						bind:value={$config.lvl_out}
						tip={{ on: 'Unmute', off: 'Mute' }}
						icon={{ on: IconMicrophoneOff, off: IconMicrophone }}
					/>
					<Level
						bind:muted={$config.tgl_muted}
						bind:value={$config.lvl_in}
						tip={{ on: 'Undeafen', off: 'Deafen' }}
						icon={{ on: IconHeadphonesOff, off: IconHeadphones }}
					/>
				{:else}
					<Level
						bind:muted={$config.tgl_muted}
						bind:value={$config.lvl_in}
						tip={{ on: 'Unmute', off: 'Mute' }}
						icon={{ on: IconMicrophoneOff, off: IconMicrophone }}
					/>
					<Level
						bind:muted={$config.tgl_deafened}
						bind:value={$config.lvl_out}
						tip={{ on: 'Undeafen', off: 'Deafen' }}
						icon={{ on: IconHeadphonesOff, off: IconHeadphones }}
					/>
				{/if}
			</div>
		</Group>
	</div>

	{#if $config.tgl_secondary_panel}
		<SecondaryPanel />
	{/if}
</Panel>

<div class="flex justify-between flex-wrap gap-2 text-sm mx-4 my-1 max-sm:mt-2">
	<span class="font-bold flex gap-1">
		<a
			target="_blank"
			class="opacity-70 hover:opacity-100 hover:text-blue-500 transition"
			title="Looking to get started? Start here!"
			href="http://wiki.disphone.com"
		>
			Wiki
		</a>
		<span class="opacity-70"> • </span>
		<a
			target="_blank"
			class="opacity-70 hover:opacity-100 hover:text-yellow-500 transition"
			title="Your support is appreciated & motivates further development."
			href="http://donate.disphone.com"
		>
			Donate
		</a>
		<span class="opacity-70"> • </span>
		<a
			target="_blank"
			class="opacity-70 hover:opacity-100 hover:text-blue-500 transition"
			href="http://git.disphone.com"
		>
			GitHub
		</a>
		<span class="opacity-70"> • </span>
		<a
			target="_blank"
			class="opacity-70 hover:opacity-100 hover:text-emerald-500 transition"
			href="http://status.disphone.com"
		>
			Status
		</a>
	</span>
	<span class="font-semibold">
		<a
			target="_blank"
			class="opacity-70 hover:opacity-100 hover:text-lime-500 transition"
			href="https://github.com/ThatRex/DisPhone.com/blob/master/CHANGELOG.md"
		>
			v{version}
		</a>
		<span class="opacity-70"> • Proudly brought to you by </span>
		<a
			target="_blank"
			class="opacity-70 hover:opacity-100 hover:text-amber-500 transition"
			href="http://rexslab.com">RexsLab.com</a
		><span class="opacity-70">.</span>
	</span>
</div>
