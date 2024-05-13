<script lang="ts">
	import { dev } from '$app/environment'

	export let title: string | string[] = ''
	export let description: string = ''

	$: title_list = ['DisPhone.com', ...(typeof title === 'string' ? [title] : title)].filter((i) => i)
	$: full_title = `${dev ? '[InDev] ' : ''}${title_list.reverse().join(' • ')}`
</script>

<svelte:head>
	<title>{full_title}</title>
	<meta name="title" content={full_title} />
	<meta property="og:title" content={full_title} />
	{#if description}
		<meta name="description" content={description} />
		<meta property="og:description" content={description} />
	{/if}
</svelte:head>
