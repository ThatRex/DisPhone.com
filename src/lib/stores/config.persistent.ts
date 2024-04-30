import { persisted } from 'svelte-persisted-store'
import z from 'zod'
import { dev } from '$app/environment'

const schema = z.object({
	// Inbound
	inbound_call_mode: z.enum(['R', 'DND', 'AA']).catch('R'),
	auto_answer_delay_ms: z.number().catch(0),
	disconnected_timeout_ms: z.number().catch(2500),
	// Conference
	conference_enabled: z.boolean().catch(false),
	conference_play_sounds: z.boolean().catch(false),
	// Levels
	level_selected: z.enum(['IN', 'OUT']).catch('OUT'),
	level_in: z.number().catch(100),
	level_out: z.number().catch(100),
	muted_in: z.boolean().catch(false),
	muted_out: z.boolean().catch(false),
	// Secondary Panel
	secondary_panel_enabled: z.boolean().catch(true),
	secondary_panel_tab_root: z.string().catch('config'),
	secondary_panel_tab_config: z.string().catch('phone'),
	hidden_settings_enabled: z.boolean().catch(false),
	auto_record_enabled: z.boolean().catch(false),
	// Interface
	window_mode_enabled: z.boolean().catch(false),
	// Accessibility
	haptics_disabled: z.boolean().catch(false),
	simulate_dtmf: z.boolean().catch(true),
	mute_on_deafen: z.boolean().catch(true),
	// Dialpad
	dialpad_enabled: z.boolean().catch(true),
	dialpad_extended: z.boolean().catch(false),
	dialpad_numeric: z.boolean().catch(false),
	dialpad_focus_dial_field: z.boolean().catch(true),
	// Auto Redial
	auto_redial_enabled: z.boolean().catch(false),
	auto_redial_max_sequential_short_calls: z.number().min(0).max(10).catch(3),
	auto_redial_short_call_time_ms: z.number().min(0).max(60000).catch(4000),
	auto_redial_delay_ms_min: z.number().min(0).max(300000).catch(2000),
	auto_redial_delay_ms_max: z.number().min(0).max(300000).catch(4500),
	// SIP
	sip_debug_enabled: z.boolean().catch(dev),
	sip_expert_settings_enabled: z.boolean().catch(false),
	sip_selected_profile_id: z.string().optional().catch(undefined),
	cfg_sip_profiles: z
		.object({
			id: z.string(),
			username: z.string(),
			login: z.string().optional(),
			password: z.string().optional(),
			sip_server: z.string(),
			ws_server: z.string().optional(),
			stun_server: z.string().optional(),
			voicemail_number: z.string().optional(),
			simultaneous_call_limit: z.number().catch(0),
			register: z.boolean().catch(true)
		})
		.array()
		.catch([]),
	// Discord Bot
	bot_discord_debug_enabled: z.boolean().catch(dev),
	bot_discord_autostart_enabled: z.boolean().catch(false),
	bot_discord_follow_mode_enabled: z.boolean().catch(true),
	bot_discord_selected_profile_id: z.string().optional().catch(undefined),
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
			bot_gateway: z.string().optional(),
			webhook: z.string().url().optional()
		})
		.array()
		.catch([]),
	// Sounds
	sound_browser_ring_in: z.string().catch('/sounds/ring-in.mp3'),
	sound_browser_ring_out: z.string().catch('/sounds/ring-out.mp3'),
	sound_browser_connected: z.string().catch('/sounds/connected.mp3'),
	sound_browser_disconnected: z.string().catch('/sounds/disconnected.mp3'),
	sound_browser_auto_answered: z.string().catch('/sounds/auto-answered.mp3'),
	sound_browser_done: z.string().catch('/sounds/done.mp3'),
	sound_browser_level_ring_in: z.number().catch(50),
	sound_browser_level_ring_out: z.number().catch(50),
	sound_bot_ring_in: z.string().catch('/sounds/ring-in.mp3'),
	sound_bot_ring_out: z.string().catch('/sounds/ring-out.mp3'),
	sound_bot_connected: z.string().catch('/sounds/connected.mp3'),
	sound_bot_disconnected: z.string().catch('/sounds/disconnected.mp3'),
	sound_bot_auto_answered: z.string().catch('/sounds/auto-answered.mp3'),
	sound_bot_done: z.string().catch('/sounds/done.mp3'),
	sound_bot_level_ring_in: z.number().catch(50),
	sound_bot_level_ring_out: z.number().catch(50),
	sound_conf_connected: z.string().catch('/sounds/connected.mp3'),
	sound_conf_disconnected: z.string().catch('/sounds/disconnected.mp3'),
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
