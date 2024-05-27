<script lang="ts">
	import { createTooltip, melt } from '@melt-ui/svelte'
	import { createEventDispatcher } from 'svelte'
	import { fade } from 'svelte/transition'

	export let tip: string
	export let icon: Component
	export let disabled = false
	const dispatch = createEventDispatcher()

	const {
		elements: { trigger, content },
		states: { open }
	} = createTooltip({
		positioning: { placement: 'top' },
		openDelay: 350,
		closeDelay: 0,
		closeOnPointerDown: true,
		disableHoverableContent: true
	})
</script>

<button
	use:melt={$trigger}
	on:pointerdown={(e) => {
		e.stopPropagation()
		navigator.vibrate?.(2)
	}}
	on:keydown={(e) => {
		e.stopPropagation()
		disabled || ![' ', 'Enter'].includes(e.key) || dispatch('trigger')
	}}
	on:mouseup={(e) => {
		if (disabled) return
		if (e.button !== 0) return
		dispatch('trigger')
	}}
	on:click={(e) => e.stopPropagation()}
	{disabled}
	class="
        w-[22px] h-[22px] flex justify-center items-center rounded-[3px] transition duration-[50ms]
        {disabled ||
		'dark:hover:bg-white/20 dark:active:bg-white/10 hover:bg-black/10 active:bg-black/5'}
        "
>
	<div class="transition duration-75 {disabled ? 'opacity-60' : ''}">
		<svelte:component this={icon} size={18} />
	</div>
</button>

{#if !disabled && $open}
	<div use:melt={$content} transition:fade={{ duration: 40 }} class="tooltip">
		{tip}
	</div>
{/if}
