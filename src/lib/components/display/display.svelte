<script lang="ts">
	import SubGroup from '../core/sub-group.svelte'
	import Call from './call.svelte'
	import { calls } from '$lib/stores/state.volitile'
</script>

<SubGroup>
	<div class="flex flex-col gap-1 min-h-[156px] max-h-[262px] overflow-auto scrollbar-thin">
		{#each $calls.filter((c) => !c.hidden) as call}
			<Call bind:call />
		{/each}
	</div>
</SubGroup>
