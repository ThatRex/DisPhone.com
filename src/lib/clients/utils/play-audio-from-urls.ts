export async function playAudioFromURLs(params: {
	urls: string[]
	volume?: number
	loop?: boolean
	onStart?: () => unknown
	onEnd?: () => unknown
}) {
	const { urls, volume, loop, onStart, onEnd } = params

	const context = new AudioContext()
	const destination = context.createMediaStreamDestination()
	const stream = destination.stream

	const stop = () => {
		onEnd?.()
		for (const track of stream.getTracks()) track.stop()
		stopped = true
	}

	let i = 0
	let stopped = false
	const playNextAudio = async () => {
		if (stopped) return

		onStart?.()

		if (i >= urls.length) {
			if (loop) i = 0
			else {
				stop()
				return
			}
		}

		const url = urls[i]
		const response = await fetch(url)
		const array_buffer = await response.arrayBuffer()
		const audio_buffer = await context.decodeAudioData(array_buffer)
		const buffer_source = context.createBufferSource()
		buffer_source.buffer = audio_buffer
		buffer_source.onended = playNextAudio

		const gain_node = context.createGain()
		gain_node.gain.value = (volume ?? 100) / 100
		buffer_source.connect(gain_node)
		gain_node.connect(destination)

		buffer_source.start(0)
		i++
	}

	playNextAudio()

	return [stream, stop] as [MediaStream, () => void]
}
