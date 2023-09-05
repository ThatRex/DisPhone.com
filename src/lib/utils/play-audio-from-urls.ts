export async function playAudioFromUrls(params: {
	urls: string[]
	volume?: number
	loop?: boolean
}) {
	const { urls, volume, loop } = params

	const context = new AudioContext()
	const destination = context.createMediaStreamDestination()

	let i = 0
	const playNextAudio = async () => {
		if (i >= urls.length) {
			if (loop) i = 0
			else return
		}

		const url = urls[i]
		const response = await fetch(url)
		const arrayBuffer = await response.arrayBuffer()
		const audioBuffer = await context.decodeAudioData(arrayBuffer)
		const bufferSource = context.createBufferSource()
		bufferSource.buffer = audioBuffer
		bufferSource.onended = playNextAudio

		const gainNode = context.createGain()
		gainNode.gain.value = (volume ?? 100) / 100
		bufferSource.connect(gainNode)
		gainNode.connect(destination)

		bufferSource.start(0)
		i++
	}

	playNextAudio()

	return destination.stream
}
