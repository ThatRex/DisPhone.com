<script lang="ts">
	import { createEventDispatcher, type SvelteComponent } from 'svelte'
	import { createTooltip, melt } from '@melt-ui/svelte'
	import { fade } from 'svelte/transition'
	import { ColorsBtn } from './colors'

	type Component = typeof SvelteComponent<any, any, any>

	export let tip: string | { on: string; off: string } = ''
	export let tip_placement: 'top' | 'right' | 'bottom' | 'left' = 'top'
	export let icon: Component | { on: Component; off: Component }
	export let color: ColorsBtn | { on: ColorsBtn; off: ColorsBtn } = 'mono'
	export let value = false

	$: _tip = typeof tip === 'object' ? (value ? tip.on : tip.off) : tip
	$: _icon = typeof icon === 'object' ? (value ? icon.on : icon.off) : icon
	$: _color = typeof color === 'object' ? (value ? color.on : color.off) : color

	const {
		elements: { trigger, content },
		states: { open }
	} = createTooltip({
		positioning: { placement: tip_placement },
		openDelay: 350,
		closeDelay: 0,
		closeOnPointerDown: true,
		disableHoverableContent: true
	})
</script>

<div
	use:melt={$trigger}
	class="
		w-9 h-9 border-2 rounded-md transition duration-75
		grow flex items-center justify-center cursor-pointer
		!bg-opacity-10 {ColorsBtn[_color]}
        active:scale-95 hover:!bg-opacity-20 active:!bg-opacity-10
		{value ? '' : `!border-opacity-40`}
		"
>
	<svelte:component this={_icon} size={20} />
</div>

{#if $open}
	<div use:melt={$content} transition:fade={{ duration: 40 }} class="tooltip">
		{_tip}
	</div>
{/if}
