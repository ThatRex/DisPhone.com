import EventEmitter from 'eventemitter3'
import { SDP } from './SDP'

export interface VoiceWebRTCSocket extends EventEmitter {
	on(event: 'track', listener: (event: MediaStreamTrack) => void): this
	on(event: 'error', listener: (event: MessageEvent<any>) => void): this
}

export class VoiceWebRTCSocket extends EventEmitter {
	private pc?: RTCPeerConnection
	private payloadType?: string

	public readonly debug: ((...args: any) => void) | null

	constructor(params: { debug?: boolean }) {
		super()

		this.debug = params.debug ? (...args) => console.debug(`[WebRTC Scoket]`, ...args) : null
	}

	public async openConnection(audioTrack: MediaStreamTrack) {
		if (this.pc) {
			this.emit('error', 'Unable to open connection; Connection is already open.')
			return
		}

		if (audioTrack.kind !== 'audio') {
			this.emit('error', 'Unable to open connection; Video tracks not supported.')
			return
		}

		this.pc = new RTCPeerConnection()
		this.pc.addTrack(audioTrack)
		this.pc.ontrack = ({ track }) => this.emit('track', track)
	}

	public async createOffer() {
		if (!this.pc) {
			this.emit('error', 'Unable to create offer; Peer connection is not open.')
			return
		}

		let { sdp } = await this.pc.createOffer()

		if (!sdp) {
			this.emit('error', 'Unable to create offer; No SDP was created.')
			return
		}

		this.debug?.(`SDP Offer Raw:\n${sdp}`)
		this.payloadType = sdp.match(/a=rtpmap:(\d+) opus/)![1]
		const ssrc = Number(sdp.match(/a=ssrc:(\d+) cname/)![1])

		sdp = await this.buildSDP('offer', sdp, this.payloadType!)

		this.debug?.(`SDP Offer Parsed:\n${sdp}`)

		await this.pc.setLocalDescription({ type: 'offer', sdp })

		return {
			sdp: sdp.trim().replaceAll('\r', ''),
			ssrc
		}
	}

	public async handleAnswer(sdp: string) {
		if (!this.pc) {
			this.emit('error', 'Unable to handle answer; Peer connection is not open.')
			return
		}

		this.debug?.(`SDP Answer Raw:\n${sdp}`)

		sdp = await this.buildSDP('answer', sdp, this.payloadType!)

		this.debug?.(`SDP Answer Parsed:\n${sdp}`)

		await this.pc.setRemoteDescription({ type: 'answer', sdp })
	}

	private async buildSDP(type: 'offer' | 'answer', sdp: string, payloadType: string) {
		const DESIRED_ATTRIBUTES = {
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

		const attKeys = Object.keys(DESIRED_ATTRIBUTES)
		const attVals = Object.values(DESIRED_ATTRIBUTES).flat()

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

		newSDP.concat([
			['a', `rtpmap:${payloadType} opus/48000/2`],
			['a', 'sendrecv'],
			['a', `setup:${type === 'answer' ? 'passive' : 'actpass'}`],
			['a', 'mid:0'],
			['a', 'rtcp-mux']
		])

		let extmapCount = 0
		for (const ema of extMapAttributes) {
			extmapCount++
			newSDP.add('a', `extmap:${extmapCount}${ema}`)
		}

		return newSDP.stringified
	}

	public destroy() {
		if (!this.pc) {
			this.emit('error', 'Unable to close connection; Peer connection is not open.')
			return
		}

		this.pc.close()
		this.pc = undefined
	}
}
