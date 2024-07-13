<script lang="ts">
	import { active_dialpad_keys } from '$lib/stores/dial.volitile'
	import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()

	export let main: string
	export let secondary: string

	const bg_colors = [
		'!bg-red-500/40',
		'!bg-orange-500/40',
		'!bg-yellow-500/40',
		'!bg-green-500/40',
		'!bg-blue-500/40',
		'!bg-purple-500/40'
	] as const

	let active = false
	const updateActive = (a: boolean) => a === active || (active = a)
	$: updateActive($active_dialpad_keys.includes(main))

	const randomBGC = () => bg_colors[Math.floor(Math.random() * bg_colors.length)]
</script>

<button
	tabindex="-1"
	aria-hidden="true"
	class="flex w-full overflow-hidden"
	on:keydown={(e) => {
		if (!['Enter', ' '].includes(e.key)) return
		dispatch('trigger')
		updateActive(true)
	}}
	on:pointerup={(e) => e.button !== 0 || updateActive(false)}
	on:pointerdown={(e) => {
		if (e.button !== 0) return
		dispatch('trigger')
		updateActive(true)
		navigator.vibrate?.(10)
	}}
	on:pointerout={() => updateActive(false)}
>
	<div
		class="
             pl-[7px] flex items-center gap-1 rounded-[3px] grow h-full transition duration-75
            bg-black dark:bg-white !bg-opacity-10 hover:!bg-opacity-20 {active
			? `${randomBGC()}`
			: ''} scale-key
            "
	>
		<span class="text-xl font-bold w-[12px] mr-0.5">{main}</span>
		<span class="text-xs font-bold opacity-70">{secondary}</span>
	</div>
</button>

<style lang="postcss">
	@container dialpad (height < 300px) {
		.scale-key {
			@apply active:scale-x-95 active:scale-y-90;
		}
	}
	@container dialpad (height >= 300px) {
		.scale-key {
			@apply active:scale-x-95 active:scale-y-95;
		}
	}
</style>
