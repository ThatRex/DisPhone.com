/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from 'eventemitter3'
import { Profile, type ProfileDetail } from './profile'
import type Call from './call'
import type { OutboundCallDetail, CallDetail } from './call'
import { noop } from '$lib/utils'
import { makeURI } from './utils'

export type ProfileUpdate = { id: string } & ProfileDetail
export type CallUpdate = { id: string } & CallDetail

export interface Manager extends EventEmitter {
	on(event: 'profile-update', listener: (update: ProfileUpdate) => void): this
	on(event: 'call-update', listener: (update: CallUpdate) => void): this
	on(event: 'dtmf', listener: (dtmf: string) => void): this
	emit(event: 'profile-update', update: ProfileUpdate): boolean
	emit(event: 'call-update', update: CallUpdate): boolean
	emit(event: 'dtmf', dtmf: string): boolean
}

export class Manager extends EventEmitter {
	private readonly debug?: (...args: any) => void

	private readonly ac: AudioContext
	private readonly dst_i: MediaStreamAudioDestinationNode
	private readonly src_i: MediaStreamAudioSourceNode
	private readonly dst_o: MediaStreamAudioDestinationNode
	private readonly src_o: MediaStreamAudioSourceNode

	public get dst() {
		return this.dst_i
	}

	public get src() {
		return this.src_o
	}

	private profiles: Profile[] = []
	private calls: Call[] = []

	private transmitting_call_ids: string[] = []
	private conferenced_call_ids: string[] = []

	private processing_transmit = false
	private processing_conference = false

	constructor(params: { ac: AudioContext; debug?: boolean }) {
		super()

		this.debug = !params.debug ? undefined : (...args) => console.debug('[Manager]', ...args)

		this.ac = params.ac
		this.dst_i = this.ac.createMediaStreamDestination()
		this.src_i = this.ac.createMediaStreamSource(this.dst_i.stream)
		this.dst_o = this.ac.createMediaStreamDestination()
		this.src_o = this.ac.createMediaStreamSource(this.dst_o.stream)
	}

	private parsDialInput(input: string) {
		/*
		Destination Formats
			1-800-567-4657
			1234
			1234@sip.server.com
			1234@sip.server.com:5043

		Function Characters
			, - Delay 200ms
			; - Delay 1s
			& - Append Destination

		Examples
			Auto DTMF  : 8004444444;;0,2
			Multi Call : 8004444444&2484345508
		*/

		this.debug?.('Dail Input Raw:', input)

		const details = input
			.replace(/\s/g, '')
			.split('&')
			// pars groups into sequence
			.map((g) => {
				const sequence: string[] = []

				for (const chr of g) {
					const last_idx = sequence.length - 1
					if (/[,;]/.test(chr) || last_idx === -1) sequence.push(chr)
					else {
						const last_val = sequence[last_idx]
						if (/[,;]/.test(last_val)) sequence.push(chr)
						else sequence[last_idx] = last_val + chr
					}
				}

				return sequence
			})
			// get possible destination from sequence; strip formatting
			.map((s) => {
				let destination: string | undefined
				let sequence = s

				const dest_idx = sequence.findIndex((v) => !/[,;]/.test(v))

				if (dest_idx !== -1) {
					const dest = sequence[dest_idx]
					destination = !/[A-Za-z@]/g.test(dest) ? dest.replace(/[^0-9#*+]/g, '') : dest
				}

				sequence = Array.from(sequence.entries())
					.map(([i, v]) => {
						if (i === dest_idx) return 'DEST'
						return v.replace(/[^0-9A-D#*+,;]/g, '')
					})
					.filter((v) => v)

				return { sequence, destination }
			})
			// remove details with no destination
			.filter(({ destination }) => destination)
			// split dtmf
			.map((g) => {
				g.sequence = g.sequence
					.map((v) => (['DEST', ',', ';'].includes(v) ? v : v.split('')))
					.flat()
				return g
			})
		this.debug?.('Dail Input Processed:', details)
		return details as { destination: string; sequence: string[] }[]
	}

	/*
	Manager
	*/

	/** Set which call audio is transmitted to and from. */
	public transmit(params: { ids?: string[] }) {
		if (this.processing_transmit) return
		this.processing_transmit = true

		const transmitting_call_ids: string[] = []

		for (const call of this.calls) {
			if (this.transmitting_call_ids.includes(call.id)) {
				call.src.disconnect(this.dst_o)
				this.src_i.disconnect(call.dst)
			}

			if (!!params.ids && !params.ids.includes(call.id)) continue

			call.src.connect(this.dst_o)
			this.src_i.connect(call.dst)
			transmitting_call_ids.push(call.id)
		}

		this.transmitting_call_ids = transmitting_call_ids
		this.processing_transmit = false
	}

	/** Provide 1 or more IDs to conference. Provide none to unconference all. */
	public conference(params: { ids: string[] }) {
		if (this.processing_conference) return
		this.processing_conference = true

		const conferenced_call_ids: string[] = []

		for (const call of this.calls) {
			if (this.conferenced_call_ids.includes(call.id)) {
				for (const c of this.calls) {
					if (c.id === call.id) continue

					try {
						c.src.disconnect(call.dst)
					} catch {
						noop()
					}

					try {
						call.src.disconnect(c.dst)
					} catch {
						noop()
					}
				}
			}

			if (!params.ids.length && !params.ids.includes(call.id)) continue

			for (const c of this.calls) {
				if (c.id === call.id) continue
				c.src.connect(call.dst)
				call.src.connect(c.dst)
			}

			conferenced_call_ids.push(call.id)
		}

		this.conferenced_call_ids = conferenced_call_ids
		this.processing_conference = false
	}

	/*
	Profile
	*/

	public async addProfile(params: {
		id: string
		username: string
		login?: string
		password?: string
		sip_server: string
		ws_server?: string
		register?: boolean
	}) {
		const profile = new Profile({
			ac: this.ac,
			id: params.id,
			username: params.username,
			login: params.login,
			password: params.password,
			sip_server: params.sip_server,
			ws_server: params.ws_server,
			debug: !!this.debug
		})

		profile.on('detail', (d) => this.emit('profile-update', { id: params.id, ...d }))
		profile.on('call', (call) => {
			call.on('dtmf', (dtmf) => this.emit('dtmf', dtmf))
			call.on('detail', (d) => {
				this.emit('call-update', { id: call.id, ...d })
				if (d.progress !== 'DISCONNECTED') return
				this.calls = this.calls.filter((c) => c.id !== call.id)
			})
			this.calls.push(call)

			call.src.connect(this.dst_o)
			this.src_i.connect(call.dst)

			call.init()
		})

		await profile.start(params.register)
		this.profiles.push(profile)
	}

	public async removeProfile(profile_id: string) {
		const profileIdx = this.profiles.findIndex((p) => profile_id === p.id)
		if (profileIdx === -1) throw Error('Profile Not Found.')
		const profile = this.profiles[profileIdx]
		await profile.stop()
		this.profiles = this.profiles.splice(profileIdx + 1)
	}

	public dial(params: { profile_id: string; input: string }) {
		const { profile_id, input } = params
		const profile = this.profiles.find((p) => profile_id === p.id)
		if (!profile) throw Error('No profile matching ID provided.')

		const details = this.parsDialInput(input)
			.map(({ sequence, destination }) => ({
				sequence,
				destination: makeURI(destination, profile.server)
			}))
			.filter((v) => v.destination) as OutboundCallDetail[]

		for (const detail of details) profile.initCall({ type: 'OUTBOUND', detail })
	}

	/*
	Call
	*/

	public answer(params?: { ids?: string[] }) {
		for (const call of this.calls) {
			if (!!params?.ids && !params.ids.includes(call.id)) continue
			call.answer()
		}
	}

	public sendDTMF(params: { ids?: string[]; dtmf: string }) {
		for (const call of this.calls) {
			if (!!params.ids && !params.ids.includes(call.id)) continue
			call.sendDTMF(params.dtmf)
		}
	}

	public setHold(params: { ids?: string[]; value: boolean }) {
		for (const call of this.calls) {
			if (!!params.ids && !params.ids.includes(call.id)) continue
			call.setHold(params.value)
		}
	}

	public setDeaf(params: { ids?: string[]; value: boolean }) {
		for (const call of this.calls) {
			if (!!params.ids && !params.ids.includes(call.id)) continue
			call.setDeaf(params.value)
		}
	}

	public setMute(params: { ids?: string[]; value: boolean }) {
		for (const call of this.calls) {
			if (!!params.ids && !params.ids.includes(call.id)) continue
			call.setMute(params.value)
		}
	}

	public setAutoRedial(params: { ids?: string[]; value: boolean }) {
		for (const call of this.calls) {
			if (!!params.ids && !params.ids.includes(call.id)) continue
			call.setAutoRedial(params.value)
		}
	}

	public transfer(params: { ids?: string[]; destination: string }) {
		for (const call of this.calls) {
			if (!!params.ids && !params.ids.includes(call.id)) continue
			call.transfer(params.destination)
		}
	}

	public hangup(params?: { ids?: string[]; hard?: boolean }) {
		for (const call of this.calls) {
			if (!!params?.ids && !params.ids.includes(call.id)) continue
			call.hangup(params?.hard)
		}
	}
}
