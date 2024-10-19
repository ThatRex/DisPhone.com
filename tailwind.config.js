/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: [
		'variant',
		['@media (prefers-color-scheme: dark) { &:not([data-theme-mode="light"] *) }', '&:is([data-theme-mode="dark"] *)']
	],
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				bg: 'var(--color-bg)',
				'base-100': 'var(--color-base-100)'
			},
			screens: {
				xs: '440px'
			},
			container: {
				'8xl': '90rem'
			}
		}
	},
	safelist: [],
	plugins: [require('@tailwindcss/container-queries'), require('tailwind-scrollbar')]
}
