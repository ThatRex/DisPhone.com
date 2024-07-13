<script lang="ts">
	export let name: string
	export let description = ''
</script>

<div class="first:mt-0 mt-4 flex flex-col gap-3">
	<div class="select-none opacity-75">
		<h2 class="uppercase text-sm font-bold">{name}</h2>
		<p class="text-sm font-semibold">{description}</p>
	</div>
	<div class="flex flex-col gap-y-3">
		<slot />
	</div>
</div>
