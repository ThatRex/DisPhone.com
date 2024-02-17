/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import EventEmitter from 'eventemitter3'
import { noop } from '.'

class AudioPlayer extends EventEmitter {
	private readonly ac = new AudioContext()
	private readonly dest = this.ac.createMediaStreamDestination()
	public readonly stream = this.dest.stream

	public play(params: { url: string | string[]; volume?: number; loop?: boolean }) {
		const urls = typeof params.url === 'string' ? [params.url] : params.url
		const volume = params.volume ?? 100
		let loop = params.loop ?? false

		const gain_node = this.ac.createGain()
		gain_node.gain.value = (volume ?? 100) / 100
		gain_node.connect(this.dest)

		const stop = () => {
			loop = false
			try {
				gain_node.disconnect(this.dest)
			} catch {
				noop()
			}
		}

		let i = 0
		const playNextAudio = async () => {
			if (this.ac.state === 'suspended') await this.ac.resume()

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
			const audio_buffer = await this.ac.decodeAudioData(array_buffer)
			const buffer_source = this.ac.createBufferSource()
			buffer_source.buffer = audio_buffer
			buffer_source.onended = playNextAudio
			buffer_source.connect(gain_node)
			buffer_source.start(0)
			i++
		}

		playNextAudio()

		return stop
	}
}

export { AudioPlayer }
export default AudioPlayer
