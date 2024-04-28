<script lang="ts">
	import Group from '$lib/components/core/group.svelte'
	import type PhoneClient from '$lib/client-phone'
	import { config } from '$lib/stores/config.persistent'
	import { call_ids_dtmf_receptible } from '$lib/stores/calls.volitile'
	import { dial_string } from '$lib/stores/dial.volitile'
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
			if ($config.dialpad_focus_dial_field) input.focus()
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

<Group>
	<div
		class="h-full grid min-w-[218px] select-none grid-cols-3 gap-1 con overflow-auto scrollbar-none"
	>
		{#each buttons as [main, secondary]}
			<Key {main} {secondary} on:trigger={() => sendDTMF(main)} />
		{/each}
	</div>
</Group>

<style lang="postcss">
	.con {
		container-name: container-dialpad;
		container-type: size;
	}
</style>
