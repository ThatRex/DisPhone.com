<script lang="ts">
	import SubGroup from '../core/sub-group.svelte'
	import Call from './call.svelte'
	import { calls } from '$lib/stores/state.volitile'
</script>

<SubGroup>
	<div
		class="
			flex flex-col gap-1 h-[156px] max-sm:h-[176px]
			overflow-auto scrollbar-thin @container
			"
	>
		{#each $calls.filter((c) => !c.hidden) as call}
			<Call bind:call />
		{/each}
	</div>
</SubGroup>
