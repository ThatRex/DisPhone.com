<script lang="ts">
	import '../app.css'
	import { browser, dev, version } from '$app/environment'
	import { inject } from '@vercel/analytics'
	import Meta from '$lib/components/core/meta.svelte'

	inject({ mode: dev ? 'development' : 'production' })
</script>

<Meta
	description="A fun feature full phone right in your browser. Dial on desktop, mobile and in Discord voice chat."
/>

<div class="mx-auto sm:px-2.5 my-[18px] max-w-[1200px] max-sm:m-2">
	<div
		class="
			flex gap-4 flex-col p-4 rounded-2xl
			max-sm:p-3 transition-colors duration-75 bg-none
			border-black dark:border-white bg-base-100
			border-opacity-30 dark:border-opacity-30
			shadow-md dark:shadow-none
			"
	>
		<noscript>
			<div class="font-medium text-center">
				DisPhone requires JavaScript to function. Please enable it then refresh this page.
			</div>
		</noscript>
		{#if browser}<slot />{/if}
	</div>
	<div class="flex justify-between flex-wrap gap-x-3 gap-y-1 text-sm mx-4 my-1 mt-2">
		<span class="font-bold flex gap-1">
			<a
				target="_blank"
				class="opacity-70 hover:opacity-100 hover:text-blue-500 transition"
				title="Looking to get started? Start here!"
				href="http://wiki.disphone.com"
			>
				Wiki
			</a>
			<span class="opacity-70"> • </span>
			<a
				target="_blank"
				class="opacity-70 hover:opacity-100 hover:text-yellow-500 transition"
				title="Your support is appreciated & motivates further development."
				href="http://donate.disphone.com"
			>
				Donate
			</a>
			<span class="opacity-70"> • </span>
			<a
				target="_blank"
				class="opacity-70 hover:opacity-100 hover:text-blue-500 transition"
				href="https://github.com/ThatRex/DisPhone.com/"
			>
				GitHub
			</a>
			<span class="opacity-70"> • </span>
			<a
				target="_blank"
				class="opacity-70 hover:opacity-100 hover:text-emerald-500 transition"
				href="http://status.disphone.com"
			>
				Status
			</a>
		</span>
		<span class="font-semibold">
			<a
				target="_blank"
				class="opacity-70 hover:opacity-100 hover:text-lime-500 transition"
				href="https://github.com/ThatRex/DisPhone.com/blob/master/CHANGELOG.md"
			>
				v{version}
			</a>
			<span class="opacity-70"> • Proudly brought to you by </span>
			<a
				target="_blank"
				class="opacity-70 hover:opacity-100 hover:text-amber-500 transition"
				href="http://rexslab.com"
			>
				RexsLab.com</a
			><span class="opacity-70">.</span>
		</span>
	</div>
</div>
