import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'
import EntryShakingPlugin from 'vite-plugin-entry-shaking'

export default defineConfig({
	server: { https: true, proxy: {} },
	plugins: [
		sveltekit(),
		mkcert(),
		// https://github.com/tabler/tabler-icons/issues/518#issuecomment-1622724562
		await EntryShakingPlugin({ targets: ['@tabler/icons-svelte'], extensions: ['svelte'] })
	]
})
