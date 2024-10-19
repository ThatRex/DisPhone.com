<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { createTooltip, melt } from '@melt-ui/svelte'
	import { fade } from 'svelte/transition'
	import { ColorsBtn } from './colors'

	export let tip: string
	export let tip_placement: 'top' | 'right' | 'bottom' | 'left' = 'top'
	export let icon: Component
	export let color: ColorsBtn
	export let disabled = false

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

	const dispatch = createEventDispatcher()
</script>

<button
	on:mouseenter
	on:mouseleave
	on:pointerdown={() => navigator.vibrate?.(6)}
	on:mouseup={(e) => {
		if (disabled) return
		dispatch('trigger', e.button)
	}}
	on:keydown={({ repeat, key, ctrlKey, shiftKey, altKey }) => {
		if (repeat) return
		if (disabled) return
		if (key !== 'Enter' && key !== ' ') return

		switch (true) {
			case ctrlKey && altKey && shiftKey: {
				dispatch('trigger', 6)
			}
			case ctrlKey && altKey: {
				dispatch('trigger', 5)
			}
			case ctrlKey && shiftKey: {
				dispatch('trigger', 4)
			}
			case ctrlKey: {
				dispatch('trigger', 1)
				break
			}
			case shiftKey: {
				dispatch('trigger', 2)
				break
			}
			case altKey: {
				dispatch('trigger', 3)
				break
			}
			default: {
				dispatch('trigger', 0)
			}
		}
	}}
	use:melt={$trigger}
	{disabled}
	aria-label={tip}
	class="
		w-9 h-9 border-2 rounded-md transition duration-75
		grow flex items-center justify-center
		!bg-opacity-10 {ColorsBtn[color]}
		{disabled
		? `!border-opacity-20 !bg-opacity-5`
		: `active:scale-95 hover:!bg-opacity-20 active:!bg-opacity-10`}
		"
>
	<div class="transition duration-75 {disabled ? 'opacity-60' : ''}">
		<svelte:component this={icon} size={20} />
	</div>
</button>

{#if !disabled && $open}
	<div use:melt={$content} transition:fade={{ duration: 40 }} class="tooltip">
		{tip}
	</div>
{/if}
