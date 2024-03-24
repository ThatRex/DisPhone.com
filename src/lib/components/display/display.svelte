<script lang="ts">
	import Group from '../core/group.svelte'
	import Call from './call.svelte'
	import { calls } from '$lib/stores/state.volitile'

	let height_display: number
</script>

<Group bind:height={height_display}>
	<div class="h-0">
		<div class="flex flex-col grow max-sm:flex-col-reverse gap-1 @container">
			{#each $calls.filter((c) => !c.hidden) as call (call.id)}
				<Call bind:call bind:height_display />
			{/each}
		</div>
	</div>
</Group>
