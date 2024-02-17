<script lang="ts">
	import { createSwitch, createSync, melt } from '@melt-ui/svelte'

	export let label: string
	export let value = false
	export let disabled = false

	const {
		elements: { root, input },
		states
	} = createSwitch({ disabled })

	const sync = createSync(states)
	$: sync.checked(value, (v) => {
		navigator.vibrate(6)
		value = v
	})
</script>

<form>
	<label class="flex items-center gap-2 mt-1">
		<button
			use:melt={$root}
			class="
				border-2 transition duration-75 rounded-md p-1 !bg-opacity-10
				border-neutral-500 bg-neutral-500 dark:border-neutral-300 dark:bg-neutral-300
				!border-opacity-40 hover:!border-opacity-60 focus:!border-opacity-100
				"
		>
			<span
				class="thumb block rounded-sm bg-neutral-500 dark:bg-neutral-300 transition duration-75"
			/>
		</button>
		<input use:melt={$input} />
		<span class="font-medium select-none">
			{label}
		</span>
	</label>
</form>

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
