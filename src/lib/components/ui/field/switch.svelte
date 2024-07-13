<script lang="ts">
	import { createSwitch, createSync, melt } from '@melt-ui/svelte'
	import { IconCheck, IconX } from '@tabler/icons-svelte'

	export let label: string
	export let description = ''
	export let value = false
	export let disabled = false
	export let default_value: boolean | undefined = undefined

	const {
		elements: { root, input },
		states
	} = createSwitch({ disabled })

	const sync = createSync(states)
	$: sync.checked(value, (v) => (value = v))
</script>

<div class="group flex flex-col grow">
	<label
		on:pointerdown={() => navigator.vibrate?.(4)}
		class="
			flex justify-between items-center gap-2
			cursor-pointer font-semibold select-none
			"
	>
		{label}
		{#if default_value !== undefined}
			<span class="screenreader">
				(default: {default_value ? 'on' : 'off'})
			</span>
		{/if}
		<button
			use:melt={$root}
			class="
				border-2 transition duration-75 rounded-md p-1 !bg-opacity-10 !outline-none
				border-neutral-500 bg-neutral-500 dark:border-neutral-300 dark:bg-neutral-300
				!border-opacity-40 hover:!border-opacity-60 focus:!border-opacity-100
				"
		>
			<span
				class="
					thumb grid place-items-center rounded-sm transition duration-75 pointer-events-none
					bg-neutral-500 dark:bg-neutral-300 text-neutral-100 dark:text-neutral-700
					"
			>
				<svelte:component this={value ? IconCheck : IconX} size={12} stroke={4.5} />
			</span>
			<div
				class="

					h-0 w-0 -translate-y-[11px]
					{default_value ? 'translate-x-[26px]' : 'translate-x-[5px]'}
					"
			>
				<div
					class="
					w-1.5 h-1.5 bg-black dark:bg-white rounded-full transition duration-75
					{default_value === undefined || value === default_value ? '!bg-opacity-0' : '!bg-opacity-30'}
					"
				/>
			</div>
		</button>
		<input use:melt={$input} />
	</label>
	{#if description}
		<div class="text-sm font-semibold opacity-80 select-none">
			{description}
		</div>
	{/if}
</div>

<style lang="postcss">
	button {
		--w: 3rem;
		width: calc(var(--w));
		min-width: calc(var(--w));
	}

	.thumb {
		--size: 1rem;
		width: var(--size);
		height: var(--size);
	}
	:global([data-state='checked']) .thumb {
		transform: translateX(calc(var(--w) - var(--size) - 12px));
	}
</style>
