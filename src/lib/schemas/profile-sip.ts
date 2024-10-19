import { z } from 'zod'

export const profile_sip = z.object({
	id: z.string(),
	server_ws: z.string().catch(''),
	server_sip: z.string().catch(''),
	server_stun: z.string().catch(''),
	username: z.string().catch(''),
	login: z.string().catch(''),
	password: z.string().catch(''),
	number_voicemail: z.string().catch(''),
	register: z.boolean().catch(true),
	early_media: z.boolean().catch(true)
})
