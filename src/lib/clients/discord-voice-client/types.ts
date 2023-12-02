export type SocketState = keyof typeof SocketState
export const SocketState = {
	INITIAL: 'INITIAL',
	INITIALISING: 'INITIALISING',
	READY: 'READY',
	RESUMING: 'RESUMING',
	DONE: 'DONE',
	FAILED: 'FAILED'
} as const

export type AudioSettings = {
	bitrate_kbps: number
	stereo: boolean
	mode: 'sendrecv' | 'sendonly'
}

export type Codecs = {
	name: string
	type: string
	priority: number
	payload_type: number
	rtx_payload_type: number | null
}[]

export type ReceiverToDo = keyof typeof ReceiverToDo
export const ReceiverToDo = {
	NOTHING: 'NOTHING',
	ADD: 'ADD',
	REMOVE: 'REMOVE'
} as const

export type TransceiverType = keyof typeof TransceiverType
export const TransceiverType = {
	SENDER: 'SENDER',
	RECEIVER: 'RECEIVER'
} as const

export type Transceiver = Sender | Receiver

export type Sender = {
	type: typeof TransceiverType.SENDER
	transceiver: RTCRtpTransceiver
}

export type Receiver = {
	type: typeof TransceiverType.RECEIVER
	ssrc: number
	user_id: string
} & (
	| {
			todo: typeof ReceiverToDo.ADD | typeof ReceiverToDo.NOTHING
			transceiver?: RTCRtpTransceiver
	  }
	| {
			todo: typeof ReceiverToDo.REMOVE
			transceiver: RTCRtpTransceiver
	  }
)

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
