import { persisted } from 'svelte-persisted-store'
import z from 'zod'
import { dev } from '$app/environment'

const schema = z.object({
	tab_secondary_panel_config: z.string().catch('phone'),
	tab_secondary_panel: z.string().catch('config'),
	tgl_secondary_panel: z.boolean().catch(true),
	tgl_dialpad: z.boolean().catch(true),
	tgl_bot: z.boolean().catch(false),
	tgl_call_response_mode: z.enum(['RNG', 'DND', 'AA']).catch('RNG'),
	tgl_auto_conference: z.boolean().catch(false),
	tgl_muted: z.boolean().catch(false),
	tgl_deafened: z.boolean().catch(false),
	tgl_selected_level: z.enum(['IN', 'OUT']).catch('OUT'),
	lvl_in: z.number().catch(100),
	lvl_out: z.number().catch(100),
	cfg_window_mode: z.boolean().catch(false),
	cfg_debug_phone: z.boolean().catch(dev),
	cfg_debug_bot: z.boolean().catch(dev),
	cfg_simulate_dtmf: z.boolean().catch(true),
	cfg_dialpad_extended: z.boolean().catch(false),
	cfg_dialpad_numeric: z.boolean().catch(false),
	cfg_dialpad_focus_on_dial_feild: z.boolean().catch(true),
	cfg_sip_selected_profile_id: z.string().optional().catch(undefined),
	cfg_sip_profiles: z
		.object({
			id: z.string(),
			username: z.string(),
			login: z.string().optional(),
			password: z.string().optional(),
			sip_server: z.string(),
			ws_server: z.string().optional(),
			stun_server: z.string().optional(),
			register: z.boolean().catch(true)
		})
		.array()
		.catch([]),
	cfg_discord_follow_mode: z.boolean().catch(true),
	cfg_discord_selected_profile_id: z.string().optional().catch(undefined),
	cfg_discord_profiles: z
		.object({
			id: z.string(),
			name: z.string().optional(),
			usr_user_id: z.string(),
			bot_token: z.string(),
			bot_status_text: z.string().optional(),
			bot_status_mode: z
				.enum(['DYNAMIC', 'ONLINE', 'IDLE', 'DND', 'INVISIBLE'])
				.optional()
				.default('DYNAMIC'),
			webhook: z.string().url().optional()
		})
		.array()
		.catch([]),
	cfg_auto_answer_delay_ms: z.number().catch(1000),
	cfg_show_hidden_settings: z.boolean().catch(false),
	cfg_auto_record_enabled: z.boolean().catch(false),
	cfg_auto_redial_enabled: z.boolean().catch(false),
	cfg_auto_redial_max_sequential_short_calls: z.number().min(0).max(10).catch(3),
	cfg_auto_redial_short_call_time_ms: z.number().min(0).max(60000).catch(4000),
	cfg_auto_redial_delay_ms_min: z.number().min(0).max(300000).catch(2000),
	cfg_auto_redial_delay_ms_max: z.number().min(0).max(300000).catch(4500),
	snd_ringing_in: z.string().catch('/sounds/ring-in.mp3'),
	snd_ringing_out: z.string().catch('/sounds/ring-out.mp3'),
	snd_connected_one: z.string().catch('/sounds/connected-one.mp3'),
	snd_disconnected_one: z.string().catch('/sounds/disconnected-one.mp3'),
	snd_disconnected: z.string().catch('/sounds/disconnected.mp3'),
	snd_auto_answer: z.string().catch('/sounds/auto-answered.mp3')
})

export const config = persisted('config', schema.parse({}))

config.update((v) => {
	const res = schema.safeParse(v)
	if (res.success) return res.data
	else {
		console.warn('State Resetting. Error:', res.error)
		return schema.parse({})
	}
})
