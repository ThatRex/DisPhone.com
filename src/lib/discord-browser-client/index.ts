import { wait } from '$lib/utils'
import { GatewayDispatchEvents, GatewayOpcodes } from 'discord-api-types/v10'
import { conf } from '../conf'
import { GatewayWebSocket } from './gateway-web-socket'
import { VoiceWebSocket } from './voice-web-socket'
import { VoiceOpcodes } from 'discord-api-types/voice'
import { VoiceWebRTCSocket } from './voice-webrtc-socket'

async function playAudioToRemote() {
	const context = new AudioContext()
	const response = await fetch('http://localhost:5173/test.mp3')
	const arrayBuffer = await response.arrayBuffer()
	const audioBuffer = await context.decodeAudioData(arrayBuffer)
	const destination = context.createMediaStreamDestination()
	const bufferSource = context.createBufferSource()
	bufferSource.buffer = audioBuffer
	bufferSource.start(0)
	bufferSource.connect(destination)
	return destination.stream
}

export async function net() {
	const gateway = new GatewayWebSocket({
		address: 'gateway.discord.gg',
		token: conf.discordToken,
		debug: true
	})

	let voice: VoiceWebSocket
	let vRTC: VoiceWebRTCSocket

	gateway.on('packet', async (packet) => {
		switch (packet.t) {
			case GatewayDispatchEvents.VoiceStateUpdate: {
				break
			}

			case GatewayDispatchEvents.VoiceServerUpdate: {
				const { endpoint, guild_id, token } = packet.d

				vRTC = new VoiceWebRTCSocket({ debug: true })
				vRTC.on('error', console.error)
				vRTC.on('track', (t) => {
					const ms = new MediaStream()
					ms.addTrack(t)
					const mediaElement = new Audio()
					mediaElement.autoplay = true
					mediaElement.srcObject = ms
					mediaElement.play()
				})

				// const stream = await navigator.mediaDevices.getUserMedia({
				// 	audio: true,
				// 	video: false
				// })

				const stream = await playAudioToRemote()

				await vRTC.openConnection(stream.getTracks()[0])
				const offer = await vRTC.createOffer()

				voice = new VoiceWebSocket({
					user_id: gateway.identity.id!,
					session_id: gateway.session_id!,
					address: endpoint,
					guild_id,
					token,
					debug: true
				})
				voice.on('error', console.error)

				voice.on('packet', async (p) => {
					switch (p.op) {
						case VoiceOpcodes.Ready: {
							console.log('READY PACKET:', packet)
							await voice.sendSelectProtocol(offer!.sdp, [
								{
									name: 'opus',
									type: 'audio',
									priority: 1000,
									payload_type: 109,
									rtx_payload_type: null
								}
							])
							break
						}
						case VoiceOpcodes.SessionDescription: {
							await vRTC.handleAnswer(p.d.sdp)
							voice.sendPacket({
								op: VoiceOpcodes.Speaking,
								d: {
									speaking: 1,
									delay: 0,
									ssrc: offer?.ssrc
								}
							})
							break
						}
					}
				})
				break
			}
		}
	})

	wait(1000).then(() => {
		gateway.sendPacket({
			op: GatewayOpcodes.VoiceStateUpdate,
			d: {
				guild_id: '559178010838958090',
				channel_id: '1035954430975168532',
				self_mute: false,
				self_deaf: false
			}
		})
	})

	wait(120_000).then(() => {
		vRTC.destroy()
		voice.destroy(true)
		gateway.destroy(true)
	})
}

export const testDiscordVoiceCon = async () => {
	await net()
}
