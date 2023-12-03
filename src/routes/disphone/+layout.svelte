<script lang="ts">
	import { browser } from '$app/environment'
	import Meta from '$lib/components/meta.svelte'
</script>

<Meta title="DisPhone" description="Browser softphone with Discord integration." />

{#if browser}<slot />{/if}
