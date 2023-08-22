import EventEmitter from 'eventemitter3'
import { SDP, type ParsedSDP } from './SDP'

const SDP_START = [
	['v', '0'],
	['o', '- 1234567890123456789 0 IN IP4 0.0.0.0'],
	['s', '-'],
	['t', '0 0']
] as ParsedSDP

const DESIRED_ATTRIBUTES = {
	a: ['fingerprint', 'extmap', 'ice-pwd', 'ice-ufrag', 'ice-options', 'candidate', 'ssrc'],
	c: ['IN IP4']
}

const REQUIRED_EXTMAP_ATTRIBUTES = [
	' http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
	' urn:ietf:params:rtp-hdrext:toffset',
	'/recvonly http://www.webrtc.org/experiments/rtp-hdrext/playout-delay',
	' http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
]

export interface VoiceWebRTCSocket extends EventEmitter {
	on(event: 'packet', listener: (event: any) => void): this
	on(event: 'error', listener: (event: MessageEvent<any>) => void): this
	on(event: 'open', listener: (event: MessageEvent<any>) => void): this
	on(event: 'close', listener: (event: MessageEvent<any>) => void): this
}

export class VoiceWebRTCSocket extends EventEmitter {
	private pc?: RTCPeerConnection
	private payloadType?: string

	public readonly debug: ((...args: any) => void) | null

	constructor(params: { debug?: boolean }) {
		super()

		this.debug = params.debug ? (...args) => console.debug(`[WebRTC Scoket]`, ...args) : null
	}

	public async openConnection(stream: MediaStream) {
		this.pc = new RTCPeerConnection()

		const tracks = stream.getAudioTracks()

		if (!tracks.length) {
			this.emit('error', 'Unable to open connection; Media Stream must contain at least one track.')
			return
		}

		this.pc.addTrack(tracks[0])
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
			sdp,
			ssrc
		}
	}

	public async handleAnswer(sdp: string) {
		if (!this.pc) {
			this.emit('error', 'Unable to handle answer; Peer connection is not open.')
			return
		}

		sdp = await this.buildSDP('answer', sdp, this.payloadType!)

		this.debug?.(`SDP Answer Parsed:\n${sdp}`)

		await this.pc.setRemoteDescription({ type: 'answer', sdp })
	}

	private async buildSDP(type: 'offer' | 'answer', sdp: string, payloadType: string) {
		const oldSDP = new SDP(sdp)
		const newSDP = new SDP(SDP_START)

		newSDP.add('a', 'group:BUNDLE 0')
		newSDP.add('m', `audio 9 RTP/SAVPF ${payloadType}`)

		const extMapAttributes = new Set(REQUIRED_EXTMAP_ATTRIBUTES)

		const attKeys = Object.keys(DESIRED_ATTRIBUTES)
		const attVals = Object.values(DESIRED_ATTRIBUTES).flat()

		oldSDP.parsed.map(([char, val]) => {
			if (attKeys.includes(char) && attVals.filter((a) => val.includes(a)).length) {
				if (val.match(/extmap:/)) extMapAttributes.add(val.replace(/extmap:\d+/, ''))
				else newSDP.add(char, val)
			}
		})

		newSDP.add('a', `rtpmap:${payloadType} opus/48000/2`)
		newSDP.add('a', 'sendrecv')
		newSDP.add('a', 'setup:passive')
		newSDP.add('a', 'mid:0')
		newSDP.add('a', `rtcp-${payloadType}`)
		newSDP.add('a', 'rtcp-mux')

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
	}
}
