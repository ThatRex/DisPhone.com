
/** This may be called for the Media Stream or Firefox compat reasons. */
export async function getUserMedia(constraints?: MediaStreamConstraints) {
	return await navigator.mediaDevices.getUserMedia(constraints)
}
