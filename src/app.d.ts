// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	// Yes its deprecated however .currentDirection does not get set to stopped in Firefox when stopped while .stopped is still supported everywhere.
	interface RTCRtpTransceiver {
		readonly stopped: boolean
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

export {}
