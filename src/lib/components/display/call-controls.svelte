<script lang="ts">
	import type Manager from '$lib/phone-client/manager'
	import { dial_string, type CallItem } from '$lib/stores/state.volitile'
	import { getContext } from 'svelte'
	import CallButton from './call-button.svelte'
	import {
		IconCopy,
		IconHeadphones,
		IconHeadphonesOff,
		IconMicrophone,
		IconMicrophoneOff,
		IconPhone,
		IconPlayerPause,
		IconPlayerPlay,
		IconRepeat,
		IconRepeatOff,
		IconTransfer,
		IconX
	} from '@tabler/icons-svelte'
	import { config } from '$lib/stores/state.persistent'

	export let call: CallItem
	const phone = getContext<Manager>('phone')
</script>

<div class="flex">
	<CallButton
		tip="Copy Destination"
		icon={IconCopy}
		on:trigger={() => !call.destination || navigator.clipboard.writeText?.(call.destination)}
	/>
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
		<CallButton tip="Answer" icon={IconPhone} on:trigger={() => phone.answer({ ids: [call.id] })} />
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
</div>
