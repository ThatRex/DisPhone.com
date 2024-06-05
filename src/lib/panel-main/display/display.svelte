<script lang="ts">
	import Call from './call.svelte'
	import { calls } from '$lib/stores/calls.volitile'
	import { flip } from 'svelte/animate'
	import { fly } from 'svelte/transition'
	import { cubicIn, cubicOut } from 'svelte/easing'

	let height_display: number
</script>

<div
	bind:clientHeight={height_display}
	class="
		p-1 w-full rounded-md border flex flex-col
        border-black dark:border-white !border-opacity-30
        "
>
	<div
		class="
			h-full flex flex-col grow scrollbar-thin @container
			{$calls.length ? 'overflow-auto' : 'overflow-clip'}
			"
	>
		<div class="-mt-1 max-xs:h-full" />
		{#each $calls.filter((c) => !c.hidden) as call, index (call.id)}
			<div
				class="flex first:mt-0 mt-1"
				in:fly={{ duration: 75, y: -5 }}
				out:fly={{ duration: 120, y: -5, easing: cubicOut }}
				animate:flip={{ duration: 120, easing: cubicIn }}
			>
				<Call {index} bind:call bind:height_display />
			</div>
		{/each}
	</div>
</div>
