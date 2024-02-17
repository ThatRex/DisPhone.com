import { derived, type Subscriber, type Writable } from 'svelte/store'

/** Subscribe to a key value of an object in a writable store. */
export function subscribeKey<T extends Record<string, unknown>, K extends keyof T>(
	writable: Writable<T>,
	key: K,
	run: Subscriber<T[K]>
) {
	derived(writable, (v) => v[key]).subscribe(run)
}
