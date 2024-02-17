<script lang="ts">
	import { createEventDispatcher, type SvelteComponent } from 'svelte'
	import { createTooltip, melt } from '@melt-ui/svelte'
	import { fade } from 'svelte/transition'
	import { ColorsBtn } from './colors'

	type Component = typeof SvelteComponent<any, any, any>
	type ArrayWithTwoPlusItems<T> = [T, T, ...T[]]
	type ModeValue = $$Generic<string>

	export let modes: ArrayWithTwoPlusItems<{
		tip: string
		icon: Component
		value: ModeValue
		color?: ColorsBtn
		on?: boolean
	}>

	export let tip_placement: 'top' | 'right' | 'bottom' | 'left' = 'top'
	export let value: ModeValue = modes[0].value
	export let disabled = false
	export let zero_next_idx_on_blur = true

	let blurred = true

	$: current_mode_idx = modes.findIndex((m) => m.value === value)
	$: if (current_mode_idx === -1) current_mode_idx = 0
	$: color = modes[current_mode_idx].color ?? 'mono'

	const {
		elements: { trigger, content },
		states: { open }
	} = createTooltip({
		positioning: { placement: tip_placement },
		openDelay: 350,
		closeDelay: 0,
		closeOnPointerDown: false,
		disableHoverableContent: true
	})

	const dispatch = createEventDispatcher()

	const updateSwitch = () => {
		if (disabled) return

		if (
			(zero_next_idx_on_blur && blurred && current_mode_idx) ||
			modes.length - 1 === current_mode_idx
		) {
			current_mode_idx = 0
		} else {
			current_mode_idx++
		}

		value = modes[current_mode_idx].value
		blurred = false
		dispatch('toggle')
		navigator.vibrate(6)
	}
</script>

<button
	on:blur={() => (blurred = true)}
	on:mouseup={(e) => e.button !== 0 || updateSwitch()}
	on:keydown={({ key }) => ![' ', 'Enter'].includes(key) || updateSwitch()}
	use:melt={$trigger}
	{disabled}
	aria-label="Toggle {modes[current_mode_idx].tip}"
	class="
		w-9 h-9 border-2 rounded-md transition duration-75
		grow flex items-center justify-center
		!bg-opacity-10 {ColorsBtn[color]} 
		{modes[current_mode_idx].on ? '' : `!border-opacity-40`}
		{disabled
		? `!border-opacity-20 !bg-opacity-5`
		: `active:scale-95 hover:!bg-opacity-20 active:!bg-opacity-10`}
		"
>
	<div class="transition duration-75 {disabled ? 'opacity-60' : ''}">
		<svelte:component this={modes[current_mode_idx].icon} size={20} />
	</div>
</button>

{#if !disabled && $open}
	<div use:melt={$content} transition:fade={{ duration: 40 }} class="tooltip">
		{modes[current_mode_idx].tip}
	</div>
{/if}
