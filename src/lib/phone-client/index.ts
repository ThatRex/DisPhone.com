import EventEmitter from 'eventemitter3'
import { UserAgent, Registerer, Inviter, Web } from 'sip.js'
import { generateDummyStream, getUserMedia } from '$lib/utils'

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

	public makeInviter(number: string) {
		const target = UserAgent.makeURI(`sip:${number}@${this.sipServer}`)
		if (!target) throw Error('Target Was Undefined')

		const inviter = new Inviter(this.ua, target, {
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

			// We don't want to stop the tracks on the sender because otherwise the track coming from the bot will be ended.
			// for (const sender of peerConnection.getSenders()) {
			//     sender.track && sender.track.stop()
			// }

			dataChannel?.close()
			peerConnection.close()

			// ! Can't do this but the default close function does so keep that in mind...
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
