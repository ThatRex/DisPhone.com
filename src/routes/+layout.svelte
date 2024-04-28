<script lang="ts">
	import '../app.css'
	import { browser, dev } from '$app/environment'
	import { inject } from '@vercel/analytics'
	import Meta from '$lib/components/core/meta.svelte'

	inject({ mode: dev ? 'development' : 'production' })
</script>

<Meta
	description="A fun feature full phone right in your browser. Dial on desktop, mobile and in Discord voice chat."
/>

{#if browser}<slot />{/if}

<noscript>
	<div class="font-medium text-center m-4">
		DisPhone requires JavaScript to function. Please enable it then refresh this page.
	</div>
</noscript>