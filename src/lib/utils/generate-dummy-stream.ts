/** Generates a dummy media stream containing 1 audio track with 2 channels. */
export function generateDummyStream() {
	const context = new AudioContext()
	const dest = context.createMediaStreamDestination()
	const bufferSource = context.createBufferSource()
	bufferSource.buffer = context.createBuffer(2, 1, context.sampleRate)
	bufferSource.connect(dest)
	return dest.stream
}
