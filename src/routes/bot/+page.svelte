<script lang="ts">
	import { playAudioFromUrls } from '$lib/utils/play-audio-from-urls'
	import Bot from '$lib/discord-browser-voice-client'
	import { env } from '$env/dynamic/private'

	export async function testDiscordVoiceCon() {
		const bot = new Bot({ token: env.DISCORD_TOKEN, debug: true })

		bot.on('ready', async () => {
			const stream_ = await navigator.mediaDevices.getUserMedia({ audio: true })
			const stream = await playAudioFromUrls([
				'03. Shades Of Hell - Kuolleet Sielut.mp3',
				'ss_my_new_christ.mp3',
				'test.mp3'
			])

			const audio_track = stream.getTracks()[0]

			const voice = bot.connect({
				audio_track,
				guild_id: '559178010838958090',
				channel_id: '1035954430975168532',
				audio_settings: {
					bitrate_kbps: 320,
					mode: 'sendonly',
					stereo: true,
					self_deaf: true,
					initial_speaking: true
				}
			})

			voice.on('connected', () => {
				setTimeout(() => voice.disconnect(), 2000)
				console.log('Connected')
			})
			voice.on('disconnected', () => console.log('Disconnected'))
			voice.on('track', async (t) => {
				const stream = new MediaStream()
				const mediaElement = new Audio()
				stream.addTrack(t)
				mediaElement.srcObject = stream
				await mediaElement.play()
			})
		})
	}
</script>
