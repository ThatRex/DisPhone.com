import EventEmitter from 'eventemitter3'
import { SDP } from './utils/sdp'
import {
	VoiceRTCAnswerError,
	VoiceRTCConnectionError,
	VoiceRTCDestroyError,
	VoiceRTCOfferError
} from './errors'
import {
	ReceiverToDo,
	type AudioSettings,
	type Receiver,
	TransceiverType,
	type Transceiver
} from './types'

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
	private audio_settings?: AudioSettings
	private discord_sdp?: string
	private processing = false
	private transceivers: Transceiver[] = []

	public readonly debug: ((...args: any) => void) | null

	constructor(params: { debug?: boolean }) {
		super()

		this.debug = !params.debug ? null : (...args) => console.debug(`[Voice RTC]`, ...args)
	}

	private buildSelectProtocolSDP(sdp: string) {
		const s = new SDP(sdp.split('m=', 2).join('m=').trim())
		const attributes = ['fingerprint', 'ice-', 'extmap', 'rtpmap']
		s.set(s.parsed.filter(([, v]) => attributes.filter((a) => v.includes(a)).length))
		const select_protocol_sdp = s.stringified.trim().replaceAll('\r', '')
		this.debug?.(`Select Protocol SDP:\n${select_protocol_sdp}`)
		return select_protocol_sdp
	}

	private async createOffer() {
		if (!this.pc) {
			throw new VoiceRTCOfferError('Peer connection is not open.')
		}

		const { sdp } = await this.pc.createOffer()

		if (!sdp) {
			throw new VoiceRTCOfferError('No SDP was created.')
		}

		this.debug?.(`SDP Offer:\n${sdp}`)
		return { sdp }
	}

	private getNonStoppedReceiver(user_id: string) {
		const index = this.transceivers.findIndex((t) => {
			if (t.type === TransceiverType.Sender) return false
			else return t.user_id === user_id && !t.transceiver?.stopped
		})

		const receiver = this.transceivers[index]

		return receiver as Receiver | undefined
	}

	public setDiscordSDP(sdp: string) {
		this.debug?.(`SDP Discord Raw:\n${sdp}`)
		this.discord_sdp = sdp
		this.processReceivers()
	}

	/** Inits the connection. */
	public async init(params: { audio_track?: MediaStreamTrack; audio_settings: AudioSettings }) {
		const { audio_track, audio_settings } = params

		if (this.pc) {
			throw new VoiceRTCConnectionError('Peer Connection is already open.')
		}
		if (audio_track?.kind !== 'audio') {
			throw new VoiceRTCConnectionError('Video tracks not supported.')
		}
		if (!audio_track && this.audio_settings?.mode !== 'recvonly') {
			throw new VoiceRTCConnectionError('An audio track must be provided when sending audio.')
		}

		this.audio_settings = audio_settings
		this.pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' })

		if (audio_track) {
			const transceiver = this.pc!.addTransceiver(audio_track, { direction: 'sendonly' })
			this.emit('sender', transceiver.sender)
			this.transceivers.push({
				type: TransceiverType.Sender,
				transceiver
			})
		}

		const { sdp } = await this.createOffer()

		await this.pc.setLocalDescription({ type: 'offer', sdp })

		const select_protocol_sdp = this.buildSelectProtocolSDP(sdp)
		const payload_type = Number(sdp.match(/a=rtpmap:(\d+) opus/)![1])
		const ssrc = Number(sdp.match(/a=ssrc:(\d+) cname/)![1])

		return {
			ssrc,
			select_protocol_sdp,
			codecs: [
				{
					name: 'opus',
					type: 'audio',
					priority: 1000,
					payload_type,
					rtx_payload_type: null
				}
			]
		}
	}

	/** Add user audio receiver if no active user receiver is found. */
	public addUserAudioReceiver(user_id: string, ssrc: number) {

		const receiver = this.getNonStoppedReceiver(user_id)

		if (!receiver) {
			this.transceivers.push({
				type: TransceiverType.Receiver,
				user_id,
				ssrc,
				todo: ReceiverToDo.Add
			})

			this.processReceivers()
			return
		}

		if (receiver.todo === ReceiverToDo.Remove) {
			receiver.todo = ReceiverToDo.Nothing as typeof ReceiverToDo.Remove
		}
	}

	/** Stop active user receiver. */
	public stopUserAudioReceiver(user_id: string) {
		const receiver = this.getNonStoppedReceiver(user_id)

		if (!receiver) return

		if (receiver.todo === ReceiverToDo.Add) {
			receiver.todo = ReceiverToDo.Nothing
			return
		}

		receiver.todo = ReceiverToDo.Remove
		this.processReceivers()
	}

	private async processReceivers() {
		if (this.processing || !this.discord_sdp) return

		this.debug?.(`Processing Started\ntransceivers:`, this.transceivers)
		this.processing = true

		for (const t of this.transceivers) {
			if (t.type === TransceiverType.Sender) continue

			if (t.todo === ReceiverToDo.Add) {
				const transceiver = this.pc!.addTransceiver('audio', { direction: 'recvonly' })
				this.emit('track', transceiver.receiver.track)
				t.transceiver = transceiver
				t.todo = ReceiverToDo.Nothing
				continue
			}

			if (t.todo === ReceiverToDo.Remove) {
				t.transceiver.stop()
				t.todo = ReceiverToDo.Nothing as typeof ReceiverToDo.Remove
				continue
			}
		}

		this.debug?.(`Processed Before Update\ntransceivers:`, this.transceivers)

		try {
			await this.updatePeerConnection(this.discord_sdp)
		} catch (e) {
			console.warn('Error Updating Peer Connection: ', e)
		}

		this.debug?.(`Processed After Update\ntransceivers:`, this.transceivers)

		const continueProcessing = this.transceivers.find((t) => {
			if (t.type === TransceiverType.Sender) return false
			else return t.todo !== ReceiverToDo.Nothing
		})

		this.processing = false

		if (continueProcessing) {
			this.debug?.(`Processing Continuing`)
			await this.processReceivers()
			return
		}

		this.debug?.(`Processing Done\ntransceivers:`, this.transceivers)
	}

	private async updatePeerConnection(discord_sdp: string) {
		if (!this.pc) {
			throw new VoiceRTCAnswerError('Peer connection is not open.')
		}

		const { sdp: offer_sdp } = await this.createOffer()
		await this.pc!.setLocalDescription({ type: 'offer', sdp: offer_sdp })

		const remote_sdp = new SDP()
		for (const [i, s] of offer_sdp.split('m=').entries()) {
			const section = new SDP(i === 0 ? s : `m=${s}`)
			const parsed_section = new SDP()

			const [, fingerprint, in_ip4, rtcp, ice_ufrag, ice_pwd, , candidate] = discord_sdp
				.replaceAll('\n\r', '\n')
				.split('\n')
				.map((line) => line.split('=')[1])

			if (i === 0) {
				for (const [chr, val] of section.parsed) {
					if (val.startsWith('fingerprint')) {
						parsed_section.add(chr, fingerprint)
						continue
					}

					parsed_section.add(chr, val)
				}

				remote_sdp.concat(parsed_section.parsed)
				continue
			}

			const inactive_section = section.stringified.includes('inactive')
			if (inactive_section) {
				remote_sdp.concat(section.parsed)
				continue
			}

			const mid = section.stringified.match(/a=mid:(\d+)/)![1]
			const payload_type = offer_sdp.match(/a=rtpmap:(\d+) opus/)![1]
			const transceiver = this.transceivers.find(({ transceiver }) => transceiver?.mid === mid)!
			const rtcp_num = rtcp.split(':')[1]

			for (const [chr, val] of section.parsed) {
				if (i === 1 && val.startsWith(`fmtp:${payload_type}`)) {
					const bitrate = this.audio_settings!.bitrate_kbps * 1_000
					const stereo = this.audio_settings!.stereo ? 1 : 0
					const v = `fmtp:${payload_type} minptime=10;useinbandfec=1;usedtx=1;stereo=${stereo};maxaveragebitrate=${bitrate}`
					parsed_section.add(chr, v)
					continue
				}

				if (val.startsWith('setup:actpass')) {
					parsed_section.add(chr, 'setup:passive')
					continue
				}

				if (chr === 'm') {
					parsed_section.add(chr, `audio ${rtcp_num} UDP/TLS/RTP/SAVPF ${payload_type}`)
					continue
				}

				if (chr === 'c') {
					parsed_section.add(chr, in_ip4)
					continue
				}

				if (val.startsWith('fingerprint')) {
					parsed_section.add(chr, fingerprint)
					continue
				}

				if (val.startsWith('ice-ufrag')) {
					parsed_section.add(chr, ice_ufrag)
					continue
				}

				if (val.startsWith('ice-pwd')) {
					parsed_section.add(chr, ice_pwd)
					continue
				}

				if (val.startsWith('sendonly')) {
					parsed_section.add(chr, 'recvonly')
					continue
				}

				if (val.startsWith('recvonly')) {
					parsed_section.add(chr, 'sendonly')
					continue
				}

				if (val.startsWith('candidate')) continue
				if (val.startsWith('end-of-candidates')) continue
				if (val.startsWith('ssrc')) continue
				if (val.startsWith('msid')) continue
				if (val.startsWith('rtcp:')) continue
				if (val.startsWith('rtpmap:') && !val.startsWith(`rtpmap:${payload_type}`)) continue
				if (val.startsWith('fmtp:') && !val.startsWith(`fmtp:${payload_type}`)) continue
				if (val.startsWith('rtcp-fb:') && !val.startsWith(`rtcp-fb:${payload_type}`)) continue

				parsed_section.add(chr, val)
			}

			parsed_section.add('a', `rtcp:${rtcp_num}`)
			parsed_section.add('a', candidate)

			if (transceiver.type === TransceiverType.Receiver) {
				const { user_id, ssrc } = transceiver
				parsed_section.add('a', `msid:${user_id}-${ssrc} a${user_id}-${ssrc}`)
				parsed_section.add('a', `ssrc:${ssrc} cname:${user_id}-${ssrc}`)
			}

			remote_sdp.concat(parsed_section.parsed)
		}

		this.debug?.(`SDP Answer Parsed:\n${remote_sdp.stringified}`)
		await this.pc.setRemoteDescription({ type: 'answer', sdp: remote_sdp.stringified })
	}

	/** Stop all transceivers and closes connection. */
	public destroy() {
		if (!this.pc) {
			throw new VoiceRTCDestroyError('Peer connection is not open.')
		}

		if (this.pc.connectionState === 'closed') return

		this.debug?.('Closing')
		for (const transceiver of this.pc.getTransceivers()) transceiver.stop()
		this.pc.close()
	}
}
