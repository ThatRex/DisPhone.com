import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
	server: { https: true, proxy: {} },
	plugins: [sveltekit(), mkcert()]
})
