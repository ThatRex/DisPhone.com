<script lang="ts">
	import { type CallItem, calls } from '$lib/stores/state.volitile'
	import {
		IconBellRinging2,
		IconPhoneCalling,
		IconPhoneIncoming,
		IconPhoneOutgoing,
		IconPlugConnected
	} from '@tabler/icons-svelte'
	import { onDestroy, onMount } from 'svelte'
	import { config } from '$lib/stores/state.persistent'
	import CallItemDefault from './call-item-default.svelte'
	import CallItemSlim from './call-item-slim.svelte'

	export let call: CallItem
	export let height_display: number

	$: style = ((): { default_text: string; icon: Componenet; classes: string } => {
		switch (true) {
			case call.progress === 'DISCONNECTED': {
				return {
					default_text: 'Disconnected',
					icon: IconPlugConnected,
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

	let time = '0:00:00'
	let interval = 0
	onDestroy(() => clearInterval(interval))
	onMount(() => {
		interval = setInterval(() => {
			if (call.progress === 'DISCONNECTED') return

			const start_time = call.start_time
			const current_time = Date.now()
			if (start_time === 0) return (time = '0:00:00')

			const elapsed_or_remaining_time =
				start_time > current_time ? start_time - current_time : current_time - start_time

			const hours = Math.floor(elapsed_or_remaining_time / (1000 * 60 * 60))
			const minutes = Math.floor((elapsed_or_remaining_time / (1000 * 60)) % 60)
			const seconds = Math.floor((elapsed_or_remaining_time / 1000) % 60)

			time = `${hours.toString()}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
		}, 1000)
	})

	$: height_call_compact = ($config.dialpad_enabled && $config.dialpad_extended ? 60 : 56) + 4.8
	$: always_compact = height_display >= height_call_compact * $calls.length
</script>

<div class="flex {always_compact ? 'hidden' : 'call-slim'}">
	<CallItemSlim bind:call bind:time bind:style />
</div>
<div class="flex {always_compact ? '' : 'call-default'} ">
	<CallItemDefault bind:call bind:time bind:style />
</div>

<style>
	@container (width <= 520px) {
		.call-slim {
			display: none;
		}
	}

	@container (width > 520px) {
		.call-default {
			display: none;
		}
	}
</style>
