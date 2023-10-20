import EventEmitter from 'eventemitter3'
import { UserAgent, Registerer, Inviter, Web, RegistererState, TransportState } from 'sip.js'
import { getUserMedia } from '$lib/utils'
import { generateDummyStream } from '$lib/discord-browser-voice-client/utils/generate-dummy-stream'

interface PhoneClient extends EventEmitter {
	on(event: 'track', listener: (event: MediaStreamTrack) => void): this
	on(event: 'sender', listener: (event: RTCRtpSender) => void): this
	once(event: 'track', listener: (event: MediaStreamTrack) => void): this
	once(event: 'sender', listener: (event: RTCRtpSender) => void): this
	emit(event: 'track', track: MediaStreamTrack): boolean
	emit(event: 'sender', sender: RTCRtpSender): boolean
}

class PhoneClient extends EventEmitter {
	private _ua: UserAgent
	private _registerer?: Registerer
	private sipServer: string

	public get ua() {
		return this._ua
	}

	public get registerer() {
		return this._registerer
	}

	constructor(params: {
		username: string
		login?: string
		password: string
		sipServer: string
		wsServer?: string
	}) {
		super()

		const { username, login, password, sipServer, wsServer } = params

		this.sipServer = sipServer

		this._ua = new UserAgent({
			sessionDescriptionHandlerFactory: Web.defaultSessionDescriptionHandlerFactory(
				this.mediaStreamFactory
			),
			authorizationUsername: login ?? username,
			authorizationPassword: password,
			transportOptions: { server: wsServer ?? `wss://${sipServer}:8089/ws` },
			uri: UserAgent.makeURI(`sip:${username}@${sipServer}`)
		})

		this.ua.transport.stateChange.addListener(async (state) => {
			if (state === TransportState.Connected) {
				console.debug('REGISTERING')
				this._registerer = new Registerer(this._ua)
				await this._registerer.register()
			}
		})
	}

	public async start() {
		await this._ua.start()
	}

	public async stop() {
		if (this._registerer?.state === RegistererState.Registered) {
			console.debug('UNREGISTERING')
			this.registerer?.unregister()
		}
		await this._ua.stop()
	}

	public makeInviter(number: string) {
		const target = UserAgent.makeURI(`sip:${number}@${this.sipServer}`)
		if (!target) throw Error('Target Was Undefined')

		const inviter = new Inviter(this._ua, target, {
			sessionDescriptionHandlerOptions: {
				constraints: { audio: true }
			}
		})

		return inviter
	}

	private mediaStreamFactory: Web.MediaStreamFactory = async (
		constraints,
		sessionDescriptionHandler
	) => {
		if (!constraints.audio && !constraints.video) {
			return Promise.resolve(new MediaStream())
		}

		if (navigator.mediaDevices === undefined) {
			return Promise.reject(new Error('Media devices not available in insecure contexts.'))
		}

		await getUserMedia({ audio: true })

		sessionDescriptionHandler.close = () => {
			const { peerConnection, dataChannel } = sessionDescriptionHandler

			if (peerConnection === undefined) return

			for (const receiver of peerConnection.getReceivers()) {
				receiver.track && receiver.track.stop()
			}

			// Unlike the default function we don't want to stop the tracks on the sender because that prevents the sending track from being reused.
			// for (const sender of peerConnection.getSenders()) {
			//     sender.track && sender.track.stop()
			// }

			dataChannel?.close()
			peerConnection.close()

			// ! The default close does this but we can't so keep that in mind...
			// peerConnection = undefined
		}

		sessionDescriptionHandler.peerConnectionDelegate = {
			ontrack: () => {
				const { remoteMediaStream, peerConnection } = sessionDescriptionHandler
				const [track] = remoteMediaStream.getAudioTracks()
				const [sender] = peerConnection!.getSenders().filter((s) => s.track?.kind === 'audio')
				this.emit('track', track)
				this.emit('sender', sender)
			}
		}

		return Promise.resolve(generateDummyStream())
	}
}

export { PhoneClient }
export default PhoneClient
