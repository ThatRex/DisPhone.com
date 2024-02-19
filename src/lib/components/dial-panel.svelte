<script lang="ts">
	import Button from '$lib/components/core/button.svelte'
	import type Manager from '$lib/phone-client/manager'
	import { config } from '$lib/stores/state.persistent'
	import {
		dial_string,
		redial_string,
		addActiveKey,
		getSelectedCallIDs,
		calls
	} from '$lib/stores/state.volitile'
	import { IconPhone, IconPhoneX, IconArrowBackUp, IconTrashX } from '@tabler/icons-svelte'
	import { createEventDispatcher, getContext } from 'svelte'

	const dispatch = createEventDispatcher()
	const phone = getContext<Manager>('phone')

	const call = (call_last = false) => {
		if ($dial_string === 'revealyoursecrets') $config.cfg_show_hidden_settings = true
		else if ($dial_string === 'hideyoursecrets') $config.cfg_show_hidden_settings = false
		else {
			const dial_str = call_last ? $redial_string : $dial_string || $redial_string
			if (!dial_str) return
			phone.dial({ profile_id: $config.cfg_sip_profiles[0].id, input: dial_str })
			if ($dial_string) $redial_string = $dial_string
		}
		if (!call_last) $dial_string = ''
	}

	const dtmf = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#', 'A', 'B', 'C', 'D']

	const clear = () => {
		const input = document.getElementById('dial-input') as HTMLInputElement

		let selection_start = input.selectionStart || 0
		let selection_end = input.selectionEnd || $dial_string.length

		if (selection_start === selection_end) {
			selection_start = 0
			selection_end = $dial_string.length
		}

		const before_selection = $dial_string.slice(0, selection_start)
		const after_selection = $dial_string.slice(selection_end)

		$dial_string = before_selection + after_selection

		input.focus()
		setTimeout(() => input.setSelectionRange(before_selection.length, before_selection.length), 0)
	}

	$: selected_active_call_ids = $calls
		.filter((c) => c.selected)
		.filter((c) => c.progress !== 'DISCONNECTED')
		.map((c) => c.id)

	$: calls_hangupable = $calls.filter((c) => c.selected).map((c) => c.id)

	let peek: string | undefined
	$: label = selected_active_call_ids.length ? 'Destination Number / DTMF' : 'Destination Number'
	$: placeholder = peek ?? label
</script>

<div class="flex gap-2 grow">
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
				on:input={() => ($dial_string = $dial_string.trim())}
				on:keydown={({ key, ctrlKey, altKey, metaKey }) => {
					if (key === 'Delete') clear()
					if (ctrlKey || altKey || metaKey) return
					const k = key.toUpperCase()
					if (!dtmf.includes(k)) return
					dispatch('dtmf', k)
					addActiveKey(k)
					const selected_call_ids = getSelectedCallIDs()
					if (selected_call_ids.length) phone.sendDTMF({ ids: selected_call_ids, dtmf: key })
				}}
				type="tel"
				aria-label={label}
				{placeholder}
				class="pl-2 placeholder:text-neutral-500 bg-transparent outline-none grow min-w-0"
			/>
		</form>

		<button
			aria-label="Clear"
			on:click={clear}
			disabled={!$dial_string}
			class="px-1.5 opacity-40 disabled:opacity-0 hover:opacity-100 focus:opacity-100 transition duration-75"
		>
			<IconTrashX size={20} />
		</button>
	</div>
	<div class="flex gap-2 flex-wrap">
		{#if !$dial_string && $redial_string}
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
					if (e.detail === 'middle-click') call(true)
					else call()
				}}
				tip="Call"
				icon={IconPhone}
				color="green"
				disabled={!$dial_string}
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
