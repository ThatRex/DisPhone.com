import type { CallDetail } from '$lib/client-phone/call'
import { derived, writable } from 'svelte/store'

export type CallItem = { id: string; selected: boolean; hidden: boolean } & CallDetail

export const calls = writable<CallItem[]>([])

export const call_ids_selected = derived(calls, (c) => {
	return c.filter((c) => c.selected).map((c) => c.id)
})

export const call_ids_unselected = derived(calls, (c) => {
	return c.filter((c) => !c.selected).map((c) => c.id)
})

export const call_ids_connecting_o = derived(calls, (c) => {
	return c.filter((c) => c.progress === 'CONNECTING' && c.type === 'OUTBOUND').map((c) => c.id)
})

export const call_ids_connecting_i = derived(calls, (c) => {
	return c.filter((c) => c.progress === 'CONNECTING' && c.type === 'INBOUND').map((c) => c.id)
})

export const call_ids_connected = derived(calls, (c) => {
	return c.filter((c) => c.progress === 'CONNECTED').map((c) => c.id)
})

export const call_ids_active = derived(calls, (c) => {
	return c.filter((c) => c.progress !== 'DISCONNECTED').map((c) => c.id)
})

export const call_ids_dtmf_receptible = derived(calls, (c) => {
	return c
		.filter((c) => c.selected)
		.filter((c) => c.dtmf_receptible)
		.map((c) => c.id)
})

export const call_ids_has_media = derived(calls, (c) => {
	return c.filter((c) => c.media).map((c) => c.id)
})

export const call_ids_answerable = derived(calls, (c) => {
	return c
		.filter((c) => c.selected)
		.filter((c) => c.type === 'INBOUND')
		.filter((c) => c.progress === 'CONNECTING')
		.map((c) => c.id)
})
