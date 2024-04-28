<script lang="ts">
	export let height: number = 0
	export let width: number = 0
</script>

<div
	bind:clientHeight={height}
	bind:clientWidth={width}
	class="
        grow rounded-md border p-1 min-w-0 h-full
        border-black dark:border-white !border-opacity-30
        "
>
	<div class="h-full overflow-auto scrollbar-thin">
		<slot />
	</div>
</div>
