<script lang="ts">
	import { version } from '$app/environment'
	import { config } from '$lib/stores/config.persistent'
	import { dial_string } from '$lib/stores/dial.volitile'

	const vibrate = navigator.vibrate
	$: navigator.vibrate = $config.haptics_disabled ? undefined : vibrate

	// stops firefox setting the document location to dropped text
	document.documentElement.addEventListener('dragover', (e) => {
		if (e.target instanceof HTMLInputElement) return
		e.preventDefault()
	})
	document.documentElement.addEventListener('drop', (e) => {
		if (e.target instanceof HTMLInputElement) return
		e.preventDefault()
		const dropped_text = e.dataTransfer?.getData('text/plain')
		if (dropped_text) $dial_string = dropped_text
	})
</script>

<div
	class={$config.window_mode_enabled ? '' : 'mx-auto sm:px-2.5 my-[18px] max-w-[1200px] max-sm:m-2'}
>
	<div
		class="
			h-full flex gap-4 flex-col max-sm:p-3 transition-colors duration-75 bg-base-100
			{$config.window_mode_enabled
			? 'dark:bg-transparent fixed top-0 bottom-0 left-0 right-0 overflow-auto p-3 scrollbar-thin'
			: 'border-black dark:border-white border-opacity-30 dark:border-opacity-30p-4 rounded-2xl shadow-md dark:shadow-none p-4'}
			"
	>
		<slot />
	</div>
	{#if !$config.window_mode_enabled}
		<div
			class="flex justify-between flex-wrap gap-x-3 gap-y-1 text-sm mx-[20px] max-sm:mx-4 my-1 mt-2"
		>
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
	{/if}
</div>
