<script lang="ts">
	import { Client as PhoneClient } from '$lib/client-phone'
	import { removeCall, type CallItem } from '$lib/stores/calls.svelte'
	import { dial_string } from '$lib/stores/dial.svelte'
	import { getContext } from 'svelte'
	import CallButton from './call-button.svelte'
	import {
		IconArrowBackUp,
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
	import { state } from '$lib/stores/state.svelte'
	import { config } from '$lib/stores/config.svelte'

	$: ({
		auto_redial_delay_ms_min_max: delay_ms_min_max,
		auto_redial_max_sequential_failed_calls: max_sequential_failed_calls,
		auto_redial_short_call_duration_ms: short_call_duration_ms,
		hold_unselected_calls
	} = $config)
	$: ({ conference_enabled } = $state)

	export let call: CallItem
	const phone = getContext<PhoneClient>('phone')
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
	{/if}
	{#if call.progress === 'CONNECTED'}
		<CallButton
			tip={call.on_hold ? 'Unhold' : 'Hold'}
			icon={call.on_hold ? IconPlayerPause : IconPlayerPlay}
			on:trigger={() => phone.setHold({ ids: [call.id], value: !call.on_hold })}
			disabled={!conference_enabled && hold_unselected_calls}
		/>
	{/if}
	{#if !(call.type === 'INBOUND' && call.progress === 'CONNECTING') && call.progress !== 'DISCONNECTED' && (call.auto_redialing || $config.auto_redial_enabled)}
		<CallButton
			tip={call.auto_redialing ? 'Stop Auto Redial' : 'Auto Redial'}
			icon={call.auto_redialing ? IconRepeat : IconRepeatOff}
			on:trigger={() =>
				phone.setAutoRedial({
					ids: [call.id],
					value: !call.auto_redialing,
					delay_ms_min_max,
					max_sequential_failed_calls,
					short_call_duration_ms
				})}
		/>
	{/if}
	{#if !(call.type === 'INBOUND' && call.progress === 'CONNECTING')}
		<CallButton
			tip="Redial"
			icon={IconArrowBackUp}
			on:trigger={() =>
				!call.destination ||
				phone.dial({
					input: call.destination,
					profile_id: $config.sip_profiles[0].id
				})}
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
	{#if call.type === 'INBOUND' && call.progress === 'CONNECTING'}
		<CallButton tip="Answer" icon={IconPhone} on:trigger={() => phone.answer({ ids: [call.id] })} />
	{/if}
	<CallButton
		tip={call.progress === 'DISCONNECTED' ? 'Close' : 'Hangup'}
		icon={IconX}
		on:trigger={() => {
			if (call.progress === 'DISCONNECTED') removeCall(call.id)
			else phone.hangup({ ids: [call.id] })
		}}
	/>
</div>
