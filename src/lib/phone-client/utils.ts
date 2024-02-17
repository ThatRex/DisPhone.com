import { UserAgent } from 'sip.js'

export function makeURI(dest: string, sip_server: string) {
	const dest_clean = dest.replace(/\s/g, '')
	console.log('dest_clean', dest_clean)
	
	const uri_string = dest.includes('@') ? `sip:${dest_clean}` : `sip:${dest_clean}@${sip_server}`
	console.log('uri_string', uri_string)
	return UserAgent.makeURI(uri_string)
}
