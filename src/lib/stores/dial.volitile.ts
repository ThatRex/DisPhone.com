import { uppercaseLetterToNumber } from '$lib/utils'
import { writable } from 'svelte/store'

export const dial_string = writable('')
export const redial_string = writable('')

dial_string.subscribe((s) => dial_string.set(uppercaseLetterToNumber(s.replace(/\s+/, ''))))

export const active_dialpad_keys = writable<string[]>([])
export const addActiveKey = (key: string) => {
	active_dialpad_keys.update((v) => [...v, key])
	setTimeout(() => active_dialpad_keys.update((v) => v.slice(1)), 150)
}

export const dropText = (e: DragEvent) => {
	e.preventDefault()
	const text = e.dataTransfer?.getData('text/plain')
	if (!text) return
	const parsed = text.replaceAll('\r', '').replaceAll('\n', '&')
	dial_string.set(parsed)
}
