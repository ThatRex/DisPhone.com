import { persisted } from 'svelte-persisted-store'
import schema from '$lib/schemas'

export const state = persisted('state', schema.state.parse({}))

state.update((v) => {
	const res = schema.state.safeParse(v)
	if (res.success) return res.data
	else {
		console.warn('Resetting State. Error:', res.error)
		return schema.state.parse({})
	}
})
