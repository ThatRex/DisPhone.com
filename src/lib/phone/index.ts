import { UserAgent, Registerer, Inviter, Session, SessionState, Web } from 'sip.js'
import { conf } from '../conf'
import { wait } from '$lib/utils'

export const testPhone = async () => {
	const uri = UserAgent.makeURI(conf.sipURI)

	const theMediaStreamFactory: Web.MediaStreamFactory = (
		constraints: MediaStreamConstraints,
		sessionDescriptionHandler: Web.SessionDescriptionHandler
	): Promise<MediaStream> => {
		if (!constraints.audio && !constraints.video) {
			return Promise.resolve(new MediaStream())
		}

		if (navigator.mediaDevices === undefined) {
			return Promise.reject(new Error('Media devices not available in insecure contexts.'))
		}

		const mediaElement = new Audio()
		mediaElement.autoplay = true
		mediaElement.srcObject = sessionDescriptionHandler.remoteMediaStream
		mediaElement.play()

		return navigator.mediaDevices.getUserMedia.call(navigator.mediaDevices, constraints)
	}

	const theSessionDescriptionHandlerFactory =
		Web.defaultSessionDescriptionHandlerFactory(theMediaStreamFactory)

	const ua = new UserAgent({
		sessionDescriptionHandlerFactory: theSessionDescriptionHandlerFactory,
		authorizationPassword: conf.pass,
		authorizationUsername: conf.user,
		transportOptions: {
			server: conf.wsServer
		},
		uri
	})

	await ua.start()

	const registerer = new Registerer(ua)
	await registerer.register()

	const target = UserAgent.makeURI('sip:5000@pbx.rexslab.com')
	if (!target) return

	const inviter = new Inviter(ua, target, {
		sessionDescriptionHandlerOptions: {
			constraints: {
				audio: true,
				video: false
			}
		}
	})

	const outgoingSession: Session = inviter

	outgoingSession.stateChange.addListener(async (newState: SessionState) => {
		switch (newState) {
			case SessionState.Establishing: {
				console.log('Session is establishing')
				break
			}
			case SessionState.Established: {
				console.log('Session has been established')
				await wait(10000)
				await outgoingSession.bye()
				break
			}
			case SessionState.Terminated: {
				console.log('Session has terminated')
				await registerer.unregister()
				break
			}
			default: {
				break
			}
		}
	})

	await inviter.invite()
}
