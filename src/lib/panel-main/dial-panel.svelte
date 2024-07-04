<script lang="ts">
	import Button from './ui/button.svelte'
	import type PhoneClient from '$lib/client-phone'
	import { config } from '$lib/stores/config.persistent'
	import {
		calls,
		call_ids_dtmf_receptible,
		call_ids_selected,
		call_ids_answerable
	} from '$lib/stores/calls.volitile'
	import { dial_string, redial_string, addActiveKey, dropText } from '$lib/stores/dial.volitile'
	import { uppercaseLetterToNumber, type DTMFSimulator, wait } from '$lib/utils'
	import { IconPhone, IconPhoneX, IconArrowBackUp, IconTrashX } from '@tabler/icons-svelte'
	import { getContext } from 'svelte'

	const phone = getContext<PhoneClient>('phone')
	const dtmf_simulator = getContext<DTMFSimulator>('dtmf_simulator')

	const call = (call_last = false) => {
		switch (true) {
			case !call_last && $dial_string === 'revealyoursecrets': {
				$config.hidden_settings_enabled = true
				break
			}
			case !call_last && $dial_string === 'hideyoursecrets': {
				$config.hidden_settings_enabled = false
				break
			}
			case !call_last && $dial_string === 'rainbow': {
				;(async () => {
					const frames_default = [
						['1'],
						['4', '2'],
						['7', '5', '3'],
						['*', '8', '6'],
						[',', '0', '9'],
						['+', '#'],
						[';']
					]
					const frames_numeric = [
						['7'],
						['4', '8'],
						['1', '5', '9'],
						['0', '2', '6'],
						['+', '*', '3'],
						[',', '#'],
						[';']
					]
					for (const frame of $config.dialpad_numeric ? frames_numeric : frames_default) {
						for (const chr of frame) addActiveKey(chr)
						await wait(100)
					}
				})()
				break
			}
			default: {
				const dial_str = call_last ? $redial_string : $dial_string || $redial_string
				if (!dial_str) return
				phone.dial({ profile_id: $config.sip_profiles[0].id, input: dial_str })
				if (!call_last && $dial_string) $redial_string = $dial_string
				break
			}
		}
		if (!call_last) $dial_string = ''
	}

	const dialpad_keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#', ',', '+', ';']

	const clear = (backspace: boolean = false) => {
		navigator.vibrate?.(6)

		const input = document.getElementById('dial-input') as HTMLInputElement

		let selection_start = input.selectionStart ?? 0
		let selection_end = input.selectionEnd || $dial_string.length

		if (backspace) selection_start = selection_end - 1
		else if (selection_start === selection_end || backspace) {
			selection_start = 0
			selection_end = $dial_string.length
		}

		const before_selection = $dial_string.slice(0, selection_start)
		const after_selection = $dial_string.slice(selection_end)

		$dial_string = before_selection + after_selection

		if (!$config.dialpad_touchescreen_mode) input.focus()
		setTimeout(() => input.setSelectionRange(before_selection.length, before_selection.length), 0)
	}

	let submitted = false
	let peek: string | undefined
	$: label = $call_ids_dtmf_receptible.length ? 'Destination Number / DTMF' : 'Destination Number'
	$: placeholder = peek ?? label
</script>

<div class="flex gap-2">
	<div
		class="
			w-20 grow flex border-2 rounded-md duration-75 transition outline-none
			font-semibold bg-opacity-10 dark:bg-opacity-10
			border-neutral-500 bg-neutral-500 dark:border-neutral-300 dark:bg-neutral-300
			!border-opacity-40 hover:!border-opacity-60 focus-within:!border-opacity-100 focus-within:hover:!border-opacity-100
			"
	>
		<form
			class="grow min-w-0 flex"
			on:submit={(e) => {
				e.preventDefault()
				if (submitted) return
				submitted = true
				call()
			}}
		>
			<input
				id="dial-input"
				bind:value={$dial_string}
				on:drop={dropText}
				on:keydown={({ key, ctrlKey, altKey, metaKey }) => {
					if (key === 'Delete') {
						clear()
						return
					}
					if (ctrlKey || altKey || metaKey) return
					const k = uppercaseLetterToNumber(key).toUpperCase()
					if (!dialpad_keys.includes(k)) return
					dtmf_simulator.press(k)
					addActiveKey(k)
					phone.sendDTMF({ ids: $call_ids_dtmf_receptible, dtmf: key })
				}}
				on:keyup={({ key }) => key !== 'Enter' || (submitted = false)}
				type="tel"
				aria-label={label}
				{placeholder}
				class="
					pl-2 placeholder:text-neutral-500 bg-transparent outline-none grow !min-w-0
					{$dial_string ? '' : 'pr-2'}
					"
			/>
		</form>

		{#if $dial_string}
			<button
				aria-label="Delete"
				on:keypress={(e) => e.repeat || ![' ', 'Enter'].includes(e.key) || clear()}
				on:mouseup={(e) => clear(e.button === 1)}
				disabled={!$dial_string}
				class="mx-1.5 opacity-40 disabled:opacity-0 hover:opacity-100 focus:opacity-100 transition duration-75"
			>
				<IconTrashX size={20} />
			</button>
		{/if}
	</div>
	<div class="flex gap-2 flex-wrap">
		{#if !$call_ids_answerable.length && !$dial_string && $redial_string}
			<Button
				on:mouseenter={() => (peek = $redial_string)}
				on:mouseleave={() => (peek = undefined)}
				on:trigger={(e) => e.detail !== 0 || call(true)}
				tip="Redial"
				icon={IconArrowBackUp}
				color="purple"
			/>
		{:else}
			<Button
				on:trigger={({ detail }) => {
					if (detail === 1) {
						call(true)
						return
					}

					if (detail !== 0) return

					if ($call_ids_answerable.length) {
						phone.answer({ ids: $call_ids_answerable })
						return
					}

					call()
				}}
				tip={$call_ids_answerable.length ? 'Answer' : 'Call'}
				icon={IconPhone}
				color="green"
				disabled={!$dial_string && !$call_ids_answerable.length}
			/>
		{/if}
		<Button
			on:trigger={({ detail }) => {
				switch (detail) {
					case 0: {
						phone.hangup({ ids: $call_ids_selected.length ? $call_ids_selected : undefined })
						break
					}
					case 1: {
						phone.hangup()
						break
					}
				}
			}}
			tip={$call_ids_selected.length ? 'Hangup Selected' : 'Hangup All'}
			icon={IconPhoneX}
			disabled={!$calls.length}
			color="red"
		/>
	</div>
</div>
