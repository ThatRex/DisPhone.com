import adapter from '@sveltejs/adapter-vercel'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { preprocessMeltUI } from '@melt-ui/pp'
import sequence from 'svelte-sequential-preprocessor'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const path = fileURLToPath(new URL('package.json', import.meta.url))
const pkg = JSON.parse(readFileSync(path, 'utf8'))

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: sequence([vitePreprocess(), preprocessMeltUI()]),
	kit: {
		adapter: adapter(),
		version: { name: pkg.version }
	}
}

export default config
