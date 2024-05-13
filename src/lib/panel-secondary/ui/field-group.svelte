<script lang="ts">
	export let name: string
	export let description = ''
</script>

<div class="mt-4 first:mt-0 select-none opacity-75">
	<h2 class="uppercase text-sm font-bold">{name}</h2>
	<p class="text-sm font-semibold">{description}</p>
</div>
<div class="flex flex-col gap-y-3">
	<slot />
</div>
