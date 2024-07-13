<script lang="ts">
	import { createSlider, createSync, melt } from '@melt-ui/svelte'

	export let label: string
	export let description = ''
	export let value = [0, 0]
	export let default_value = [100, 100]
	export let min = 0
	export let max = 100
	export let step = 1
	export let displayValueParser: (n: number) => string = (n) => String(n)

	const {
		elements: { root, range, thumbs },
		options: { disabled },
		states
	} = createSlider({
		defaultValue: value,
		autoSort: true,
		max,
		min,
		step
	})

	const sync = createSync(states)
	$: sync.value(value, ([va, vb]) => {
		if (value[0] !== va) {
			if (va === default_value[0]) navigator.vibrate?.(10)
			else navigator.vibrate?.(1)
		}

		if (value[1] !== vb) {
			if (vb === default_value[1]) navigator.vibrate?.(10)
			else navigator.vibrate?.(1)
		}

		value[0] = va
		value[1] = vb
	})

	$: displayValues = [displayValueParser(value[0]), displayValueParser(value[1])]

	let disabled_timeout = 0
</script>

<span class="flex flex-col gap-1 grow">
	<span class="font-semibold select-none">{label}</span>
	{#if description}
		<p class="text-sm font-semibold opacity-80 select-none">{description}</p>
	{/if}
	<span
		class="
			group relative flex items-center grow
			border-2 rounded-md transition duration-75
			!bg-opacity-10 bg-neutral-500 dark:bg-neutral-300
			border-neutral-500 dark:border-neutral-300
			!border-opacity-40 hover:!border-opacity-100 focus-within:!border-opacity-100
			"
		role="button"
		tabindex="-1"
		use:melt={$root}
		on:keydown={(e) => {
			if (!['Enter', ' '].includes(e.key)) return
			value[0] = default_value[0]
			value[1] = default_value[1]
		}}
		on:dblclick={() => {
			value[0] = default_value[0]
			value[1] = default_value[1]
			// this is so touch screen users can double tap
			clearTimeout(disabled_timeout)
			disabled_timeout = setTimeout(() => ($disabled = false), 250)
			$disabled = true
		}}
	>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<span
			aria-label={label}
			use:melt={$range}
			class="
				h-full rounded-[4px]
				bg-neutral-500 dark:bg-neutral-300
				bg-opacity-40 dark:bg-opacity-40
				"
		/>
		<span class="ml-1.5 font-medium py-0.5 select-none">{displayValues[0]}</span>
		<span class="ml-auto mr-1.5 font-medium py-0.5 select-none">{displayValues[1]}</span>
		{#each $thumbs as thumb}
			<span
				use:melt={thumb}
				class="
					transition duration-75 outline-none
					h-4 w-2.5 rounded-sm cursor-ew-resize
					opacity-0 focus:opacity-100 group-hover:opacity-100
					bg-neutral-500 dark:bg-neutral-300
					hover:bg-black hover:dark:bg-white
					focus:bg-black focus:dark:bg-white
					"
			/>
		{/each}
	</span>
</span>
