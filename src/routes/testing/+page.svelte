<script lang="ts">
	import { playAudioFromUrls } from '$lib/utils'

	async function testWebhook() {
		const url =
			'https://discord.com/api/webhooks/1139917140376432721/WBZSEdoFC7aSm6cWAq5nJIi5Ou7Ts1Mfu6zZS7D4cs35GXCMU8myh-8REXlsPUk3aaZj'

		// const res = await fetch(url, {
		// 	method: 'POST',
		// 	headers: { 'Content-Type': 'application/json' },
		// 	body: JSON.stringify({
		// 		username: 'DBFPOC',
		// 		content: 'hi'
		// 	})
		// })

		// const fr = await fetch('http://localhost:5173/audio/test.mp3')
		// const fb = await fr.blob()

		const fd = new FormData()
		// fd.append('file', fb, 'audio/test.mp3')
		fd.append('payload_json', JSON.stringify({ username: 'DBFPOC', content: 'hi' }))
		fd.append('file', new Blob(['Hello world!'], { type: 'text/plain' }), 'test.txt')

		const res = await fetch(url, {
			method: 'POST',
			body: fd
		})
	}

	async function testMP3stream() {
		const mp3stream = await playAudioFromUrls(['audio/test.mp3'])
		const mediaElement = new Audio()
		mediaElement.srcObject = mp3stream
		mediaElement.play()
	}
</script>

<h1>Discord Browser Phone POC</h1>
<button on:click={testWebhook}>Test Discord Webhook</button>
<button on:click={testMP3stream}>Test MP3 Stream</button>
