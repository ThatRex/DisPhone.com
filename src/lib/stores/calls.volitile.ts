import type { CallDetail } from '$lib/client-phone/call'
import { derived, writable } from 'svelte/store'

export type CallItem = { id: string; selected: boolean; hidden: boolean } & CallDetail

export const calls = writable<CallItem[]>([])

export const call_ids_connected = derived(calls, (c) => {
	return c.filter((c) => c.progress === 'CONNECTED').map((c) => c.id)
})

export const call_ids_selected = derived(calls, (c) => {
	return c.filter((c) => c.selected).map((c) => c.id)
})

export const call_ids_active = derived(calls, (c) => {
	return c.filter((c) => c.progress !== 'DISCONNECTED').map((c) => c.id)
})

export const call_ids_dtmf_receptible = derived(calls, (c) => {
	return c
		.filter((c) => c.selected)
		.filter((c) => c.progress === 'CONNECTED')
		.map((c) => c.id)
})

export const call_ids_hangupable = derived(calls, (c) => {
	return c.filter((c) => c.selected).map((c) => c.id)
})

export const call_ids_answerable = derived(calls, (c) => {
	return c
		.filter((c) => c.selected)
		.filter((c) => c.type === 'INBOUND')
		.filter((c) => c.progress === 'CONNECTING')
		.map((c) => c.id)
})
