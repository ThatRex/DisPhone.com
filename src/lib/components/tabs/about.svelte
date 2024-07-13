<script lang="ts">
	import { version } from '$app/environment'
</script>

<div class="h-full flex flex-col justify-center items-center text-center gap-3 text-sm py-6">
	<img class="w-20" src="./favicons/favicon-192.png" alt="DisPhone Logo" />
	<span class="font-semibold">
		<a
			target="_blank"
			class="opacity-90 hover:opacity-100 hover:text-lime-500 transition"
			href="https://github.com/ThatRex/DisPhone.com/blob/main/CHANGELOG.md"
		>
			v{version}
		</a>
		<span class="opacity-90"> • Proudly brought to you by </span>
		<a
			target="_blank"
			class="opacity-90 hover:opacity-100 hover:text-amber-500 transition"
			href="http://rexslab.com"
		>
			RexsLab.com</a
		><span class="opacity-70">.</span>
	</span>
	<span class="font-bold">
		<a
			target="_blank"
			class="opacity-70 hover:opacity-100 hover:text-blue-500 transition"
			title="Get started here."
			href="https://github.com/ThatRex/DisPhone.com/wiki"
		>
			Wiki
		</a>
		<span class="opacity-70 mx-0.5"> • </span>
		<a
			target="_blank"
			class="opacity-70 hover:opacity-100 hover:text-blue-500 transition"
			title="Come talk!"
			href="https://github.com/ThatRex/DisPhone.com/discussions"
		>
			Discuss
		</a>
		<span class="opacity-70 mx-0.5"> • </span>
		<a
			target="_blank"
			class="opacity-70 hover:opacity-100 hover:text-yellow-500 transition"
			title="Your support is appreciated & motivates further development."
			href="https://ko-fi.com/thatrex"
		>
			Donate
		</a>
		<span class="opacity-70 mx-0.5"> • </span>
		<a
			target="_blank"
			class="opacity-70 hover:opacity-100 hover:text-blue-500 transition"
			href="https://github.com/ThatRex/DisPhone.com/"
		>
			GitHub
		</a>
		<span class="opacity-70 mx-0.5"> • </span>
		<a
			target="_blank"
			class="opacity-70 hover:opacity-100 hover:text-emerald-500 transition"
			href="https://www.vercel-status.com/"
		>
			Status
		</a>
	</span>
</div>
