import EventEmitter from 'eventemitter3'
import { UserAgent, Registerer, Inviter, Web } from 'sip.js'
import { generateDummyStream } from '$lib/utils/generate-dummy-stream'

interface PhoneClient extends EventEmitter {
	on(event: 'track', listener: (event: MediaStreamTrack) => void): this
	on(event: 'sender', listener: (event: RTCRtpSender) => void): this
	once(event: 'track', listener: (event: MediaStreamTrack) => void): this
	once(event: 'sender', listener: (event: RTCRtpSender) => void): this
	emit(event: 'track', track: MediaStreamTrack): boolean
	emit(event: 'sender', sender: RTCRtpSender): boolean
}

class PhoneClient extends EventEmitter {
	private ua: UserAgent
	private sipServer: string
	private _registerer: Registerer

	public get registerer() {
		return this._registerer
	}

	constructor(params: {
		username: string
		password: string
		sipServer: string
		wsServer?: string
	}) {
		super()

		const { username, password, sipServer, wsServer } = params

		this.sipServer = sipServer

		this.ua = new UserAgent({
			sessionDescriptionHandlerFactory: Web.defaultSessionDescriptionHandlerFactory(
				this.mediaStreamFactory
			),
			authorizationUsername: username,
			authorizationPassword: password,
			transportOptions: { server: wsServer ?? `wss://${sipServer}:8089/ws` },
			uri: UserAgent.makeURI(`sip:${username}@${sipServer}`)
		})

		this.ua.start()
		this._registerer = new Registerer(this.ua)
	}

	public stop() {
		this.ua.stop()
	}

	public async makeInviter(number: string) {
		const target = UserAgent.makeURI(`sip:${number}@${this.sipServer}`)
		if (!target) throw Error('Target Was Undefined')

		const inviter = new Inviter(this.ua, target, {
			sessionDescriptionHandlerOptions: {
				constraints: { audio: true }
			}
		})

		return inviter
	}

	private mediaStreamFactory: Web.MediaStreamFactory = (constraints, sessionDescriptionHandler) => {
		if (!constraints.audio && !constraints.video) {
			return Promise.resolve(new MediaStream())
		}

		if (navigator.mediaDevices === undefined) {
			return Promise.reject(new Error('Media devices not available in insecure contexts.'))
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
