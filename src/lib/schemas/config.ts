import { dev } from '$app/environment'
import { z } from 'zod'
import { profile_sip } from './profile-sip'
import { profile_bot_discord } from './profile-bot-discord'

export const config = z.object({
	conference_enabled: z.boolean().catch(false),
	inbound_call_mode: z.enum(['R', 'DND', 'AA']).catch('R'),
	level_selected: z.enum(['IN', 'OUT']).catch('OUT'),
	level_in: z.number().catch(100),
	level_out: z.number().catch(100),
	muted_in: z.boolean().catch(false),
	muted_out: z.boolean().catch(false),
	// Secondary Panel
	secondary_panel_enabled: z.boolean().catch(true),
	secondary_panel_tab: z.enum(['logs', 'contacts', 'settings', 'about']).catch('about'),
	// Softphone
	sip_expert_settings_enabled: z.boolean().catch(false),
	sip_selected_profile_id: z.string().catch('default'),
	sip_profiles: profile_sip
		.array()
		.nonempty()
		.catch([
			{
				id: 'default',
				server_ws: '',
				server_sip: '',
				server_stun: '',
				username: '',
				login: '',
				password: '',
				number_voicemail: '',
				register: true,
				early_media: true
			}
		]),
	// Discord Bot
	bot_discord_autostart_enabled: z.boolean().catch(false),
	bot_discord_follow_mode_enabled: z.boolean().catch(true),
	bot_discord_selected_profile_id: z.string().catch('default'),
	bot_discord_profiles: profile_bot_discord
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
	// Interface
	auto_answer_delay_ms: z.number().catch(0),
	disconnected_timeout_ms: z.number().catch(2500),
	hold_unselected_calls: z.boolean().catch(true),
	after_dial_call_selection_mode: z.enum(['always', 'non-selected', 'never']).catch('always'),
	close_confirmation_mode: z.enum(['always', 'calls-active', 'never']).catch('calls-active'),
	dialpad_enabled: z.boolean().catch(true),
	dialpad_extended: z.boolean().catch(false),
	dialpad_numeric: z.boolean().catch(false),
	dialpad_touchescreen_mode: z.boolean().catch(false),
	// Sound
	conference_play_sounds: z.boolean().catch(true),
	sound_level_simulated_dtmf: z.number().default(10),
	sound_level_ring_in: z.number().catch(50),
	sound_level_ring_out: z.number().catch(50),
	sound_ring_in: z.string().catch('/sounds/ring-in.mp3'),
	sound_ring_out: z.string().catch('/sounds/ring-out.mp3'),
	sound_connected: z.string().catch('/sounds/connected.mp3'),
	sound_disconnected: z.string().catch('/sounds/disconnected.mp3'),
	sound_auto_answered: z.string().catch('/sounds/auto-answered.mp3'),
	sound_done: z.string().catch('/sounds/done.mp3'),
	// Accessibility
	mute_on_deafen: z.boolean().catch(true),
	haptics_disabled: z.boolean().catch(false),
	// Hidden Settings
	hidden_settings_enabled: z.boolean().catch(false),
	auto_record_enabled: z.boolean().catch(false),
	auto_redial_enabled: z.boolean().catch(false),
	auto_redial_delay_ms_min_max: z.tuple([z.number(), z.number()]).catch([2000, 4500]),
	auto_redial_max_sequential_failed_calls: z.number().catch(3),
	auto_redial_short_call_duration_ms: z.number().catch(4000),
	// Developer
	sip_debug_enabled: z.boolean().catch(dev),
	bot_discord_debug_enabled: z.boolean().catch(dev)
})
