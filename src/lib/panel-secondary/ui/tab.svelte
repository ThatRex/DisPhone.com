<script lang="ts">
	import { createTooltip, melt } from '@melt-ui/svelte'
	import { fade } from 'svelte/transition'
	import { ColorsBtn } from '../../components/colors'

	export let tip: string = ''
	export let icon: Component
	export let value = false

	const {
		elements: { trigger, content },
		states: { open }
	} = createTooltip({
		positioning: { placement: 'right' },
		openDelay: 350,
		closeDelay: 0,
		closeOnPointerDown: true,
		disableHoverableContent: true
	})
</script>

<div
	on:pointerdown={() => navigator.vibrate?.(6)}
	use:melt={$trigger}
	class="
		w-9 h-9 border-2 rounded-md cursor-pointer
		flex grow items-center justify-center
		transition duration-75 active:scale-95
		!bg-opacity-10 hover:!bg-opacity-20 active:!bg-opacity-10
		{ColorsBtn['mono']} {value ? '' : `!border-opacity-40`}
		"
>
	<svelte:component this={icon} size={20} />
</div>

{#if $open}
	<div use:melt={$content} transition:fade={{ duration: 40 }} class="tooltip">
		{tip}
	</div>
{/if}
