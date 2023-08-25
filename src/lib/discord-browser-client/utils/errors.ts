/* 
BASE WEBSOCKET
*/

export class BaseWebSocketError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'BaseWebSocketError'
	}
}

export class BaseWebSocketClosedError extends Error {
	/** The socket was closed when it needed to be open. */
	constructor(message: string) {
		super(message)
		this.name = 'BaseWebSocketError'
	}
}

export class BaseWebSocketOpenError extends Error {
	/** The socket was open when it needed to be closed. */
	constructor(message: string) {
		super(message)
		this.name = 'BaseWebSocketError'
	}
}

/* 
GATEWAY
*/

export class GatewayError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'GatewayError'
	}
}
export class GatewayResumeError extends Error {
	/** Something went wrong when resuming with the gateway. */
	constructor(message: string) {
		super(message)
		this.name = 'GatewayResumeError'
	}
}

/* 
VOICE
*/

export class VoiceError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'VoiceError'
	}
}

export class VoiceRTCError extends VoiceError {
	constructor(message: string) {
		super(message)
		this.name = 'VoiceRTCError'
	}
}

export class VoiceConnectionError extends VoiceError {
	/** Something went wrong when opening the voice connection. */
	constructor(message: string) {
		super(message)
		this.name = 'VoiceConnectionError'
	}
}

export class VoiceSpeakingError extends VoiceError {
	/** Something went wrong when setting the speaking status. */
	constructor(message: string) {
		super(message)
		this.name = 'VoiceSpeakingError'
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

export class VoiceRTCAnswerError extends VoiceRTCError {
	/** Something went wrong when handling the answer. */
	constructor(message: string) {
		super(message)
		this.name = 'VoiceRTCAnswerError'
	}
}

export class VoiceRTCDestroyError extends VoiceRTCError {
	/** Something went wrong when the connection. */
	constructor(message: string) {
		super(message)
		this.name = 'VoiceRTCDestroyError'
	}
}
