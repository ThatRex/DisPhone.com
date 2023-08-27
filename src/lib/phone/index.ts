import { UserAgent, Registerer, Inviter, Session, SessionState, Web } from 'sip.js'
import { wait } from '$lib/utils/wait'
import { env } from '$env/dynamic/public'

export const testPhone = async () => {
	const uri = UserAgent.makeURI(env.PUBLIC_SIP_URI)

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
		authorizationPassword: env.PUBLIC_PASS,
		authorizationUsername: env.PUBLIC_USER,
		transportOptions: {
			server: env.PUBLIC_WS_SERVER
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
			constraints: { audio: true }
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
