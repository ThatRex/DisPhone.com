<script lang="ts">
	import { IconAsteriskSimple } from '@tabler/icons-svelte'

	export let label: string
	export let value = ''
	export let placeholder = ''
	export let type: 'text' | 'tel' | 'password' = 'text'
	export let description = ''
	export let examples: string[] = []
	export let required = false
	export let disabled = false
	export let readonly = false

	const default_type = type

	const handleInput = (e: Event) => {
		const target = e.target as HTMLInputElement
		value = target.value = target.value.trim()
	}
</script>

<label class="flex flex-col">
	<div class="flex items-center gap-1">
		<span class="font-medium select-none">{label}</span>
		{#if required}
			<span class="text-red-500"><IconAsteriskSimple size={12} stroke={3.5} /></span>
		{/if}
	</div>
	<input
		{type}
		{value}
		{disabled}
		{readonly}
		{placeholder}
		aria-label={label}
		on:input={handleInput}
		on:blur={() => (type = default_type === 'password' ? default_type : type)}
		on:focus={() => (type = type === 'password' ? 'text' : type)}
		class="
			py-0.5 px-1.5 min-w-0 w-full grow flex font-semibold
			border-2 rounded-md duration-75 transition outline-none
			!bg-opacity-10 placeholder:text-neutral-500
			border-neutral-500 bg-neutral-500 dark:border-neutral-300 dark:bg-neutral-300
			!border-opacity-40 hover:!border-opacity-60 focus:!border-opacity-100
			"
	/>
</label>
