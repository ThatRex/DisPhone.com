/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from 'eventemitter3'
import {
	UserAgentState,
	Session,
	Inviter,
	Invitation,
	URI,
	SessionState,
	Web,
	type SessionInviteOptions
} from 'sip.js'
import { makeURI } from './utils'
import { type Profile } from './profile'
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
	reason?: string

	start_time: number
	next_sequence_idx: number
	sequential_short_calls: number

	on_hold: boolean
	auto_redialing: boolean
	deafened: boolean
	muted: boolean

	destination?: string
	identity?: string
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
		sequential_short_calls: 0,

		on_hold: false,
		auto_redialing: false,
		deafened: false,
		muted: false,

		destination: undefined,
		identity: undefined,
		reason: undefined
	}

	private settings = {
		auto_redial_short_call_time_ms: 4000,
		auto_redial_max_sequential_short_calls: 3,
		auto_redial_delay_ms_min: 2000,
		auto_redial_delay_ms_max: 4500
	}

	/* session */

	private _session?: Session

	private get session() {
		if (!this._session) throw Error('No Session.')
		return this._session
	}

	private sessionStateListener = (state: SessionState) => {
		this.debug?.('Session State Update:', state)
		switch (state) {
			case SessionState.Establishing: {
				const identity = this.session.assertedIdentity?.friendlyName
				this.updateState({ progress: 'CONNECTING', identity, start_time: Date.now() })
				break
			}

			case SessionState.Established: {
				const [track_in] = this.dst_i.stream.getAudioTracks()
				const { remoteMediaStream, peerConnection } = this.session
					.sessionDescriptionHandler as Web.SessionDescriptionHandler
				peerConnection!.getSenders()[0].replaceTrack(track_in)
				this.ac.createMediaStreamSource(remoteMediaStream).connect(this.gin_o)
				startMediaFlow(remoteMediaStream)

				this.updateState({
					progress: 'CONNECTED',
					identity: this.session.assertedIdentity?.friendlyName,
					start_time: Date.now()
				})

				this.runSequence()
				break
			}

			case SessionState.Terminated: {
				this.updateState({
					next_sequence_idx: 0,
					on_hold: false,
					identity: undefined
				})

				if (this.detail.auto_redialing && this.detail.start_time) {
					const sequential_short_calls = this.detail.sequential_short_calls

					if (
						this.detail.progress === 'CONNECTED' &&
						Date.now() - this.detail.start_time >= this.settings.auto_redial_short_call_time_ms
					) {
						this.updateState({ sequential_short_calls: 0 })
					} else {
						this.updateState({ sequential_short_calls: sequential_short_calls + 1 })
						if (
							this.detail.sequential_short_calls ===
							this.settings.auto_redial_max_sequential_short_calls
						) {
							this.updateState({ auto_redialing: false, sequential_short_calls: 0 })
						}
					}
				}

				if (this.detail.auto_redialing) {
					const { auto_redial_delay_ms_max, auto_redial_delay_ms_min } = this.settings
					const ms =
						Math.floor(Math.random() * (auto_redial_delay_ms_max - auto_redial_delay_ms_min + 1)) +
						auto_redial_delay_ms_min

					this.updateState({
						type: 'OUTBOUND',
						progress: 'WAITING',
						start_time: Date.now() + ms
					})

					setTimeout(() => {
						if (!this.detail.auto_redialing) {
							if (this.detail.progress !== 'DISCONNECTED')
								this.updateState({ progress: 'DISCONNECTED' })
							return
						}
						this.updateState({ progress: 'INITIAL' })
						this.init()
					}, ms)

					return
				}

				this.updateState({ progress: 'DISCONNECTED' })
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
					this.updateState({ auto_redialing: false })
					break
				}
			}
		})
	}

	private updateState(state: Partial<CallDetail>) {
		// always clear existing reason on state change
		if (!state.reason && state.progress !== this.detail.progress) {
			this.emit('detail', { ...this.detail, ...state, reason: undefined })
			return
		}

		this.emit('detail', { ...this.detail, ...state })
	}

	private async runSequence() {
		if (this.detail.type === 'INBOUND') return
		if (this.detail.progress === 'DISCONNECTED') return

		const next = () => this.updateState({ next_sequence_idx: this.detail.next_sequence_idx + 1 })

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
				if (this.detail.progress === 'INITIAL') this.updateState({ progress: 'WAITING' })
				await wait(1000)
				next()
				break
			}
			case ',': {
				if (this.detail.progress === 'INITIAL') this.updateState({ progress: 'WAITING' })
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
			constraints: { audio: true }
		}

		this._session = new Inviter(this.profile.ua, this.uri, { sessionDescriptionHandlerOptions })
		const session_out = this.session as Inviter
		session_out.stateChange.addListener(this.sessionStateListener)
		await session_out.invite({
			requestDelegate: {
				onReject: ({ message: { reasonPhrase, statusCode } }) =>
					this.updateState({ reason: `${statusCode} ${reasonPhrase}` }),
				onProgress: (response) => this.updateState({ reason: response.message.reasonPhrase }),
				onTrying: (response) => this.updateState({ reason: response.message.reasonPhrase })
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
				this.updateState({ progress: 'CONNECTING', identity, start_time: Date.now() })
				break
			}
			case 'OUTBOUND': {
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

	public async setHold(value: boolean) {
		if (value === this.detail.on_hold) return

		const sessionDescriptionHandlerOptions: Web.SessionDescriptionHandlerOptions = {
			hold: value
		}
		this.session.sessionDescriptionHandlerOptionsReInvite = sessionDescriptionHandlerOptions

		const options: SessionInviteOptions = {
			requestDelegate: {
				onAccept: () => this.updateState({ on_hold: value })
			}
		}

		await this.session.invite(options)
	}

	public setDeaf(value: boolean) {
		if (value === this.detail.deafened) return
		this.gin_i.gain.value = value ? 0 : 1
		this.updateState({ deafened: value })
	}

	public setMute(value: boolean) {
		if (value === this.detail.muted) return
		this.gin_o.gain.value = value ? 0 : 1
		this.updateState({ muted: value })
	}

	public setAutoRedial(value: boolean) {
		if (value === this.detail.auto_redialing) return
		this.updateState({ auto_redialing: value })
	}

	public async transfer(destination: string) {
		const uri = makeURI(destination, this.profile.server)
		if (!uri) return
		this.debug?.('Transfer:', uri.toString())
		if (this.detail.progress === 'CONNECTING' && this.detail.type === 'INBOUND') {
			this.setDeaf(true)
			this.setMute(true)
			await this.answer()
			await wait(100)
		}
		await this.session.refer(uri)
		await this.session.bye()
		this.updateState({ reason: 'Transferred' })
	}

	public async hangup(hard = false) {
		this.debug?.('Hangup')
		this.updateState({ next_sequence_idx: 0 })

		if (hard || this.detail.progress === 'WAITING') {
			this.updateState({ auto_redialing: false, progress: 'DISCONNECTED' })
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
