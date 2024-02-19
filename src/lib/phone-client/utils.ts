import { UserAgent } from 'sip.js'

export function makeURI(dest: string, sip_server: string) {
	const dest_clean = dest.replace(/\s/g, '')
	const uri_string = dest.includes('@') ? `sip:${dest_clean}` : `sip:${dest_clean}@${sip_server}`
	return UserAgent.makeURI(uri_string.replaceAll('#', '%23'))
}
