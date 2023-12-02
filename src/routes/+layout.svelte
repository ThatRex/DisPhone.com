<script lang="ts">
	import { dev } from '$app/environment'
	import { inject } from '@vercel/analytics'

	inject({ mode: dev ? 'development' : 'production' })
</script>

<slot />

<style>
	* {
		font-family: Arial, Helvetica, sans-serif;
	}
</style>
