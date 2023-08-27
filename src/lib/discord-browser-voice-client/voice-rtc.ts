import EventEmitter from 'eventemitter3'
import { SDP } from './sdp'
import {
	VoiceRTCAnswerError,
	VoiceRTCConnectionError,
	VoiceRTCDestroyError,
	VoiceRTCOfferError
} from './errors'

export type AudioSettings = {
	bitrate_kbps?: number
	stereo?: boolean
	mode?: 'sendrecv' | 'sendonly' | 'recvonly'
}

export interface VoiceRTC extends EventEmitter {
	on(event: 'track', listener: (event: MediaStreamTrack) => void): this
	on(event: RTCPeerConnectionState, listener: () => void): this
	once(event: 'track', listener: (event: MediaStreamTrack) => void): this
	once(event: RTCPeerConnectionState, listener: () => void): this
	emit(event: 'track', track: MediaStreamTrack): boolean
	emit(event: RTCPeerConnectionState): boolean
}

export class VoiceRTC extends EventEmitter {
	private pc?: RTCPeerConnection
	private payloadType?: number
	private audioSettings?: AudioSettings

	public readonly debug: ((...args: any) => void) | null

	constructor(params: { debug?: boolean }) {
		super()

		this.debug = !params.debug ? null : (...args) => console.debug(`[Voice RTC]`, ...args)
	}

	public async openConnection(audioTrack: MediaStreamTrack, audioSettings?: AudioSettings) {
		if (this.pc) throw new VoiceRTCConnectionError('Peer Connection is already open.')
		if (audioTrack.kind !== 'audio')
			throw new VoiceRTCConnectionError('Video tracks not supported.')

		this.audioSettings = audioSettings ?? this.audioSettings
		this.pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' })
		this.pc.onconnectionstatechange = () => this.emit(this.pc!.connectionState)
		this.pc.addTrack(audioTrack)
		this.pc.ontrack = ({ track }) => {
			this.debug?.(`Track: (${track.kind}) ${track.id}`)
			if (track.kind === 'audio') this.emit('track', track)
		}
	}

	public async createOffer() {
		if (!this.pc) throw new VoiceRTCOfferError('Peer connection is not open.')

		let { sdp } = await this.pc.createOffer()
		if (!sdp) throw new VoiceRTCOfferError('No SDP was created.')
		this.debug?.(`SDP Offer Raw:\n${sdp}`)

		this.payloadType = Number(sdp.match(/a=rtpmap:(\d+) opus/)![1])
		const ssrc = Number(sdp.match(/a=ssrc:(\d+) cname/)![1])

		sdp = await this.buildSDP('offer', sdp, this.payloadType!, this.audioSettings)
		this.debug?.(`SDP Offer Parsed:\n${sdp}`)

		await this.pc.setLocalDescription({ type: 'offer', sdp })

		return {
			sdp: sdp.trim().replaceAll('\r', ''),
			codecs: [
				{
					name: 'opus',
					type: 'audio',
					priority: 1000,
					payload_type: this.payloadType,
					rtx_payload_type: null
				}
			],
			ssrc
		}
	}

	public async handleAnswer(sdp: string) {
		if (!this.pc) throw new VoiceRTCAnswerError('Peer connection is not open.')

		this.debug?.(`SDP Answer Raw:\n${sdp}`)
		sdp = await this.buildSDP('answer', sdp, this.payloadType!, this.audioSettings)
		this.debug?.(`SDP Answer Parsed:\n${sdp}`)

		await this.pc.setRemoteDescription({ type: 'answer', sdp })
	}

	private async buildSDP(
		type: 'offer' | 'answer',
		sdp: string,
		payloadType: number,
		audioSettings?: AudioSettings
	) {
		const desiredAttributes = {
			a: [
				'fingerprint',
				'extmap',
				'ice-pwd',
				'ice-ufrag',
				'ice-options',
				'candidate',
				'ssrc',
				'msid-semantic'
			],
			c: ['IN IP4']
		}

		const oldSDP = new SDP(sdp)
		const newSDP = new SDP()

		const extMapAttributes = new Set([
			' http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
		])

		const attKeys = Object.keys(desiredAttributes)
		const attVals = Object.values(desiredAttributes).flat()

		const mediaPort = sdp.match(/m=audio (\d+) /)![1]

		newSDP.concat([
			['v', '0'],
			['o', '- 0000000000000000000 0 IN IP4 0.0.0.0'],
			['s', '-'],
			['t', '0 0'],
			['a', 'group:BUNDLE 0'],
			['m', `audio ${mediaPort} RTP/SAVPF ${payloadType}`]
		])

		for (const [char, val] of oldSDP.parsed) {
			if (!attKeys.includes(char) || !attVals.filter((a) => val.includes(a)).length) continue

			if (val.match(/extmap:/)) extMapAttributes.add(val.replace(/extmap:\d+/, ''))
			else newSDP.add(char, val)
		}

		const bitrate = (audioSettings?.bitrate_kbps ?? 64) * 1_000
		const stereo = audioSettings?.stereo ? 1 : 0
		const offerMode = audioSettings?.mode ?? 'sendonly'
		const answerMode =
			offerMode === 'sendrecv' ? 'sendrecv' : offerMode === 'recvonly' ? 'sendonly' : 'recvonly'

		newSDP.concat([
			['a', type === 'answer' ? answerMode : offerMode],
			['a', `setup:${type === 'answer' ? 'passive' : 'actpass'}`],
			['a', 'mid:0'],
			['a', 'rtcp-mux'],
			['a', `rtpmap:${payloadType} opus/48000/2`],
			[
				'a',
				`fmtp:${payloadType} minptime=10;useinbandfec=1;stereo=${stereo};maxaveragebitrate=${bitrate}`
			]
		])

		let extmapCount = 0
		for (const ema of extMapAttributes) {
			extmapCount++
			newSDP.add('a', `extmap:${extmapCount}${ema}`)
		}

		return newSDP.stringified
	}

	public destroy() {
		if (!this.pc) throw new VoiceRTCDestroyError('Peer connection is not open.')
		this.debug?.('Closing')
		this.pc.close()
	}
}
