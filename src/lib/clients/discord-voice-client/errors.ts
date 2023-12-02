/* 
GATEWAY SOCKET
*/

export class GatewaySocketError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'GatewayError'
	}
}

export class GatewaySocketInitError extends GatewaySocketError {
	/** Something went wrong during gateway initialisation. */
	constructor(message: string) {
		super(message)
		this.name = 'GatewaySocketInitError'
	}
}

export class GatewaySocketNotReadyError extends GatewaySocketError {
	/** Something that required the socket to be ready occurred when the socket was not. */
	constructor(message: string) {
		super(message)
		this.name = 'GatewayNotReadyError'
	}
}

export class GatewaySocketResumeError extends GatewaySocketError {
	/** Something went wrong when resuming with the gateway socket. */
	constructor(message: string) {
		super(message)
		this.name = 'GatewaySocketResumeError'
	}
}

/* 
VOICE MANAGER
*/

export class VoiceManagerError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'VoiceManagerError'
	}
}

export class VoiceManagerConnectionError extends VoiceManagerError {
	/** Something went wrong when opening the voice connection. */
	constructor(message: string) {
		super(message)
		this.name = 'VoiceManagerConnectionError'
	}
}

export class VoiceManagerSpeakingError extends VoiceManagerError {
	/** Something went wrong when setting the speaking status. */
	constructor(message: string) {
		super(message)
		this.name = 'VoiceManagerSpeakingError'
	}
}

/* 
VOICE SOCKET
*/

export class VocieSocketError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'VocieSocketError'
	}
}

export class VocieSocketNotReadyError extends VocieSocketError {
	/** Something that required the socket to be ready occurred when the socket was not. */
	constructor(message: string) {
		super(message)
		this.name = 'VocieSocketNotReadyError'
	}
}

export class VocieSocketResumeError extends VocieSocketError {
	/** Something went wrong when resuming with the voice socket. */
	constructor(message: string) {
		super(message)
		this.name = 'VocieSocketResumeError'
	}
}

/* 
VOICE RTC
*/

export class VoiceRTCError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'VoiceRTCError'
	}
}

export class VoiceRTCConnectionError extends VoiceRTCError {
	/** Voice RTC connection error. */
	constructor(message: string) {
		super(message)
		this.name = 'VoiceRTCConnectionError'
	}
}

export class VoiceRTCOfferError extends VoiceRTCError {
	/** Something went wrong when creating the offer. */
	constructor(message: string) {
		super(message)
		this.name = 'VoiceRTCOfferError'
	}
}
