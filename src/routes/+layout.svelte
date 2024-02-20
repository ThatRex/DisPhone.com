<script lang="ts">
	import '../app.css'
	import { browser, dev } from '$app/environment'
	import { inject } from '@vercel/analytics'
	import Meta from '$lib/components/core/meta.svelte'

	inject({ mode: dev ? 'development' : 'production' })
</script>

<Meta description="A fun feature full phone right in your browser. Dial on desktop, mobile and in Discord voice chat." />

<div class="mx-auto sm:px-2.5 m-3 max-w-[1200px] max-sm:m-2">
	{#if browser}<slot />{/if}
</div>
