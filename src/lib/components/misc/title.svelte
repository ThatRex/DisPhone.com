<script lang="ts">
	import { dev } from '$app/environment'

	export let title: string | string[] = ''

	$: title_list = ['BaitKit.net', ...(typeof title === 'string' ? [title] : title)].filter((i) => i)
</script>

<svelte:head>
	<title>{dev ? '[InDev] ' : ''}{title_list.reverse().join(' • ')}</title>
</svelte:head>
