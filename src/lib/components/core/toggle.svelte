<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { createTooltip, melt } from '@melt-ui/svelte'
	import { fade } from 'svelte/transition'
	import { ColorsBtn } from './colors'

	export let tip: string | { on: string; off: string } = ''
	export let tip_placement: 'top' | 'right' | 'bottom' | 'left' = 'top'
	export let icon: Componenet | { on: Componenet; off: Componenet }
	export let color: ColorsBtn | { on: ColorsBtn; off: ColorsBtn } = 'mono'
	export let value = false
	export let disabled = false

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

	const dispatch = createEventDispatcher()
</script>

<button
	on:mouseup={(e) => {
		if (disabled) return
		if (e.button !== 0) return
		value = !value
		dispatch('toggle')
		navigator.vibrate?.(6)
	}}
	on:keydown={({ key }) => {
		if (disabled) return
		if (![' ', 'Enter'].includes(key)) return
		value = !value
		dispatch('toggle')
	}}
	use:melt={$trigger}
	{disabled}
	aria-label="Toggle {_tip}"
	aria-pressed={value}
	class="
		w-9 h-9 border-2 rounded-md transition duration-75
		grow flex items-center justify-center
		!bg-opacity-10 {ColorsBtn[_color]}
		{value ? '' : `!border-opacity-40`}
		{disabled
		? `!border-opacity-20 !bg-opacity-5`
		: `cursor-pointer active:scale-95 hover:!bg-opacity-20 active:!bg-opacity-10`}
		"
>
	<div class="transition duration-75 {disabled ? 'opacity-60' : ''}">
		<svelte:component this={_icon} size={20} />
	</div>
</button>

{#if !disabled && $open}
	<div use:melt={$content} transition:fade={{ duration: 40 }} class="tooltip">
		{_tip}
	</div>
{/if}
