export async function playAudioFromUrls(urls: string[]) {
	const context = new AudioContext()
	const destination = context.createMediaStreamDestination()
	let i = 0
	const playNextSong = async () => {
		if (i >= urls.length) return
		const url = urls[i]
		const response = await fetch(url)
		const arrayBuffer = await response.arrayBuffer()
		const audioBuffer = await context.decodeAudioData(arrayBuffer)
		const bufferSource = context.createBufferSource()
		bufferSource.buffer = audioBuffer
		bufferSource.start(0)
		bufferSource.connect(destination)
		i++
		bufferSource.onended = playNextSong
	}
	playNextSong()
	return destination.stream
}
