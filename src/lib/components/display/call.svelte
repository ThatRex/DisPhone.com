<script lang="ts">
	import { calls, type CallItem, dial_string } from '$lib/stores/state.volitile'
	import {
		IconBellRinging2,
		IconHeadphones,
		IconHeadphonesOff,
		IconMicrophone,
		IconMicrophoneOff,
		IconPhone,
		IconPhoneCalling,
		IconPhoneIncoming,
		IconPhoneOutgoing,
		IconPlayerPause,
		IconPlayerPlay,
		IconPlugConnectedX,
		IconRepeat,
		IconRepeatOff,
		IconTransfer,
		IconX
	} from '@tabler/icons-svelte'
	import { getContext, onDestroy, onMount } from 'svelte'
	import CallButton from './call-button.svelte'
	import type Manager from '$lib/phone-client/manager'
	import { config } from '$lib/stores/state.persistent'

	export let call: CallItem
	const phone = getContext<Manager>('phone')

	$: style = ((): { default_text: string; icon: Componenet; classes: string } => {
		switch (true) {
			case call.progress === 'DISCONNECTED': {
				return {
					default_text: 'Disconnected',
					icon: IconPlugConnectedX,
					classes: 'bg-red-500 border-red-500'
				}
			}
			case call.type === 'INBOUND' && call.progress === 'CONNECTED': {
				return {
					default_text: 'Connected',
					icon: IconPhoneIncoming,
					classes: 'bg-green-500 border-green-500'
				}
			}
			case call.type === 'OUTBOUND' && call.progress === 'CONNECTED': {
				return {
					default_text: 'Connected',
					icon: IconPhoneOutgoing,
					classes: 'bg-green-500 border-green-500'
				}
			}
			case call.type === 'INBOUND' && call.progress === 'CONNECTING': {
				return {
					default_text: 'Ringing',
					icon: IconBellRinging2,
					classes: 'bg-yellow-500 border-yellow-500'
				}
			}
			default: {
				return {
					default_text: call.progress === 'WAITING' ? 'Waiting' : 'Calling',
					icon: IconPhoneCalling,
					classes: 'bg-blue-500 border-blue-500'
				}
			}
		}
	})()

	let time = '00:00'
	let interval = 0
	onMount(() => {
		interval = setInterval(() => {
			if (call.progress === 'DISCONNECTED') return
			const start_time = call.start_time
			if (start_time === 0) return (time = '00:00')
			const current_time = Date.now()
			const elapsed_time = current_time - start_time
			const minutes = Math.floor(elapsed_time / (1000 * 60))
			const seconds = Math.floor((elapsed_time / 1000) % 60)
			time = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
		}, 1000)
	})
	onDestroy(() => clearInterval(interval))
</script>

<button
	on:click={(e) => {
		if (e.ctrlKey) call.selected = !call.selected
		else {
			$calls = $calls.map((c) => {
				c.selected = c.id === call.id
				return c
			})
		}
	}}
	type="button"
	aria-pressed={call.selected}
	class="
        min-w-[500px]
        group flex items-center gap-x-2 pl-0.5 py-0.5 h-7 border-2 border-opacity-0
        rounded-[3px] transition duration-[50ms] bg-opacity-20 hover:bg-opacity-30
		{call.selected ? '!bg-opacity-30 !border-opacity-80' : ''} {style.classes}
        "
>
	<div class="min-w-[24px] flex justify-center">
		<svelte:component this={style.icon} size={18}></svelte:component>
	</div>
	<div class="min-w-[130px] max-w-[130px] overflow-hidden overflow-ellipsis font-medium text-left">
		{call.identity || call.destination || ''}
	</div>
	<div class="min-w-[130px] max-w-[130px] overflow-hidden overflow-ellipsis text-left">
		{call.identity ? call.destination : ''}
	</div>
	<div class="min-w-[40px] text-left">{time}</div>
	<div
		class="flex items-center gap-2 justify-end grow group-hover:hidden group-focus:hidden group-focus-within:hidden"
	>
		{#if call.progress !== 'DISCONNECTED'}
			<div class="flex items-center gap-1">
				{#if call.muted}<IconMicrophoneOff size={16} />{/if}
				{#if call.deafened}<IconHeadphonesOff size={16} />{/if}
				{#if call.auto_redialing}<IconRepeat size={16} />{/if}
				{#if call.on_hold}<IconPlayerPause size={16} />{/if}
			</div>
		{/if}
		<span>
			{call.reason || style.default_text}
		</span>
	</div>
	<div class="ml-auto relative w-0">
		<button
			tabindex="0"
			class="
				absolute right-[1.5px] gap-[1px] -translate-y-1/2 backdrop-blur-xl rounded-[3px]
				hidden group-focus-within:flex group-focus:flex group-hover:flex
				"
		>
			{#if call.progress !== 'DISCONNECTED'}
				<CallButton
					tip={call.muted ? 'Unmute' : 'Mute'}
					icon={call.muted ? IconMicrophoneOff : IconMicrophone}
					on:trigger={() => phone.setMute({ ids: [call.id], value: !call.muted })}
				/>
				<CallButton
					tip={call.deafened ? 'Undeafen' : 'Deafen'}
					icon={call.deafened ? IconHeadphonesOff : IconHeadphones}
					on:trigger={() => phone.setDeaf({ ids: [call.id], value: !call.deafened })}
				/>
				{#if call.auto_redialing || $config.cfg_auto_redial_enabled}
					<CallButton
						tip={call.auto_redialing ? 'Stop Auto Redial' : 'Start Auto Redial'}
						icon={call.auto_redialing ? IconRepeat : IconRepeatOff}
						on:trigger={() => phone.setAutoRedial({ ids: [call.id], value: !call.auto_redialing })}
					/>
				{/if}
			{/if}
			{#if call.type === 'INBOUND' && call.progress === 'CONNECTING'}
				<CallButton
					tip="Answer"
					icon={IconPhone}
					on:trigger={() => phone.answer({ ids: [call.id] })}
				/>
			{:else if call.progress === 'CONNECTED'}
				<CallButton
					tip={call.on_hold ? 'Unhold' : 'Hold'}
					icon={call.on_hold ? IconPlayerPause : IconPlayerPlay}
					on:trigger={() => phone.setHold({ ids: [call.id], value: !call.on_hold })}
				/>
			{/if}
			{#if (call.type === 'INBOUND' && call.progress === 'CONNECTING') || call.progress === 'CONNECTED'}
				<CallButton
					tip="Transfer"
					icon={IconTransfer}
					disabled={!$dial_string}
					on:trigger={() =>
						phone.transfer({ ids: [call.id], destination: $dial_string.replace(/\s/, '') })}
				/>
			{/if}
			<CallButton
				tip={call.progress === 'DISCONNECTED' ? 'Close' : 'Hangup'}
				icon={IconX}
				on:trigger={() => {
					if (call.progress === 'DISCONNECTED') call.hidden = true
					else phone.hangup({ ids: [call.id] })
				}}
			/>
		</button>
	</div>
</button>
