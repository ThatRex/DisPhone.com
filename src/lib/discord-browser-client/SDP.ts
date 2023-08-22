export type ParsedSDP = [string, string][]

export class SDP {
	private sdp: ParsedSDP

	public get parsed() {
		return this.sdp
	}

	public get stringified() {
		return this.stringify(this.sdp)
	}

	constructor(sdp?: string | ParsedSDP) {
		this.sdp = !sdp ? [] : typeof sdp === 'string' ? this.pars(sdp) : sdp
	}

	private stringify(data: ParsedSDP) {
		let sdp = ''
		for (const [chr, val] of data) sdp += `${chr}=${val}\n`
		return sdp.trim()
	}

	private pars(data: string): ParsedSDP {
		return data
			.trim()
			.replaceAll('\r', '')
			.split('\n')
			.map((line) => {
				const chr = line.split('=')[0].trim()
				const val = line.replace(`${chr}=`, '').trim()
				return [chr, val]
			})
	}

	public add(chr: string, val: string) {
		this.sdp = [...this.sdp, [chr.trim().charAt(0), val.trim()]]
	}

	public concat(sdp: ParsedSDP) {
		this.sdp = [...this.sdp, ...sdp]
	}

	public set(sdp: string | ParsedSDP) {
		this.sdp = typeof sdp === 'string' ? this.pars(sdp) : sdp
	}
}
