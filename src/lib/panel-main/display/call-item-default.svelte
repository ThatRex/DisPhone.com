<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import { type CallItem } from '$lib/stores/calls.volitile'
	import CallControls from './call-controls.svelte'

	export let time: string
	export let call: CallItem
	export let style: { default_text: string; icon: Component ; classes: string }
</script>

<div
	class="
		{$config.dialpad_enabled && $config.dialpad_extended ? 'h-[60px]' : 'h-[56px]'} max-xs:h-[56px]
		min-w-[200px] flex flex-col grow gap-0.5 px-0.5 border-2 border-opacity-0
        rounded-[3px] transition duration-[50ms] bg-opacity-20 hover:bg-opacity-30
		group-focus:bg-opacity-30
		{call.selected ? '!bg-opacity-30 !border-opacity-80' : ''} {style.classes} 
        "
>
	<div
		class="
			flex justify-between items-center w-full gap-x-1.5
			{$config.dialpad_enabled && $config.dialpad_extended ? 'mt-[2px]' : 'mt-[1px]'}
			"
	>
		<div class="min-w-[24px] flex justify-center">
			<svelte:component this={style.icon} size={18} />
		</div>
		<div class="font-medium text-left overflow-hidden whitespace-nowrap overflow-ellipsis">
			{call.selected && call.identity ? call.identity : call.destination || ''}
		</div>
		<div class="text-right grow mr-1 font-medium whitespace-nowrap text-nowrap">
			{time}
		</div>
	</div>
	<div class="flex grow justify-between items-center gap-x-1 w-full">
		<div class="ml-1 text-left overflow-hidden whitespace-nowrap overflow-ellipsis">
			{call.reason || style.default_text}
		</div>
		<CallControls bind:call />
	</div>
</div>
