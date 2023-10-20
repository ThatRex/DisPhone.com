export function getBrowserName() {
	for (const [matcher, name] of [
		['Firefox', 'Firefox'],
		['Edg', 'Edge'],
		['Chrome', 'Chrome']
	]) {
		if (navigator.userAgent.includes(matcher)) return name
	}
	return 'A Browser'
}
