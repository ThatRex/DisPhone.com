<script lang="ts">
	import { createSlider, createSync, melt } from '@melt-ui/svelte'
	import Toggle from './toggle.svelte'
	import { ColorsBtn } from './colors'

	export let value = 100
	export let state = false
	export let label: string
	export let tip: string | { on: string; off: string } = ''
	export let icon: Component | { on: Component; off: Component }
	export let color: ColorsBtn = 'mono'

	const {
		elements: { root, range, thumbs },
		options: { disabled },
		states
	} = createSlider({
		orientation: 'vertical',
		defaultValue: [100],
		max: 120,
		min: 0
	})

	const sync = createSync(states)
	$: sync.value([value], ([v]) => {
		if (value !== v) {
			if (v % 10 === 0) navigator.vibrate?.(10)
			else navigator.vibrate?.(1)
		}
		value = v
	})

	let disabled_timeout = 0
</script>

<div class="flex flex-col gap-2">
	<span
		class="
			relative flex flex-col items-center w-9 border-2 rounded-md grow duration-75 transition
			!bg-opacity-10 bg-neutral-500 dark:bg-neutral-300 border-neutral-500 dark:border-neutral-300
			!border-opacity-40 hover:!border-opacity-100 focus-within:!border-opacity-100 cursor-ns-resize
			"
		role="button"
		tabindex="-1"
		use:melt={$root}
		on:dblclick={() => {
			value = 100
			// this is so touch screen users can double tap
			clearTimeout(disabled_timeout)
			disabled_timeout = setTimeout(() => ($disabled = false), 250)
			$disabled = true
		}}
		on:wheel={(e) => {
			if (e.shiftKey || e.ctrlKey || e.altKey) return
			e.preventDefault()
			const val = e.deltaY > 0 ? value + 2 : value - 2
			value = val < 0 ? 0 : val
		}}
	>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<span
			aria-label={label}
			use:melt={$thumbs[0]}
			use:melt={$range}
			on:keydown={(e) => !['Enter', ' '].includes(e.key) || (value = 100)}
			class="
				w-full rounded-[4px] outline-none
				bg-neutral-500 dark:bg-neutral-300
				bg-opacity-40 dark:bg-opacity-40
				"
		/>
		<span class="mt-auto mb-1.5 font-bold text-sm select-none">{value}</span>
	</span>
	<div>
		<Toggle bind:value={state} {tip} {icon} {color} />
	</div>
</div>
