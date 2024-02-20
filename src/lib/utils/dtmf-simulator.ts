class DTMFSimulator {
	private readonly freqs = {
		row: [697, 770, 852, 941],
		col: [1209, 1336, 1477, 1633]
	}

	private readonly dtmf = [
		['1', '2', '3'],
		['4', '5', '6'],
		['7', '8', '9'],
		['*', '0', '#']
	]

	private readonly ac = new AudioContext()
	private readonly comp = this.ac.createDynamicsCompressor()
	public readonly stream: MediaStream

	constructor() {
		const dest = this.ac.createMediaStreamDestination()
		this.stream = dest.stream
		this.comp.connect(dest)
	}

	public press(digit: string, duration = 160) {
		const idx_row = this.dtmf.findIndex((v) => v.includes(digit[0]))
		const idx_col = this.dtmf[idx_row]?.indexOf(digit[0])
		if (idx_col !== undefined && idx_col !== -1) return this.playTone(idx_row, idx_col, duration)
	}

	private playTone(row: number, col: number, duration = 160) {
		const osc1 = this.ac.createOscillator()
		const osc2 = this.ac.createOscillator()

		osc1.frequency.value = this.freqs.row[row]
		osc2.frequency.value = this.freqs.col[col]

		const gain = this.ac.createGain()
		gain.connect(this.comp)

		osc1.connect(gain)
		osc2.connect(gain)

		gain.gain.value = 0.0001
		gain.gain.setValueAtTime(gain.gain.value, this.ac.currentTime)
		gain.gain.exponentialRampToValueAtTime(1, this.ac.currentTime + 0.02)

		osc1.start()
		osc2.start()

		const stop = () => {
			gain.gain.setValueAtTime(gain.gain.value, this.ac.currentTime)
			gain.gain.exponentialRampToValueAtTime(0.0001, this.ac.currentTime + 0.02)
			osc1.stop(this.ac.currentTime + 0.02)
			osc2.stop(this.ac.currentTime + 0.02)
		}

		if (duration) setTimeout(stop, duration)
		return stop
	}
}

export { DTMFSimulator }
export default DTMFSimulator
