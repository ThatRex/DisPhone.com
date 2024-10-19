import { z } from 'zod'

export const state = z.object({
	conference_enabled: z.boolean().catch(false),
	inbound_call_mode: z.enum(['R', 'DND', 'AA']).catch('R'),
	level_selected: z.enum(['IN', 'OUT']).catch('OUT'),
	level_in: z.number().catch(100),
	level_out: z.number().catch(100),
	muted_in: z.boolean().catch(false),
	muted_out: z.boolean().catch(false),
	secondary_panel_enabled: z.boolean().catch(true),
	secondary_panel_tab: z.enum(['logs', 'contacts', 'settings', 'about']).catch('about')
})
