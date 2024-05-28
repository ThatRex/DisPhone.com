<script lang="ts">
	import { ColorsBtn } from '$lib/components/colors'
	import { createEventDispatcher } from 'svelte'

	export let label: string
	export let icon: undefined | Component = undefined
	export let color: ColorsBtn = 'mono'
	export let disabled = false

	const dispatch = createEventDispatcher()
</script>

<button
	on:click={() => {
		navigator.vibrate?.(6)
		dispatch('click')
	}}
	{disabled}
	class="
        flex items-center justify-center gap-2
		px-2.5 py-1 border-2 rounded-md transition duration-75
		!bg-opacity-10 {ColorsBtn[color]}
		{disabled
		? `!border-opacity-20 !bg-opacity-5`
		: `active:scale-y-95 active:scale-x-[97%] hover:!bg-opacity-20 active:!bg-opacity-10`}
		"
>
	<svelte:component this={icon} size={16} stroke={2.5}/>
	<span class="transition duration-75 font-medium {disabled ? 'opacity-60' : ''}">
		{label}
	</span>
</button>
