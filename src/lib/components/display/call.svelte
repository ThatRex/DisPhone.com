<script lang="ts">
	import { type CallItem, calls, call_ids_selected } from '$lib/stores/calls.volitile'
	import {
		IconBellRinging2,
		IconPhoneCalling,
		IconPhoneIncoming,
		IconPhoneOutgoing,
		IconPlugConnected
	} from '@tabler/icons-svelte'
	import { onDestroy, onMount } from 'svelte'
	import { config } from '$lib/stores/config.persistent'
	import CallItemDefault from './call-item-default.svelte'
	import CallItemSlim from './call-item-slim.svelte'

	export let index: number
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

	$: height_call_compact = ($config.dialpad_enabled && $config.dialpad_extended ? 60 : 56) + 4
	$: not_slim = height_display >= height_call_compact * $calls.length + 4

	const handleMouseUp = (e: MouseEvent) => e.button !== 1 || (call.selected = !call.selected)
	const handleClick = (e: MouseEvent) => {
		if (e.ctrlKey || ($call_ids_selected.length === 1 && call.selected)) {
			call.selected = !call.selected
		} else {
			$calls = $calls.map((c) => {
				c.selected = c.id === call.id
				return c
			})
		}
	}
	const handleKeydown = ({ key, shiftKey }: KeyboardEvent) => {
		switch (true) {
			case key === 'ArrowUp' || key === 'ArrowDown': {
				const direction = key === 'ArrowUp' ? 'up' : 'down'
				const next_idx = direction === 'up' ? index - 1 : index + 1
				const next_call = $calls[next_idx]

				if (next_call && shiftKey) {
					next_call.selected = true
					$calls = $calls
				}

				if (!shiftKey) {
					$calls = $calls.map((c) => {
						c.selected = c.id === (next_call?.id || call.id)
						return c
					})
				}

				document.getElementById(`call-item-${next_call?.id || call.id}`)?.focus()
				break
			}

			case key === 'a': {
				$calls = $calls.map((c) => {
					c.selected = true
					return c
				})
				break
			}
		}
	}
</script>

<button
	class="group ring-0 outline-none"
	type="button"
	aria-pressed={call.selected}
	id="call-item-{call.id}"
	on:click={handleClick}
	on:mouseup={handleMouseUp}
	on:keydown={handleKeydown}
>
	<div class="flex {not_slim ? 'hidden' : 'call-slim'}">
		<CallItemSlim bind:call bind:time bind:style />
	</div>
	<div class="flex {not_slim ? '' : 'call-default'} ">
		<CallItemDefault bind:call bind:time bind:style />
	</div>
</button>

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
