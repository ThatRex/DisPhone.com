<script lang="ts">
	import { createDialog, createSync, melt } from '@melt-ui/svelte'
	import { fade } from 'svelte/transition'

	export let open = false
	export let closable = true
	export let label: string
	export let role: 'dialog' | 'alertdialog' = 'alertdialog'

	const {
		elements: { overlay, content, portalled },
		states
	} = createDialog({
		role,
		forceVisible: true,
		closeOnEscape: closable,
		closeOnOutsideClick: closable
	})

	const sync = createSync(states)
	$: sync.open(open, (v) => (open = v))
</script>

<div class="" use:melt={$portalled}>
	{#if open}
		<div
			use:melt={$overlay}
			class="fixed inset-0 z-50 bg-black/50"
			transition:fade={{ duration: 75 }}
		/>
		<div
			aria-label={label}
			class="
				fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] translate-x-[-50%] translate-y-[-50%]
				bg-base-100 max-w-[500px] rounded-xl p-2.5
			  "
			transition:fade={{ duration: 75 }}
			use:melt={$content}
		>
			<div class="border border-black dark:border-white !border-opacity-30 rounded-lg p-4">
				<slot />
			</div>
		</div>
	{/if}
</div>
