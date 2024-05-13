<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { createTooltip, melt } from '@melt-ui/svelte'
	import { fade } from 'svelte/transition'
	import { ColorsBtn } from '../../components/colors'

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
		if (![0, 1].includes(e.button)) return
		dispatch('trigger', e.button === 0 ? 'left-click' : 'middle-click')
	}}
	on:keydown={(e) => disabled || ![' ', 'Enter'].includes(e.key) || dispatch('trigger', 'keydown')}
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
