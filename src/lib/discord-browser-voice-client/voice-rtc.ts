import EventEmitter from 'eventemitter3'
import { SDP } from './utils/sdp'
import {
	VoiceRTCAnswerError,
	VoiceRTCConnectionError,
	VoiceRTCDestroyError,
	VoiceRTCOfferError
} from './errors'
import type { AudioSettings } from './types'

export interface VoiceRTC extends EventEmitter {
	on(event: 'track', listener: (event: MediaStreamTrack) => void): this
	on(event: 'sender', listener: (event: RTCRtpSender) => void): this
	on(event: RTCPeerConnectionState, listener: () => void): this
	once(event: 'track', listener: (event: MediaStreamTrack) => void): this
	once(event: 'sender', listener: (event: RTCRtpSender) => void): this
	once(event: RTCPeerConnectionState, listener: () => void): this
	emit(event: 'track', track: MediaStreamTrack): boolean
	emit(event: 'sender', sender: RTCRtpSender): boolean
	emit(event: RTCPeerConnectionState): boolean
}

export class VoiceRTC extends EventEmitter {
	private pc?: RTCPeerConnection

	private payload_type?: number
	private audio_settings?: AudioSettings
	private discord_sdp?: string

	private sender?: RTCRtpSender
	private receivers: {
		ssrc: number
		user_id: string
		transceiver: RTCRtpTransceiver
	}[] = []

	private last_offer_sdp?: string

	public readonly debug: ((...args: any) => void) | null

	constructor(params: { debug?: boolean }) {
		super()

		this.debug = !params.debug ? null : (...args) => console.debug(`[Voice RTC]`, ...args)
	}

	private findActiveReceiver(user_id: string) {
		return this.receivers.find(({ user_id: u, transceiver: t }) => {
			return user_id === u && !t.stopped
		})
	}

	public async openConnection(params: {
		audio_track?: MediaStreamTrack
		audio_settings: AudioSettings
	}) {
		const { audio_track, audio_settings } = params

		if (this.pc) {
			throw new VoiceRTCConnectionError('Peer Connection is already open.')
		}
		if (audio_track?.kind !== 'audio') {
			throw new VoiceRTCConnectionError('Video tracks not supported.')
		}
		if (!audio_track && this.audio_settings?.mode === 'recvonly') {
			throw new VoiceRTCConnectionError('An audio track must me provided when sending audio.')
		}

		this.audio_settings = audio_settings
		this.pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' })

		if (audio_track) {
			this.sender = this.pc.addTrack(audio_track)
			this.emit('sender', this.sender)
		}
	}

	public async maybeAddAudioReceiver(user_id: string, ssrc: number) {
		if (!this.pc) {
			throw new VoiceRTCOfferError('Peer connection is not open.')
		}

		console.log(this.receivers.map(({ transceiver }) => transceiver))

		if (this.audio_settings?.mode === 'sendonly') return
		if (this.findActiveReceiver(user_id)) return

		const transceiver = this.pc.addTransceiver('audio', { direction: 'recvonly' })

		this.receivers.push({
			ssrc,
			user_id,
			transceiver
		})

		this.emit('track', transceiver.receiver.track)

		await this.createOffer()
		await this.handleAnswer(this.discord_sdp!)
	}

	public async stopAudioReceiver(user_id: string) {
		if (!this.pc) {
			throw new VoiceRTCOfferError('Peer connection is not open.')
		}

		if (this.audio_settings?.mode === 'sendonly') return

		const receiver = this.findActiveReceiver(user_id)
		if (!receiver) return

		receiver.transceiver.stop()

		await this.createOffer()
		await this.handleAnswer(this.discord_sdp!)

		this.receivers = this.receivers.filter(
			({ transceiver }) => transceiver.currentDirection !== 'inactive'
		)
	}

	public async createOffer() {
		if (!this.pc) {
			throw new VoiceRTCOfferError('Peer connection is not open.')
		}

		const { sdp } = await this.pc.createOffer()

		if (!sdp) {
			throw new VoiceRTCOfferError('No SDP was created.')
		}

		this.debug?.(`SDP Offer:\n${sdp}`)
		this.last_offer_sdp = sdp
		await this.pc.setLocalDescription({ type: 'offer', sdp })

		const select_protocol_sdp = this.buildSelectProtocolSDP(sdp)
		this.debug?.(`Select Protocol SDP:\n${select_protocol_sdp}`)

		this.payload_type = Number(sdp.match(/a=rtpmap:(\d+) opus/)![1])
		const ssrc = Number(sdp.match(/a=ssrc:(\d+) cname/)![1])

		return {
			ssrc,
			sdp: select_protocol_sdp,
			codecs: [
				{
					name: 'opus',
					type: 'audio',
					priority: 1000,
					payload_type: this.payload_type,
					rtx_payload_type: null
				}
			]
		}
	}

	public async handleAnswer(discord_sdp: string) {
		if (!this.pc) {
			throw new VoiceRTCAnswerError('Peer connection is not open.')
		}

		this.debug?.(`SDP Answer Raw:\n${discord_sdp}`)
		this.discord_sdp = discord_sdp

		const sdp = new SDP([
			['v', '0'],
			['o', '- 0000000000000000000 0 IN IP4 0.0.0.0'],
			['s', '-'],
			['t', '0 0'],
			['a', 'msid-semantic: WMS *']
		])

		const mids = []
		const sdp_sections = new SDP()

		for (const [num, transceiver] of this.pc.getTransceivers().entries()) {
			const mid = transceiver.mid ? Number(transceiver.mid) : num

			const receiver = this.receivers.find(({ transceiver: t }) => transceiver === t)
			const receiver_details = !receiver
				? undefined
				: { ssrc: receiver.ssrc, user_id: receiver.user_id }

			const sdp_section = this.buildRemoteDescriptionSection({
				transceiver,
				discord_sdp,
				mid,
				receiver_details
			})

			sdp_sections.concat(sdp_section)

			if (!transceiver.stopped) mids.push(mid)
		}

		sdp.add('a', `group:BUNDLE ${mids.join(' ')}`)
		sdp.concat(sdp_sections.parsed)

		this.debug?.(`SDP Answer Parsed:\n${sdp.stringified}`)
		await this.pc.setRemoteDescription({ type: 'answer', sdp: sdp.stringified })
	}

	private buildRemoteDescriptionSection(params: {
		transceiver: RTCRtpTransceiver
		discord_sdp: string
		mid: number
		receiver_details?: {
			user_id: string
			ssrc: number
		}
	}) {
		if (!this.pc) {
			throw new VoiceRTCAnswerError('Peer connection is not open.')
		}

		const { transceiver, discord_sdp, mid, receiver_details } = params
		const { audio_settings, payload_type } = this

		if (transceiver.stopped) {
			if (!this.last_offer_sdp?.includes(`mid:${mid}`)) return []

			return new SDP([
				['m', 'audio 0 UDP/TLS/RTP/SAVPF 0'],
				['c', 'IN IP4 0.0.0.0'],
				['a', `mid:${mid}`],
				['a', 'inactive'],
				['a', 'rtpmap:0 PCMU/8000']
			]).parsed
		}

		const bitrate = audio_settings!.bitrate_kbps * 1_000
		const stereo = audio_settings!.stereo ? 1 : 0

		let mode = transceiver.direction
		if (mode === 'recvonly') mode = 'sendonly'
		else if (mode === 'sendonly') mode = 'recvonly'

		const sdp = new SDP(discord_sdp.replace('ICE/SDP', `UDP/TLS/RTP/SAVPF ${payload_type}`))

		sdp.concat([
			['a', mode],
			['a', 'setup:passive'],
			['a', `mid:${mid}`]
		])

		if (receiver_details) {
			const { ssrc, user_id } = receiver_details
			sdp.add('a', `msid:${user_id}-${ssrc} a${user_id}-${ssrc}`)
		}

		sdp.concat([
			['a', `rtpmap:${payload_type} opus/48000/2`],
			['a', `rtcp-fb:${payload_type} transport-cc`],
			['a', 'rtcp-mux'],
			[
				'a',
				['recvonly', 'sendrecv'].includes(mode)
					? `fmtp:${payload_type} minptime=10;useinbandfec=1;usedtx=1;stereo=${stereo};maxaveragebitrate=${bitrate}`
					: `fmtp:${payload_type} minptime=10;useinbandfec=1;usedtx=1`
			]
		])

		if (receiver_details) {
			const { ssrc, user_id } = receiver_details
			sdp.add('a', `ssrc:${ssrc} cname:${user_id}-${ssrc}`)
		}

		const extmap_attributes = [
			' urn:ietf:params:rtp-hdrext:ssrc-audio-level'
			// ' http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
		]

		for (const [num, attr] of extmap_attributes.entries()) {
			sdp.add('a', `extmap:${num + 1}${attr}`)
		}

		return sdp.parsed
	}

	private buildSelectProtocolSDP(sdp: string) {
		const s = new SDP(sdp.split('m=', 2).join('m=').trim())
		const attributes = ['fingerprint', 'ice-', 'extmap', 'rtpmap']
		s.set(s.parsed.filter(([, v]) => attributes.filter((a) => v.includes(a)).length))
		return s.stringified.trim().replaceAll('\r', '')
	}

	public destroy() {
		if (!this.pc) {
			throw new VoiceRTCDestroyError('Peer connection is not open.')
		}

		if (this.pc.connectionState === 'closed') return

		this.debug?.('Closing')

		for (const { transceiver } of this.receivers) transceiver.stop()
		this.receivers = []
		this.discord_sdp = undefined

		if (this.sender) {
			this.pc.removeTrack(this.sender)
			this.sender = undefined
		}

		this.pc.close()
	}
}
