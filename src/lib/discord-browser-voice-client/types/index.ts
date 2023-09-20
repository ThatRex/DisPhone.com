export type AudioSettings = {
	bitrate_kbps: number
	stereo: boolean
	mode: 'sendrecv' | 'sendonly' | 'recvonly'
}

export type Codecs = {
	name: string
	type: string
	priority: number
	payload_type: number
	rtx_payload_type: number | null
}[]

export type VoiceServerUpdate = {
	t: 'VOICE_SERVER_UPDATE'
	s: number
	op: number
	d: {
		token: string
		guild_id: string
		endpoint: string
	}
}

export type VoiceStateUpdate = {
	t: 'VOICE_STATE_UPDATE'
	s: number
	op: number
	d: {
		member: {
			user: {
				username: string
				public_flags: number
				id: string
				global_name: null | string
				display_name: null | string
				discriminator: string
				bot: boolean
				avatar_decoration_data: null
				avatar: null | string
			}
			roles: string[]
			premium_since: null
			pending: boolean
			nick: null | string
			mute: boolean
			joined_at: string
			flags: number
			deaf: boolean
			communication_disabled_until: null
			avatar: null
		}
		user_id: string
		suppress: boolean
		session_id: string
		self_video: boolean
		self_mute: boolean
		self_deaf: boolean
		request_to_speak_timestamp: null | number
		mute: boolean
		guild_id: string | null
		deaf: boolean
		channel_id: string | null
	}
}
