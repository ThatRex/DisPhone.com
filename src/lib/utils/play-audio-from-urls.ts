export async function playAudioFromUrls(urls: string[], volume?: number) {
	const context = new AudioContext()
	const destination = context.createMediaStreamDestination()
	let i = 0
	const playNextAudio = async () => {
		if (i >= urls.length) return
		const url = urls[i]
		const response = await fetch(url)
		const arrayBuffer = await response.arrayBuffer()
		const audioBuffer = await context.decodeAudioData(arrayBuffer)
		const bufferSource = context.createBufferSource()
		bufferSource.buffer = audioBuffer

		const gainNode = context.createGain()
		gainNode.gain.value = (volume ?? 100) / 100
		bufferSource.connect(gainNode)
		gainNode.connect(destination)

		bufferSource.start(0)
		i++
		bufferSource.onended = playNextAudio
	}
	playNextAudio()

	return destination.stream
}
