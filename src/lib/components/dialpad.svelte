<script lang="ts">
	import SubGroup from '$lib/components/core/sub-group.svelte'
	import type Manager from '$lib/phone-client/manager'
	import { config } from '$lib/stores/state.persistent'
	import {
		active_dialpad_keys,
		calls,
		dial_string,
		getSelectedCallIDs
	} from '$lib/stores/state.volitile'
	import { createEventDispatcher, getContext } from 'svelte'

	const dispatch = createEventDispatcher()
	const phone = getContext<Manager>('phone')

	const sendDTMF = (dtmf: string) => {
		dispatch('dtmf', dtmf)

		const selected_call_ids = getSelectedCallIDs()
		if (selected_call_ids.length) phone.sendDTMF({ ids: selected_call_ids, dtmf })

		const input = document.getElementById('dial-input') as HTMLInputElement

		let selection_start = input.selectionStart === null ? 0 : input.selectionStart
		let selection_end = input.selectionEnd === null ? $dial_string.length : input.selectionEnd

		const before_selection = $dial_string.slice(0, selection_start)
		const after_selection = $dial_string.slice(selection_end)

		$dial_string = before_selection + dtmf + after_selection

		setTimeout(() => {
			input.focus()
			if (after_selection.length === 0)
				input.setSelectionRange($dial_string.length, $dial_string.length)
			else input.setSelectionRange(before_selection.length + 1, before_selection.length + 1)
		}, 0)
	}

	const buttons_layout_default = [
		['1', ''],
		['2', 'ABC'],
		['3', 'DEF'],
		['4', 'GHI'],
		['5', 'JKL'],
		['6', 'MNO'],
		['7', 'PQES'],
		['8', 'TUV'],
		['9', 'WXYZ'],
		['*', ''],
		['0', ''],
		['#', ''],
		[',', '100ms'],
		['+', ''],
		[';', '1s']
	] as const

	const buttons_layout_numeric = [
		['7', 'PQES'],
		['8', 'TUV'],
		['9', 'WXYZ'],
		['4', 'GHI'],
		['5', 'JKL'],
		['6', 'MNO'],
		['1', ''],
		['2', 'ABC'],
		['3', 'DEF'],
		['0', ''],
		['*', ''],
		['#', ''],
		['+', ''],
		[',', '100ms'],
		[';', '1s']
	] as const

	$: buttons_layout = $config.cfg_dialpad_numeric ? buttons_layout_numeric : buttons_layout_default
	$: buttons = $config.cfg_dialpad_extended ? buttons_layout : buttons_layout.slice().slice(0, -3)

	const bg_colors = [
		'!bg-red-500',
		'!bg-orange-500',
		'!bg-yellow-500',
		'!bg-green-500',
		'!bg-blue-500',
		'!bg-purple-500'
	] as const

	const randomColor = () => bg_colors[Math.floor(Math.random() * bg_colors.length)]

	const bg_colors_active = [
		'active:!bg-red-500',
		'active:!bg-orange-500',
		'active:!bg-yellow-500',
		'active:!bg-green-500',
		'active:!bg-blue-500',
		'active:!bg-purple-500'
	] as const

	const randomColorActive = () =>
		bg_colors_active[Math.floor(Math.random() * bg_colors_active.length)]

	let bg_color_active = randomColorActive()
</script>

<SubGroup>
	<div class="h-full grid min-w-[218px] select-none grid-cols-3 gap-1">
		{#each buttons as [main, secondary] (main)}
			{@const color = $active_dialpad_keys.includes(main) ? `${randomColor()} !bg-opacity-40` : ''}
			<button
				class="flex w-full"
				on:keydown={(e) => !['Enter', ' '].includes(e.key) || sendDTMF(main)}
				on:mousedown={(e) => {
					if (e.button !== 0) return
					bg_color_active = randomColorActive()
					navigator.vibrate(10)
					sendDTMF(main)
				}}
			>
				<div
					class="
						pl-[7px] flex items-center gap-1 rounded-[3px] grow h-full
						active:scale-x-95 active:scale-y-90 transition duration-75
						bg-black dark:bg-white !bg-opacity-10 hover:!bg-opacity-20
						active:!bg-opacity-40 {bg_color_active} {color}
						"
				>
					<span class="text-xl font-bold w-[12px] mr-0.5">{main}</span>
					<span class="text-xs font-bold opacity-70">{secondary}</span>
				</div>
			</button>
		{/each}
	</div>
</SubGroup>
