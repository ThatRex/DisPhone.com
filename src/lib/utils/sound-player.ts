import { noop } from '.'

class SoundPlayer<T extends Record<string, AudioBuffer>> {
	private readonly ac: AudioContext
	private readonly dst: MediaStreamAudioDestinationNode
	private readonly gin: GainNode
	public readonly src: MediaStreamAudioSourceNode

	private audio_buffers!: T

	set gain(gain: number) {
		this.gin.gain.value = gain / 100
	}

	/** Use `SoundPlayer.load` to load audio. */
	constructor(ac: AudioContext, audio_buffers?: T) {
		this.ac = ac
		this.dst = this.ac.createMediaStreamDestination()
		this.gin = this.ac.createGain()
		this.gin.connect(this.dst)
		this.src = this.ac.createMediaStreamSource(this.dst.stream)

		if (audio_buffers) this.audio_buffers = audio_buffers
	}

	/** Use `SoundPlayer.load` to load audio. */
	public loadSounds(audio_buffers: T) {
		this.audio_buffers = audio_buffers
	}

	public play(params: {
		name: keyof T
		loop?: boolean
		onstarted?: () => void
		onended?: () => void
	}) {
		const { name, loop, onstarted, onended } = params

		const buffer = this.audio_buffers?.[name]
		if (!buffer) throw Error('Sound not loaded.')

		const buffer_source = this.ac.createBufferSource()

		const stop = () => {
			buffer_source.onended = noop
			buffer_source.stop()
			onended?.()
		}

		buffer_source.buffer = buffer
		buffer_source.loop = loop ?? false
		buffer_source.onended = stop
		buffer_source.connect(this.gin)
		buffer_source.start()

		onstarted?.()
		return stop
	}

	static async load<K extends string>(sounds: { [key in K]: string }) {
		const ac = new AudioContext()

		type Loaded = { [key in K]: AudioBuffer }
		const loaded: Loaded = {} as Loaded

		for (const key of Object.keys(sounds) as K[]) {
			let audio_buffer: AudioBuffer

			const url = sounds[key]

			try {
				const response = await fetch(url, { cache: 'no-cache' })
				const array_buffer = await response.arrayBuffer()
				audio_buffer = await ac.decodeAudioData(array_buffer)
			} catch {
				console.warn(`Failed to load sound '${key}'.`)
				audio_buffer = ac.createBuffer(2, ac.sampleRate, ac.sampleRate)
			}

			loaded[key] = audio_buffer
		}

		return loaded
	}
}

export { SoundPlayer }
export default SoundPlayer
