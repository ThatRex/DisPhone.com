import type { VoiceOpcodes } from 'discord-api-types/voice'

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
	type: 'SENDER'
	transceiver: RTCRtpTransceiver
}

export type Receiver = (
	| { todo: Exclude<ReceiverToDo, 'REMOVE'>; transceiver?: RTCRtpTransceiver }
	| { todo: 'REMOVE'; transceiver: RTCRtpTransceiver }
) & {
	type: 'RECEIVER'
	ssrc: number
	user_id: string
}

export type VoiceSendPayload =
	| VoiceIdentify
	| VoiceSelectProtocol
	| VoiceResume
	| VoiceHeartbeat
	| VoiceSpeakingSend
export type VoiceReceivePayload =
	| VoiceReady
	| VoiceSessionDescription
	| VoiceSpeakingReceive
	| VoiceHeartbeatAck
	| VoiceHello
	| VoiceResumed
	| VoiceClientConnect
	| VoiceClientDisconnect

interface VoiceDataPayload<OP extends VoiceOpcodes, D = unknown> {
	op: OP
	d: D
}

export type VoiceIdentify = VoiceDataPayload<VoiceOpcodes.Identify, VoiceIdentifyData>
export interface VoiceIdentifyData {
	server_id: string
	user_id: string
	session_id: string
	token: string
	video: boolean
}

export type VoiceSelectProtocol = VoiceDataPayload<
	VoiceOpcodes.SelectProtocol,
	VoiceSelectProtocolData
>
export interface VoiceSelectProtocolData {
	protocol: string
	data: string
	sdp: string
	codecs: Codecs
}

export type VoiceReady = VoiceDataPayload<VoiceOpcodes.Ready, VoiceReadyData>
export interface VoiceReadyData {
	streams: {
		type: string
		ssrc: number
		rtx_ssrc: number
		rid: string
		quality: number
		active: boolean
	}[]
	ssrc: number
	port: number
	modes: string[]
	ip: string
}

export type VoiceHeartbeat = VoiceDataPayload<VoiceOpcodes.Heartbeat, string>

export type VoiceSessionDescription = VoiceDataPayload<
	VoiceOpcodes.SessionDescription,
	VoiceSessionDescriptionData
>
export interface VoiceSessionDescriptionData {
	video_codec: string
	sdp: string
	media_session_id: string
	audio_codec: string
}

export type VoiceSpeakingSend = VoiceDataPayload<VoiceOpcodes.Speaking, VoiceSpeakingSendData>
export interface VoiceSpeakingSendData {
	speaking: 0 | 1
	delay: number
	ssrc: number
}

export type VoiceSpeakingReceive = VoiceDataPayload<VoiceOpcodes.Speaking, VoiceSpeakingReceiveData>
export interface VoiceSpeakingReceiveData {
	speaking: 0 | 1
	user_id: string
	ssrc: number
}

export type VoiceHeartbeatAck = VoiceDataPayload<VoiceOpcodes.HeartbeatAck, string>

export type VoiceResume = VoiceDataPayload<VoiceOpcodes.Resume, VoiceResumeData>
export interface VoiceResumeData {
	server_id: string
	session_id: string
	token: string
}

export type VoiceHello = VoiceDataPayload<VoiceOpcodes.Hello, VoiceHelloData>
export interface VoiceHelloData {
	v: number
	heartbeat_interval: number
}

export type VoiceResumed = VoiceDataPayload<VoiceOpcodes.Resumed, null>

export type VoiceClientConnect = VoiceDataPayload<
	VoiceOpcodes.ClientConnect,
	VoiceClientConnectData
>
export interface VoiceClientConnectData {
	user_id: string
	ssrc: number
	speaking: 0 | 1
}

export type VoiceClientDisconnect = VoiceDataPayload<
	VoiceOpcodes.ClientDisconnect,
	VoiceClientDisconnectData
>
export interface VoiceClientDisconnectData {
	user_id: string
}
