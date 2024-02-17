/** This may be called for the Media Stream or Firefox compat reasons. */
export async function getUserMedia(constraints?: MediaStreamConstraints, lock_perms = false) {
	if (!navigator.mediaDevices) new Error('Media devices not available in insecure contexts.')
	const stream = await navigator.mediaDevices.getUserMedia(constraints)
	if (lock_perms) {
		const a = new Audio()
		a.muted = true
		a.srcObject = stream
		await a.play()
	}
	return stream
}
