<script lang="ts">
	import { ColorsBtn } from '$lib/components/ui/colors'
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
        flex items-center justify-center h-9
		px-2.5 gap-2.5 border-2 rounded-md transition duration-75
		!bg-opacity-10 {ColorsBtn[color]}
		{disabled
		? `!border-opacity-20 !bg-opacity-5`
		: `active:scale-y-95 active:scale-x-[97%] hover:!bg-opacity-20 active:!bg-opacity-10`}
		"
>
	<div class={disabled ? 'opacity-60' : ''}>
		<svelte:component this={icon} size={18} />
	</div>
	<span class="text-center transition duration-75 font-medium {disabled ? 'opacity-60' : ''}">
		{label}
	</span>
</button>
