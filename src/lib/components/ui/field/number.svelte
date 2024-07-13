<script lang="ts">
	import { IconAsteriskSimple } from '@tabler/icons-svelte'

	export let label: string
	export let value = 0
	export let min: number = 0
	export let max: number = 1000000000000
	export let placeholder = ''
	export let description = ''
	export let required = false
	export let disabled = false
	export let readonly = false

	const handleInput = (e: Event) => {
		const target = e.target as HTMLInputElement
		let parsed = Number(target.value.replace(/[^0-9.]/g, '') || 0)
		if (parsed > max) parsed = max
		if (parsed < min) parsed = min
		value = parsed
		target.value = String(value)
	}
</script>

<label class="flex flex-col gap-1 grow">
	<div class="flex items-center gap-1">
		<span class="font-semibold select-none">{label}</span>
		{#if required}
			<span class="text-red-500"><IconAsteriskSimple size={12} stroke={3.5} /></span>
		{/if}
	</div>
	{#if description}
		<p class="text-sm font-semibold opacity-80 select-none">{description}</p>
	{/if}
	<input
		type="number"
		on:input={handleInput}
		{value}
		{min}
		{max}
		{disabled}
		{readonly}
		{placeholder}
		aria-label={label}
		class="
			py-0.5 px-1.5 min-w-0 w-full grow flex font-semibold
			border-2 rounded-md duration-75 transition outline-none
			!bg-opacity-10 placeholder:text-neutral-500
			border-neutral-500 bg-neutral-500 dark:border-neutral-300 dark:bg-neutral-300
			!border-opacity-40 hover:!border-opacity-60 focus:!border-opacity-100
			"
	/>
</label>

<style lang="postcss">
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	input[type='number'] {
		-moz-appearance: textfield;
	}
</style>
