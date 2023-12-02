<script lang="ts">
	import { dev } from '$app/environment'

	export let title: string | string[] = ''

	$: title_list = ['BaitKit.net', ...(typeof title === 'string' ? [title] : title)].filter((i) => i)
	$: full_title = `${dev ? '[InDev] ' : ''}${title_list.reverse().join(' • ')}`
</script>

<svelte:head>
	<title>{full_title}</title>
	<meta name="title" content="{full_title}" />
</svelte:head>
