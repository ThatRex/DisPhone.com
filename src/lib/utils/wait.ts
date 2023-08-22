export async function wait(milliseconds: number) {
	await new Promise((resolve) => setTimeout(resolve, milliseconds))
}
