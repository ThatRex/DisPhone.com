import { z } from 'zod'

export const profile_bot_discord = z.object({
	id: z.string(),
	name: z.string().catch(''),
	usr_user_id: z.string().catch(''),
	bot_token: z.string().catch(''),
	bot_invisible: z.boolean().catch(false),
	bot_status_text: z.string().catch('')
})
