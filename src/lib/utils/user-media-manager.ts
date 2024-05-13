import { noop } from '.'

class UserMediaManager {
	private readonly ac: AudioContext
	private readonly dst: MediaStreamAudioDestinationNode
	private readonly gin: GainNode
	public readonly src: MediaStreamAudioSourceNode
	private stream?: MediaStream
	private gettig_media = false

	set gain(gain: number) {
		this.gin.gain.value = gain / 100
	}

	constructor(ac: AudioContext) {
		this.ac = ac
		this.dst = ac.createMediaStreamDestination()
		this.gin = ac.createGain()
		this.src = ac.createMediaStreamSource(this.dst.stream)
		this.gin.connect(this.dst)
	}

	public async start() {
		if (this.gettig_media) return false
		if (this.stream) return true
		if (!navigator.mediaDevices) new Error('Media devices not available in insecure contexts.')

		this.gettig_media = true

		try {
			this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
		} catch {
			noop()
		}

		this.gettig_media = false

		if (!this.stream) return false
		this.ac.createMediaStreamSource(this.stream).connect(this.gin)
		return true
	}

	public stop() {
		if (!this.stream) return
		for (const track of this.stream.getAudioTracks()) track.stop()
		this.stream = undefined
	}
}

export { UserMediaManager }
export default UserMediaManager
