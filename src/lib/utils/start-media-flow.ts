/** For Chromium Compat. See https://stackoverflow.com/questions/24287054/chrome-wont-play-webaudio-getusermedia-via-webrtc-peer-js/ */
export function startMediaFlow(track_or_stream: MediaStream | MediaStreamTrack) {
	let stream: MediaStream

	if (track_or_stream instanceof MediaStreamTrack) {
		stream = new MediaStream()
		stream.addTrack(track_or_stream)
	} else {
		stream = track_or_stream
	}

	let a: HTMLAudioElement | undefined = new Audio()
	a.muted = true
	a.srcObject = stream
	a.addEventListener('canplaythrough', () => (a = undefined))
}
