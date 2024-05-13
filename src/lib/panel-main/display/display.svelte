<script lang="ts">
	import Call from './call.svelte'
	import { calls } from '$lib/stores/calls.volitile'

	let height_display: number
</script>

<div
	bind:clientHeight={height_display}
	class="
		p-1 w-full rounded-md border flex flex-col
        border-black dark:border-white !border-opacity-30
        "
>
	<div class="h-full overflow-auto scrollbar-thin max-xs:content-end">
		<div class="flex flex-col grow gap-1 @container">
			{#each $calls.filter((c) => !c.hidden) as call, index (call.id)}
				<Call {index} bind:call bind:height_display />
			{/each}
		</div>
	</div>
</div>
