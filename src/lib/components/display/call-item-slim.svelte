<script lang="ts">
	import { calls, type CallItem } from '$lib/stores/state.volitile'
	import {
		IconHeadphonesOff,
		IconMicrophoneOff,
		IconPlayerPause,
		IconRepeat
	} from '@tabler/icons-svelte'
	import CallControls from './call-controls.svelte'

	export let time: string
	export let call: CallItem
	export let style: { default_text: string; icon: Componenet; classes: string }
</script>

<button
	on:mouseup={(e) => e.button !== 1 || (call.selected = !call.selected)}
	on:click={(e) => {
		const selected_calls = $calls.filter((c) => c.selected).length
		if (e.ctrlKey || (selected_calls === 1 && call.selected)) call.selected = !call.selected
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
        min-w-[500px] grow
        group flex items-center gap-x-2 pl-0.5 py-0.5 h-7 border-2 border-opacity-0
        rounded-[3px] transition duration-[50ms] bg-opacity-20 hover:bg-opacity-30
		{call.selected ? '!bg-opacity-30 !border-opacity-80' : ''} {style.classes}
        "
>
	<div class="min-w-[24px] flex justify-center">
		<svelte:component this={style.icon} size={18} />
	</div>
	<div
		class="grow w-full text-left font-medium overflow-hidden whitespace-nowrap overflow-ellipsis"
	>
		{call.selected ? call.destination : call.identity || call.destination || ''}
	</div>
	<div class="min-w-[62px] text-left">{time}</div>
	<div
		class="
			w-full max-w-44 flex items-center gap-2 justify-end grow
			group-hover:invisible group-focus:invisible group-focus-within:invisible
			"
	>
		{#if call.progress !== 'DISCONNECTED'}
			<div class="flex items-center gap-1">
				{#if call.muted}<IconMicrophoneOff size={16} />{/if}
				{#if call.deafened}<IconHeadphonesOff size={16} />{/if}
				{#if call.auto_redialing}<IconRepeat size={16} />{/if}
				{#if call.on_hold}<IconPlayerPause size={16} />{/if}
			</div>
		{/if}
		<span class="overflow-hidden whitespace-nowrap overflow-ellipsis">
			{call.reason || style.default_text}
		</span>
	</div>
	<div class="ml-auto relative w-0">
		<button
			tabindex="0"
			class="
				absolute right-[1.5px] gap-[1px] -translate-y-1/2 backdrop-blur-xl rounded-[3px]
				hidden group-focus-within:block group-focus:block group-hover:block
				"
		>
			<CallControls bind:call />
		</button>
	</div>
</button>
