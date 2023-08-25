import { ActivityType, GatewayIntentBits, PresenceUpdateStatus } from 'discord-api-types/v10'
import { conf } from '../conf'
import { GatewaySocket } from './core/gateway-socket'
import { playAudioFromUrls } from '$lib/utils/play-audio-from-urls'
import { VoiceManager } from './core/voice-manager'

export async function testDiscordVoiceCon() {
	const gateway = new GatewaySocket({
		address: 'gateway.discord.gg',
		token: conf.discordToken,
		intents: GatewayIntentBits.GuildVoiceStates,
		debug: true,
		presence: {
			since: Date.now(),
			afk: false,
			status: PresenceUpdateStatus.Online,
			activities: [
				{
					name: 'from FireFox',
					type: ActivityType.Streaming,
					url: 'https://www.youtube.com/watch?v=0'
				}
			]
		}
	})

	gateway.on('ready', async () => {
		// const stream = await playAudioFromUrls([
		// 	'test.mp3',
		// 	'ss_my_new_christ.mp3',
		// 	'03. Shades Of Hell - Kuolleet Sielut.mp3'
		// ])
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
		const audio_track = stream.getTracks()[0]

		const voice = new VoiceManager({
			gatewaySocket: gateway,
			debug: true
		})

		voice.connect({
			audio_track,
			// SDS Gen Voice
			// guild_id: '953475156309856256',
			// channel_id: '953475157605892102',
			// RL Private Voice
			guild_id: '559178010838958090',
			channel_id: '1035954430975168532',
			audio_settings: {
				mode: 'sendrecv',
				initial_speaking: true
			}
			// audio_settings: {
			// 	bitrate_kbps: 320,
			// 	mode: 'sendonly',
			// 	stereo: true,
			// 	self_deaf: true,
			// 	initial_speaking: true
			// }
		})

		voice.on('connected', () => {
			// voice.setSpeaking(true)
		})

		voice.on('track', async (t) => {
			const stream = new MediaStream()
			const mediaElement = new Audio()
			stream.addTrack(t)
			mediaElement.srcObject = stream
			await mediaElement.play()
		})
	})
}
