/** For Chromium Compat. See https://stackoverflow.com/questions/24287054/chrome-wont-play-webaudio-getusermedia-via-webrtc-peer-js/ */
export function startMediaFlow(trackOrStream: MediaStream | MediaStreamTrack) {
	let stream: MediaStream

	if (trackOrStream instanceof MediaStreamTrack) {
		stream = new MediaStream()
		stream.addTrack(trackOrStream)
	} else {
		stream = trackOrStream
	}

	let a: HTMLAudioElement | undefined = new Audio()
	a.muted = true
	a.srcObject = stream
	a.addEventListener('canplaythrough', () => (a = undefined))
}
