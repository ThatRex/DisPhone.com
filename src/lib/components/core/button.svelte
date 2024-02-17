<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { createTooltip, melt } from '@melt-ui/svelte'
	import { fade } from 'svelte/transition'

	export let tip: string
	export let tip_placement: 'top' | 'right' | 'bottom' | 'left' = 'top'
	export let icon: Componenet
	export let color: keyof typeof color_classes = 'mono'
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

	const color_classes = {
		mono: 'border-neutral-500 bg-neutral-500 dark:border-neutral-300 dark:bg-neutral-300',
		red: 'border-red-500 bg-red-500',
		orange: 'border-orange-500 bg-orange-500',
		yellow: 'border-yellow-500 bg-yellow-500',
		green: 'border-green-500 bg-green-500',
		blue: 'border-blue-500 bg-blue-500',
		purple: 'border-purple-500 bg-purple-500'
	} as const

	const dispatch = createEventDispatcher()
</script>

<button
	on:mouseup={(e) => {
		if (disabled) return
		if (e.button !== 0) return
		dispatch('trigger')
		navigator.vibrate(6)
	}}
	on:keydown={(e) => disabled || ![' ', 'Enter'].includes(e.key) || dispatch('trigger')}
	use:melt={$trigger}
	{disabled}
	aria-label={tip}
	class="
		w-9 h-9 border-2 rounded-md transition duration-75
		grow flex items-center justify-center
		!bg-opacity-10 {color_classes[color]}
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
