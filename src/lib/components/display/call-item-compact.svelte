<script lang="ts">
	import { config } from '$lib/stores/state.persistent'
	import { calls, type CallItem } from '$lib/stores/state.volitile'
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
		{$config.tgl_dialpad && $config.cfg_dialpad_extended
		? 'h-[60px] pt-0.5'
		: 'h-[56px]'} max-sm:h-[56px] max-sm:pt-0
		min-w-[222px] flex flex-col grow gap-0.5 px-0.5 border-2 border-opacity-0
        rounded-[3px] transition duration-[50ms] bg-opacity-20 hover:bg-opacity-30
		{call.selected ? '!bg-opacity-30 !border-opacity-80' : ''} {style.classes}
        "
>
	<div class="flex justify-between items-center w-full gap-x-1.5">
		<div class="min-w-[24px] flex justify-center">
			<svelte:component this={style.icon} size={18} />
		</div>
		<div class="font-medium text-left overflow-hidden whitespace-nowrap overflow-ellipsis">
			{call.selected ? call.destination : call.identity || call.destination || ''}
		</div>
		<div class="text-right grow mr-1 font-medium whitespace-nowrap text-nowrap">
			{time}
		</div>
	</div>
	<div class="flex grow justify-between items-center gap-x-1">
		<div class="ml-1 text-left overflow-hidden whitespace-nowrap overflow-ellipsis">
			{call.reason || style.default_text}
		</div>
		<CallControls bind:call />
	</div>
</button>
