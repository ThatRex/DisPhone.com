/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				bg: 'var(--color-bg)',
				'base-100': 'var(--color-base-100)'
			}
		}
	},
	safelist: [],
	plugins: [require('@tailwindcss/container-queries'), require('tailwind-scrollbar')]
}
