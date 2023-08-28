<script lang="ts">
	import { playAudioFromUrls } from '$lib/utils/play-audio-from-urls'
	import VoiceBot from '$lib/discord-browser-voice-client'
	import { env } from '$env/dynamic/public'
	import { dev } from '$app/environment'
	import type { VoiceManager } from '$lib/discord-browser-voice-client/voice-manager'

	let bot: VoiceBot
	let ready = false
	let voice: VoiceManager | undefined
	let connected = false

	// https://cdn.discordapp.com/avatars/438008175698903040/05ce96076a76ee389254283dd160232d.webp?size=24

	function init() {
		bot = new VoiceBot({ token: env.PUBLIC_DISCORD_TOKEN, debug: dev })
		bot.on('ready', () => (ready = true))
	}

	async function connect() {
		const stream_ = await navigator.mediaDevices.getUserMedia({ audio: true })
		const stream = await playAudioFromUrls(
			['test.mp3', 'ss_my_new_christ.mp3', '03. Shades Of Hell - Kuolleet Sielut.mp3'].sort(
				() => Math.random() - 0.5
			)
		)

		const audio_track = stream.getTracks()[0]

		if (!voice) {
			voice = bot.connect({
				audio_track,
				guild_id: '559178010838958090',
				channel_id: '1035954430975168532',
				self_deaf: true,
				initial_speaking: true,
				audio_settings: {
					bitrate_kbps: 320,
					mode: 'sendonly',
					stereo: true
				}
			})

			voice.on('connected', () => {
				connected = true
				console.log('Connected')
			})
			voice.on('disconnected', () => {
				connected = false
				console.log('Disconnected')
			})

			voice.on('track', async (t) => {
				const stream = new MediaStream()
				const mediaElement = new Audio()
				stream.addTrack(t)
				mediaElement.srcObject = stream
				await mediaElement.play()
			})
		} else {
			voice.connect({
				guild_id: '559178010838958090',
				channel_id: '1035954430975168532'
			})
		}
	}
</script>

{#if !ready}
	<button on:click={() => init()}>Start</button>
{:else}
	<button
		on:click={() => {
			voice = undefined
			bot.shutdown()
			ready = false
		}}
	>
		Stop
	</button>
	<div>
		{#if connected}
			<button on:click={() => voice?.disconnect()}>Disconnect</button>
			<button
				on:click={() =>
					voice?.move({
						guild_id: '559178010838958090',
						channel_id: '559178010838958095'
					})}
			>
				Move
			</button>
		{:else}
			<button on:click={async () => await connect()}>Connect</button>
		{/if}
	</div>
{/if}
