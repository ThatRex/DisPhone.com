<script lang="ts">
	import Button from '$lib/components/core/button.svelte'
	import type PhoneClient from '$lib/phone-client'
	import { config } from '$lib/stores/state.persistent'
	import {
		dial_string,
		redial_string,
		addActiveKey,
		getSelectedCallIDs,
		calls
	} from '$lib/stores/state.volitile'
	import { uppercaseLetterToNumber, type DTMFSimulator, wait } from '$lib/utils'
	import { IconPhone, IconPhoneX, IconArrowBackUp, IconTrashX } from '@tabler/icons-svelte'
	import { getContext } from 'svelte'

	const phone = getContext<PhoneClient>('phone')
	const dtmf_simulator = getContext<DTMFSimulator>('dtmf_simulator')

	const call = (call_last = false) => {
		switch ($dial_string) {
			case 'revealyoursecrets': {
				$config.hidden_settings_enabled = true
				break
			}
			case 'hideyoursecrets': {
				$config.hidden_settings_enabled = false
				break
			}
			case 'rainbow': {
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
				phone.dial({ profile_id: $config.cfg_sip_profiles[0].id, input: dial_str })
				if (!call_last && $dial_string) $redial_string = $dial_string
				break
			}
		}
		if (!call_last) $dial_string = ''
	}

	const dialpad_keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#', ',', '+', ';']

	const clear = (backspace: boolean = false) => {
		navigator.vibrate?.(10)

		const input = document.getElementById('dial-input') as HTMLInputElement

		let selection_start = input.selectionStart !== null ? input.selectionStart : 0
		let selection_end = input.selectionEnd || $dial_string.length

		if (backspace) selection_start = selection_end - 1
		else if (selection_start === selection_end || backspace) {
			selection_start = 0
			selection_end = $dial_string.length
		}

		const before_selection = $dial_string.slice(0, selection_start)
		const after_selection = $dial_string.slice(selection_end)

		$dial_string = before_selection + after_selection

		if ($config.dialpad_focus_dial_field) input.focus()
		setTimeout(() => input.setSelectionRange(before_selection.length, before_selection.length), 0)
	}

	$: calls_hangupable = $calls.filter((c) => c.selected).map((c) => c.id)
	$: calls_answerable = $calls
		.filter((c) => {
			return c.selected && c.type === 'INBOUND' && c.progress === 'CONNECTING'
		})
		.map((c) => c.id)

	$: selected_active_call_ids = $calls
		.filter((c) => c.selected)
		.filter((c) => c.progress !== 'DISCONNECTED')
		.map((c) => c.id)

	let peek: string | undefined
	$: label = selected_active_call_ids.length ? 'Destination Number / DTMF' : 'Destination Number'
	$: placeholder = peek ?? label
</script>

<div class="flex gap-2">
	<div
		class="
			w-40 grow flex border-2 rounded-md duration-75 transition outline-none
			font-semibold bg-opacity-10 dark:bg-opacity-10
			border-neutral-500 bg-neutral-500 dark:border-neutral-300 dark:bg-neutral-300
			!border-opacity-40 hover:!border-opacity-60 focus-within:!border-opacity-100 focus-within:hover:!border-opacity-100
			"
	>
		<form
			class="grow min-w-0 flex"
			on:submit={(e) => {
				e.preventDefault()
				call()
			}}
		>
			<input
				id="dial-input"
				bind:value={$dial_string}
				on:drop={(e) => {
					const dropped_text = e.dataTransfer?.getData('text/plain')
					if (!dropped_text) return
					$dial_string = dropped_text
				}}
				on:keydown={({ key, ctrlKey, altKey, metaKey }) => {
					if (key === 'Delete') clear()
					if (ctrlKey || altKey || metaKey) return
					const k = uppercaseLetterToNumber(key).toUpperCase()
					if (!dialpad_keys.includes(k)) return
					dtmf_simulator.press(k)
					addActiveKey(k)
					const selected_call_ids = getSelectedCallIDs()
					if (selected_call_ids.length) phone.sendDTMF({ ids: selected_call_ids, dtmf: key })
				}}
				type="tel"
				aria-label={label}
				{placeholder}
				class="pl-2 placeholder:text-neutral-500 bg-transparent outline-none grow !min-w-0"
			/>
		</form>

		{#if $dial_string}
			<button
				aria-label="Delete"
				on:keypress={(e) => ![' ', 'Enter'].includes(e.key) || clear()}
				on:mouseup={(e) => clear(e.button === 1)}
				disabled={!$dial_string}
				class="mx-1.5 opacity-40 disabled:opacity-0 hover:opacity-100 focus:opacity-100 transition duration-75"
			>
				<IconTrashX size={20} />
			</button>
		{/if}
	</div>
	<div class="flex gap-2 flex-wrap">
		{#if !calls_answerable.length && !$dial_string && $redial_string}
			<Button
				on:mouseenter={() => (peek = $redial_string)}
				on:mouseleave={() => (peek = undefined)}
				on:trigger={() => call(true)}
				tip="Redial"
				icon={IconArrowBackUp}
				color="purple"
			/>
		{:else}
			<Button
				on:trigger={(e) => {
					if (e.detail === 'middle-click') {
						call(true)
						return
					}

					if (calls_answerable.length) {
						phone.answer({ ids: calls_answerable })
						return
					}

					call()
				}}
				tip="Call"
				icon={IconPhone}
				color="green"
				disabled={!$dial_string && !calls_answerable.length}
			/>
		{/if}
		<Button
			on:trigger={(e) =>
				phone.hangup({ ids: e.detail === 'left-click' ? calls_hangupable : undefined })}
			tip={calls_hangupable.length ? 'Hangup Selected' : 'Hangup All'}
			icon={IconPhoneX}
			disabled={!$calls.filter((c) => c.progress !== 'DISCONNECTED').length}
			color="red"
		/>
	</div>
</div>
