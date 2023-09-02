/** Generates a dummy media stream containing 1 audio track with 2 channels. */
export function generateDummyStream(
	numberOfChannels?: number,
	length?: number,
	sampleRate?: number
) {
	const context = new AudioContext()
	const dest = context.createMediaStreamDestination()
	const bufferSource = context.createBufferSource()
	bufferSource.buffer = context.createBuffer(
		numberOfChannels ?? 2,
		length ?? context.sampleRate,
		sampleRate ?? context.sampleRate
	)
	bufferSource.connect(dest)
	return dest.stream
}
