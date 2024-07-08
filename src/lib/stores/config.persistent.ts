import { persisted } from 'svelte-persisted-store'
import schema from '$lib/schemas'

export const config = persisted('config', schema.config.parse({}))

config.update((v) => {
	const res = schema.config.safeParse(v)
	if (res.success) return res.data
	else {
		console.warn('Resetting Config. Error:', res.error)
		return schema.config.parse({})
	}
})
