<script lang="ts">
	import { testDiscordVoiceCon } from '$lib/discord-browser-client'
	import { testPhone } from '$lib/phone'

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

		const fr = await fetch('http://localhost:5173/test.mp3')
		const fb = await fr.blob()

		const fd = new FormData()
		fd.append('file', fb, 'test.mp3')
		// fd.append('file', new Blob(['Hello world!'], { type: 'text/plain' }), 'test.txt')
		fd.append('payload_json', JSON.stringify({ username: 'DBFPOC', content: 'hi' }))

		const res = await fetch(url, {
			method: 'POST',
			body: fd
		})
	}

	async function playAudioToRemote() {
		const context = new AudioContext()
		const response = await fetch('http://localhost:5173/test.mp3')
		const arrayBuffer = await response.arrayBuffer()
		const audioBuffer = await context.decodeAudioData(arrayBuffer)
		console.log(audioBuffer.numberOfChannels)

		const destination = context.createMediaStreamDestination()
		const bufferSource = context.createBufferSource()
		bufferSource.buffer = audioBuffer
		bufferSource.start(0)
		bufferSource.connect(destination)
		return destination.stream
	}

	async function testMP3stream() {
		const mp3stream = await playAudioToRemote()

		const mediaElement = new Audio()
		mediaElement.autoplay = true
		mediaElement.srcObject = mp3stream
		mediaElement.play()
	}
</script>

<h1>Discord Browser Phone POC</h1>
<button on:click={testPhone}>Test Phone</button>
<button on:click={testDiscordVoiceCon}>Test Discord Voice Con</button>
<button on:click={testWebhook}>Test Discord Webhook</button>
<button on:click={testMP3stream}>Test MP3 Stream</button>
