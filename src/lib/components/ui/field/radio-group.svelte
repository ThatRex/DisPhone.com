<script lang="ts">
	import { createRadioGroup, createSync, melt } from '@melt-ui/svelte'
	import { IconCheck } from '@tabler/icons-svelte'
	import UI from '$lib/components/ui'

	type ArrayWithTwoPlusItems<T> = [T, T, ...T[]]
	type OptionValue = $$Generic<string>

	export let name: string
	export let description = ''
	export let options: ArrayWithTwoPlusItems<{
		label: string
		value: OptionValue
		default?: boolean
	}>
	export let value: OptionValue = options[0].value
	export let disabled = false

	const {
		elements: { root, item, hiddenInput },
		helpers: { isChecked },
		states
	} = createRadioGroup({ disabled })

	const sync = createSync(states)
	$: sync.value(value, (v) => (value = v as OptionValue))
</script>

<UI.Field.Group {name} {description}>
	<div use:melt={$root} class="flex flex-col gap-2.5" aria-label="View density">
		{#each options as option}
			<label class="flex items-center gap-3" on:pointerdown={() => navigator.vibrate?.(2)}>
				<button
					use:melt={$item(option.value)}
					id={option.value}
					class="
                    min-h-[26px] min-w-[26px] grid place-items-center outline-none
                    border-2 transition duration-75 rounded-md !bg-opacity-10
                    border-neutral-500 bg-neutral-500 dark:border-neutral-300 dark:bg-neutral-300
                    !border-opacity-40 hover:!border-opacity-60 focus:!border-opacity-100
                    "
				>
					{#if $isChecked(option.value)}
						<div
							class="
                            h-3.5 w-3.5 grid place-items-center rounded-sm
                            bg-neutral-500 dark:bg-neutral-300 text-neutral-100 dark:text-neutral-700
                            "
						>
							<IconCheck size={12} stroke={4.5} />
						</div>
					{:else if option.default}
						<div class="w-1.5 h-1.5 bg-black/30 dark:bg-white/30 rounded-full" />
					{/if}
				</button>
				<span class="font-medium capitalize leading-none select-none cursor-pointer">
					{option.label}
					{#if option.default}
						<span class="screenreader">(default)</span>
					{/if}
				</span>
			</label>
		{/each}
		<input name="line-height" use:melt={$hiddenInput} />
	</div>
</UI.Field.Group>
