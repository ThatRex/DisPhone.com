import { persisted } from 'svelte-persisted-store'
import z from 'zod'
import { dev } from '$app/environment'

export const schema = z.object({
	// Inbound
	inbound_call_mode: z.enum(['R', 'DND', 'AA']).catch('R'),
	auto_answer_delay_ms: z.number().catch(0),
	disconnected_timeout_ms: z.number().catch(2500),
	// Conference
	conference_enabled: z.boolean().catch(false),
	conference_play_sounds: z.boolean().catch(true),
	// Levels
	level_selected: z.enum(['IN', 'OUT']).catch('OUT'),
	level_in: z.number().catch(100),
	level_out: z.number().catch(100),
	muted_in: z.boolean().catch(false),
	muted_out: z.boolean().catch(false),
	// Secondary Panel
	secondary_panel_enabled: z.boolean().catch(true),
	secondary_panel_tab: z.enum(['logs', 'contacts', 'settings', 'about']).catch('about'),
	// Interface
	hold_unselected_calls: z.boolean().catch(true),
	after_dial_call_selection_mode: z.enum(['always', 'non-selected', 'never']).catch('always'),
	close_confirmation_mode: z.enum(['always', 'calls-active', 'never']).catch('calls-active'),
	dialpad_enabled: z.boolean().catch(true),
	dialpad_extended: z.boolean().catch(false),
	dialpad_numeric: z.boolean().catch(false),
	dialpad_focus_dial_field: z.boolean().catch(true),
	// Accessibility
	haptics_disabled: z.boolean().catch(false),
	simulate_dtmf: z.boolean().catch(true),
	mute_on_deafen: z.boolean().catch(true),
	// Hidden Settings
	hidden_settings_enabled: z.boolean().catch(false),
	auto_record_enabled: z.boolean().catch(false),
	auto_redial_enabled: z.boolean().catch(false),
	auto_redial_delay_ms_min_max: z.number().array().length(2).catch([2000, 4500]),
	auto_redial_max_sequential_failed_calls: z.number().catch(3),
	auto_redial_short_call_duration_ms: z.number().catch(4000),
	// SIP
	sip_debug_enabled: z.boolean().catch(dev),
	sip_expert_settings_enabled: z.boolean().catch(false),
	sip_selected_profile_id: z.string().catch('default'),
	sip_profiles: z
		.object({
			id: z.string(),
			ws_server: z.string().catch(''),
			sip_server: z.string().catch(''),
			username: z.string().catch(''),
			login: z.string().catch(''),
			password: z.string().catch(''),
			voicemail_number: z.string().catch(''),
			register: z.boolean().catch(true),
			early_media: z.boolean().catch(true)
		})
		.array()
		.nonempty()
		.catch([
			{
				id: 'default',
				ws_server: '',
				sip_server: '',
				username: '',
				login: '',
				password: '',
				voicemail_number: '',
				register: true,
				early_media: true
			}
		]),
	// Discord Bot
	bot_discord_debug_enabled: z.boolean().catch(dev),
	bot_discord_autostart_enabled: z.boolean().catch(false),
	bot_discord_follow_mode_enabled: z.boolean().catch(true),
	bot_discord_selected_profile_id: z.string().catch('default'),
	bot_discord_profiles: z
		.object({
			id: z.string(),
			name: z.string().catch(''),
			usr_user_id: z.string().catch(''),
			bot_token: z.string().catch(''),
			bot_invisible: z.boolean().catch(false),
			bot_status_text: z.string().catch('')
		})
		.array()
		.nonempty()
		.catch([
			{
				id: 'default',
				name: 'Default',
				usr_user_id: '',
				bot_token: '',
				bot_invisible: false,
				bot_status_text: ''
			}
		]),
	// Sounds
	sound_ring_in: z.string().catch('/sounds/ring-in.mp3'),
	sound_ring_out: z.string().catch('/sounds/ring-out.mp3'),
	sound_connected: z.string().catch('/sounds/connected.mp3'),
	sound_disconnected: z.string().catch('/sounds/disconnected.mp3'),
	sound_auto_answered: z.string().catch('/sounds/auto-answered.mp3'),
	sound_done: z.string().catch('/sounds/done.mp3'),
	sound_level_ring_in: z.number().catch(50),
	sound_level_ring_out: z.number().catch(50)
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
