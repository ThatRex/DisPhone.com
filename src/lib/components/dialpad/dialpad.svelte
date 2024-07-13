<script lang="ts">
	import type PhoneClient from '$lib/client-phone'
	import { config } from '$lib/stores/config.svelte'
	import { call_ids_dtmf_receptible } from '$lib/stores/calls.svelte'
	import { dial_string } from '$lib/stores/dial.svelte'
	import type { DTMFSimulator } from '$lib/utils'
	import { getContext } from 'svelte'
	import Key from './key.svelte'

	const phone = getContext<PhoneClient>('phone')
	const dtmf_simulator = getContext<DTMFSimulator>('dtmf_simulator')

	const sendDTMF = (dtmf: string) => {
		dtmf_simulator.press(dtmf)

		phone.sendDTMF({ ids: $call_ids_dtmf_receptible, dtmf })

		const input = document.getElementById('dial-input') as HTMLInputElement

		const selection_start = input.selectionStart ?? 0
		const selection_end = input.selectionEnd ?? $dial_string.length

		const before_selection = $dial_string.slice(0, selection_start)
		const after_selection = $dial_string.slice(selection_end)

		$dial_string = before_selection + dtmf + after_selection

		setTimeout(() => {
			if (!$config.dialpad_touchscreen_mode) input.focus()
			if (after_selection.length === 0)
				input.setSelectionRange($dial_string.length, $dial_string.length)
			else input.setSelectionRange(before_selection.length + 1, before_selection.length + 1)
		}, 10)
	}

	const buttons_layout_default = [
		['1', ''],
		['2', 'ABC'],
		['3', 'DEF'],
		['4', 'GHI'],
		['5', 'JKL'],
		['6', 'MNO'],
		['7', 'PQRS'],
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
		['7', 'PQRS'],
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

	$: buttons_layout = $config.dialpad_numeric ? buttons_layout_numeric : buttons_layout_default
	$: buttons = $config.dialpad_extended ? buttons_layout : buttons_layout.slice().slice(0, -3)
</script>

<div
	class="
		max-sm:hidden p-1 rounded-md border h-full
		border-black dark:border-white !border-opacity-30
		grid min-w-[222px] select-none grid-cols-3 gap-1 container-dialpad
		"
>
	{#each buttons as [main, secondary]}
		<Key {main} {secondary} on:trigger={() => sendDTMF(main)} />
	{/each}
</div>

<style lang="postcss">
	.container-dialpad {
		container-name: dialpad;
		container-type: size;
	}
</style>
