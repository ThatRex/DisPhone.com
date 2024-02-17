<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { ColorsBtn } from './colors'

	export let label: string
	export let color: ColorsBtn = 'mono'
	export let disabled = false

	const dispatch = createEventDispatcher()
</script>

<button
	on:click={() => {
		navigator.vibrate(6)
		dispatch('click')
	}}
	{disabled}
	class="
		px-2 py-0.5 border-2 rounded-md transition duration-75
		grow flex items-center justify-center
		!bg-opacity-10 {ColorsBtn[color]}
		{disabled
		? `!border-opacity-20 !bg-opacity-5`
		: `active:scale-y-95 active:scale-x-[97%] hover:!bg-opacity-20 active:!bg-opacity-10`}
		"
>
	<span class="transition duration-75 font-medium {disabled ? 'opacity-60' : ''}">
		{label}
	</span>
</button>
