import type { CallDetail } from '$lib/phone-client/call'
import { get, writable } from 'svelte/store'

export type CallItem = { id: string; selected: boolean; hidden: boolean } & CallDetail

export const calls = writable<CallItem[]>([])

export const getSelectedCallIDs = () =>
	get(calls)
		.filter((c) => c.selected)
		.filter((c) => !c.hidden)
		.filter((c) => c.progress === 'CONNECTED')
		.map((c) => c.id)

export const dial_string = writable('')
export const redial_string = writable('')
export const active_dialpad_keys = writable<string[]>([])

export const addActiveKey = (key: string) => {
	active_dialpad_keys.update((v) => [...v, key])
	setTimeout(() => active_dialpad_keys.update((v) => v.slice(1)), 150)
}
