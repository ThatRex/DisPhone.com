/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from 'eventemitter3'
import { UserAgentState, Session, Inviter, Invitation, URI, SessionState, Web } from 'sip.js'
import { makeURI } from './utils'
import { Profile } from './profile'
import { startMediaFlow, wait } from '$lib/utils'

export type CallType = keyof typeof CallType
export const CallType = {
	INBOUND: 'INBOUND',
	OUTBOUND: 'OUTBOUND'
} as const

export type CallProgress = keyof typeof CallProgress
export const CallProgress = {
	INITIAL: 'INITIAL',
	WAITING: 'WAITING',
	CONNECTING: 'CONNECTING',
	CONNECTED: 'CONNECTED',
	DISCONNECTED: 'DISCONNECTED'
} as const

export type OutboundCallDetail = { sequence: string[]; destination: URI }

export type CallDetail = {
	type: CallType
	progress: CallProgress
	start_time: number
	next_sequence_idx: number
	sequential_failed_calls: number
	auto_redialed_count: number
	media: boolean
	dtmf_receptible: boolean

	on_hold: boolean
	auto_redialing: boolean
	deafened: boolean
	muted: boolean

	destination?: string
	identity?: string
	reason?: string

	auto_redial_limit: number
	auto_redial_delay_ms_min_max: [number, number]
	auto_redial_max_sequential_failed_calls: number
	auto_redial_short_call_duration_ms: number
}

interface Call extends EventEmitter {
	on(event: 'detail', listener: (detail: CallDetail) => void): this
	on(event: 'dtmf', listener: (dtmf: string) => void): this
	emit(event: 'detail', detail: CallDetail): boolean
	emit(event: 'dtmf', dtmf: string): boolean
}

class Call extends EventEmitter {
	private readonly debug?: (...args: any) => void

	public readonly id = window.crypto.randomUUID()

	private readonly profile: Profile
	private readonly uri: URI
	private readonly sequence: readonly string[]

	private get destination() {
		const dest = this.uri.user || this.uri.toRaw().replace('sip:', '')
		const seq = Array.from(this.sequence)
		const seq_uri_idx = seq.indexOf('DEST')
		seq[seq_uri_idx] = dest.replaceAll('%23', '#')
		return seq.join('')
	}

	private detail: CallDetail = {
		type: 'UNKNOWN' as CallType,
		progress: 'INITIAL',
		start_time: 0,
		next_sequence_idx: 0,
		sequential_failed_calls: 0,
		auto_redialed_count: 0,
		media: false,
		dtmf_receptible: false,

		on_hold: false,
		auto_redialing: false,
		deafened: false,
		muted: false,

		destination: undefined,
		identity: undefined,
		reason: undefined,

		auto_redial_limit: 0,
		auto_redial_delay_ms_min_max: [2000, 4500],
		auto_redial_max_sequential_failed_calls: 3,
		auto_redial_short_call_duration_ms: 4000
	}

	/* session */

	private initMedia() {
		if (this.detail.media) return

		const { remoteMediaStream, peerConnection } = this.session
			.sessionDescriptionHandler as Web.SessionDescriptionHandler

		if (!remoteMediaStream.getAudioTracks().length) return

		const [track_in] = this.dst_i.stream.getAudioTracks()
		peerConnection!.getSenders()[0].replaceTrack(track_in)
		this.ac.createMediaStreamSource(remoteMediaStream).connect(this.gin_o)
		startMediaFlow(remoteMediaStream)

		this.updateDetail({ media: true })
	}

	private _session?: Session

	private get session() {
		if (!this._session) throw Error('No Session.')
		return this._session
	}

	private sessionStateListener = async (state: SessionState) => {
		this.debug?.('Session State Update:', state)
		switch (state) {
			case SessionState.Establishing: {
				const identity = this.session.assertedIdentity?.friendlyName
				this.updateDetail({ progress: 'CONNECTING', identity, start_time: Date.now() })
				break
			}

			case SessionState.Established: {
				this.updateDetail({
					progress: 'CONNECTED',
					identity: this.session.assertedIdentity?.friendlyName,
					start_time: Date.now(),
					dtmf_receptible: true
				})

				if (this.detail.on_hold) {
					if (this.detail.type === 'INBOUND') await wait(200) // less times always results in fail
					await this._setHold(true)
				}

				this.initMedia()
				this.runSequence()
				break
			}

			case SessionState.Terminated: {
				this.updateDetail({
					next_sequence_idx: 0,
					identity: undefined,
					media: false,
					dtmf_receptible: false,
					on_hold: false
				})
				;(() => {
					if (!this.detail.auto_redialing || !this.detail.start_time) return

					if (
						this.detail.auto_redial_limit &&
						this.detail.auto_redialed_count + 1 < this.detail.auto_redial_limit
					) {
						this.updateDetail({
							auto_redialing: false,
							sequential_failed_calls: 0,
							auto_redialed_count: 0
						})
						return
					}

					if (
						this.detail.progress === 'CONNECTED' &&
						Date.now() - this.detail.start_time >= this.detail.auto_redial_short_call_duration_ms
					) {
						this.updateDetail({ sequential_failed_calls: 0 })
						return
					}

					const sequential_failed_calls = this.detail.sequential_failed_calls

					if (sequential_failed_calls + 1 === this.detail.auto_redial_max_sequential_failed_calls) {
						this.updateDetail({ auto_redialing: false, sequential_failed_calls: 0 })
					} else {
						this.updateDetail({ sequential_failed_calls: sequential_failed_calls + 1 })
					}
				})()

				if (this.detail.auto_redialing) {
					const [min, max] = this.detail.auto_redial_delay_ms_min_max
					const ms = Math.floor(Math.random() * (max - min + 1)) + min

					this.updateDetail({
						type: 'OUTBOUND',
						progress: 'WAITING',
						start_time: Date.now() + ms
					})

					setTimeout(() => {
						if (!this.detail.auto_redialing) {
							if (this.detail.progress !== 'DISCONNECTED')
								this.updateDetail({ progress: 'DISCONNECTED' })
							return
						}
						this.updateDetail({
							progress: 'INITIAL',
							auto_redialed_count: this.detail.auto_redial_limit
								? this.detail.auto_redialed_count + 1
								: 0
						})
						this.init()
					}, ms)

					return
				}

				this.updateDetail({ progress: 'DISCONNECTED' })
				break
			}
		}
	}

	/* audio */

	private readonly ac: AudioContext
	private readonly dst_i: MediaStreamAudioDestinationNode
	private readonly gin_i: GainNode
	private readonly dst_o: MediaStreamAudioDestinationNode
	private readonly gin_o: GainNode
	private readonly src_o: MediaStreamAudioSourceNode

	public get dst() {
		return this.gin_i
	}

	public get src() {
		return this.src_o
	}

	constructor(
		params: (
			| { type: 'INBOUND'; invitation: Invitation }
			| { type: 'OUTBOUND'; detail: OutboundCallDetail }
		) & {
			profile: Profile
			debug?: boolean
		}
	) {
		super()
		this.debug = params.debug ? (...args) => console.debug(`[Call ${this.id}]`, ...args) : undefined

		this.on('detail', (d) => {
			this.debug?.('Call Detail Update:', d)
			this.detail = d
		})

		this.profile = params.profile
		this.ac = params.profile.ac

		this.dst_i = this.ac.createMediaStreamDestination()
		this.gin_i = this.ac.createGain()
		this.gin_i.connect(this.dst_i)

		this.dst_o = this.ac.createMediaStreamDestination()
		this.gin_o = this.ac.createGain()
		this.gin_o.connect(this.dst_o)
		this.src_o = this.ac.createMediaStreamSource(this.dst_o.stream)

		switch (params.type) {
			case CallType.INBOUND: {
				this._session = params.invitation
				this.session.stateChange.addListener(this.sessionStateListener)
				this.uri = this.session.remoteIdentity.uri
				this.sequence = ['DEST']
				break
			}

			case CallType.OUTBOUND: {
				this.sequence = params.detail.sequence
				this.uri = params.detail.destination
				break
			}
		}

		this.detail.type = params.type
		this.detail.destination = this.destination

		this.profile.ua.stateChange.addListener((state) => {
			switch (state) {
				case UserAgentState.Stopped: {
					this.updateDetail({ auto_redialing: false })
					break
				}
			}
		})
	}

	private updateDetail(detail: Partial<CallDetail>, update_undefined = true) {
		if (!update_undefined) {
			for (const k of Object.keys(detail)) {
				const key = k as keyof typeof detail
				const val = detail[key]
				if (val === undefined) delete detail[key]
			}
		}

		// always clear existing reason on state change
		if (!detail.reason && detail.progress !== this.detail.progress) {
			this.emit('detail', { ...this.detail, ...detail, reason: undefined })
			return
		}
		this.emit('detail', { ...this.detail, ...detail })
	}

	private async runSequence() {
		if (this.detail.type === 'INBOUND') return
		if (this.detail.progress === 'DISCONNECTED') return

		const next = () => this.updateDetail({ next_sequence_idx: this.detail.next_sequence_idx + 1 })

		const item = this.sequence[this.detail.next_sequence_idx]
		if (!item) return

		this.debug?.('Sequence Item:', item)

		switch (item) {
			case 'DEST': {
				await this.invite()
				next()
				return
			}
			case ';': {
				if (this.detail.progress === 'INITIAL') this.updateDetail({ progress: 'WAITING' })
				await wait(1000)
				next()
				break
			}
			case ',': {
				if (this.detail.progress === 'INITIAL') this.updateDetail({ progress: 'WAITING' })
				await wait(200)
				next()
				break
			}
			default: {
				const sent = this.sendDTMF(item)
				if (sent) next()
				await wait(150)
			}
		}

		await this.runSequence()
	}

	public async answer() {
		if (this.detail.type !== 'INBOUND') return
		if (this.detail.progress !== 'CONNECTING') return
		this.debug?.('Answer')
		const session_in = this.session as Invitation
		await session_in.accept()
	}

	private async invite() {
		if (this.profile.ua.state === UserAgentState.Stopped) return
		this.debug?.('Invite')

		const sessionDescriptionHandlerOptions: Web.SessionDescriptionHandlerOptions = {
			constraints: { audio: true },
			hold: this.detail.on_hold
		}

		this._session = new Inviter(this.profile.ua, this.uri, {
			earlyMedia: this.profile.early_media,
			sessionDescriptionHandlerOptions
			// extraHeaders: [`P-Preferred-Identity: <sip:0123456789@${this.profile.ua.configuration.uri.host}>`], // future feature maybe
		})
		const session_out = this.session as Inviter
		session_out.stateChange.addListener(this.sessionStateListener)

		await session_out.invite({
			requestDelegate: {
				onReject: ({ message: { reasonPhrase, statusCode } }) =>
					this.updateDetail({ reason: `${statusCode} ${reasonPhrase}` }),
				onProgress: ({ message: { reasonPhrase, statusCode } }) => {
					this.initMedia()
					this.updateDetail(
						{
							reason: reasonPhrase,
							dtmf_receptible: statusCode === 183 || undefined
						},
						false
					)
				},
				onTrying: (response) => this.updateDetail({ reason: response.message.reasonPhrase })
			}
		})
	}

	/*
	Controls
	*/

	public init() {
		if (this.detail.progress !== 'INITIAL') return
		this.debug?.('Initiating')
		switch (this.detail.type) {
			case 'INBOUND': {
				const identity = this.session.assertedIdentity?.friendlyName
				this.updateDetail({ progress: 'CONNECTING', identity, start_time: Date.now() })
				break
			}
			case 'OUTBOUND': {
				this.updateDetail({ progress: 'WAITING', start_time: Date.now() })
				this.runSequence()
				break
			}
		}
	}

	public sendDTMF(value: string) {
		const key = value.replace(/[^0-9A-D#*]/g, '')
		this.debug?.('Sending DTMF:', key)
		const sent = this.session.sessionDescriptionHandler?.sendDtmf(key, {
			duration: 150,
			interToneGap: 0
		})
		if (sent) this.emit('dtmf', key)
		return sent ?? false
	}

	private async _setHold(value: boolean) {
		if (this.session.state !== SessionState.Established) {
			this.updateDetail({ on_hold: value })
			return
		}

		this.session.sessionDescriptionHandlerOptionsReInvite = {
			hold: value
		} as Web.SessionDescriptionHandlerOptions

		try {
			await new Promise((resolve, reject) => {
				this.session.invite({
					requestDelegate: {
						onAccept: resolve,
						onReject: reject
					}
				})
			})
		} catch {
			this.updateDetail({ on_hold: !value })
			return
		}

		if (!value) this.initMedia()
		this.updateDetail({ on_hold: value })
	}

	public setHold(value: boolean) {
		if (value === this.detail.on_hold) return
		this._setHold(value)
	}

	public setDeaf(value: boolean) {
		if (value === this.detail.deafened) return
		this.gin_i.gain.value = value ? 0 : 1
		this.updateDetail({ deafened: value })
	}

	public setMute(value: boolean) {
		if (value === this.detail.muted) return
		this.gin_o.gain.value = value ? 0 : 1
		this.updateDetail({ muted: value })
	}

	public setAutoRedial(params: {
		value?: boolean
		limit?: number
		delay_ms_min_max?: [number, number]
		max_sequential_failed_calls?: number
		short_call_duration_ms?: number
	}) {
		this.updateDetail(
			{
				auto_redialing: params.value,

				auto_redialed_count: params.value === false ? 0 : undefined,
				sequential_failed_calls: params.value === false ? 0 : undefined,

				auto_redial_limit: params.limit,
				auto_redial_delay_ms_min_max: params.delay_ms_min_max,
				auto_redial_max_sequential_failed_calls: params.max_sequential_failed_calls,
				auto_redial_short_call_duration_ms: params.short_call_duration_ms
			},
			false
		)
	}

	public async transfer(destination: string) {
		const uri = makeURI(destination, this.profile.server)
		if (!uri) return
		this.debug?.('Transfer:', uri.toString())
		if (this.detail.progress === 'CONNECTING' && this.detail.type === 'INBOUND') {
			await this.answer()
			await wait(100)
		}
		await this.session.refer(uri)
		await this.session.bye()
		this.updateDetail({ reason: 'Transferred' })
	}

	public async hangup(hard = false) {
		this.debug?.('Hangup')
		this.updateDetail({ next_sequence_idx: 0 })

		if (hard || this.detail.progress === 'WAITING') {
			this.updateDetail({ auto_redialing: false, progress: 'DISCONNECTED' })
			return
		}

		if (this.session.state === SessionState.Establishing) {
			const s = this.session as Inviter
			await s.cancel()
			return
		}

		if (this.session.state === SessionState.Established) {
			const s = this.session as Session
			await s.bye()
			return
		}

		if (this.session instanceof Invitation) {
			await this.session.reject()
		}
	}
}

export { Call }
export default Call
