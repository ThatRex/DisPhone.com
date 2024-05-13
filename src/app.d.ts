// See https://kit.svelte.dev/docs/types#app

import type { SvelteComponent } from 'svelte'

// for information about these interfaces
declare global {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type Component  = typeof SvelteComponent<any, any, any>

	interface RTCRtpTransceiver {
		// yes its deprecated however `currentDirection` does not get set to stopped in Firefox when stopped while `stopped` is still supported everywhere.
		readonly stopped: boolean
	}

	interface Navigator {
		// vibrate is undefined in safari
		vibrate?: (pattern: VibratePattern) => boolean
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

export {}
