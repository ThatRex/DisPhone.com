<script lang="ts">
	import type { VoiceManager } from '$lib/discord-browser-voice-client/voice-manager'
	import { persisted } from 'svelte-local-storage-store'
	import { Session, SessionState, UserAgent } from 'sip.js'
	import { getUserMedia, playAudioFromUrls, startMediaFlow } from '$lib/utils'
	import { PhoneClient } from '$lib/phone-client'
	import { Client as VoiceBot } from '$lib/discord-browser-voice-client'
	import Title from '$lib/components/misc/title.svelte'

	let audioContext: AudioContext | undefined

	let phoneSender: RTCRtpSender | undefined
	let phoneTrack: MediaStreamTrack | undefined

	let botSender: RTCRtpSender | undefined
	let botTrack: MediaStreamTrack | undefined
	let botStreamDestination: MediaStreamAudioDestinationNode | undefined

	const config = persisted('config', {
		// bot
		discordToken: '',
		guildId: '',
		channelId: '',
		// phone
		sipServer: '',
		user: '',
		login: '',
		pass: '',
		phoneNum: '',
		// ui
		hideConfig: false,
		transfer_num: '',
		dtmf: ''
	})

	let phone: PhoneClient
	let phoneReady = false
	let oncall = false
	let outgoingSession: Session

	async function initPhone() {
		await getUserMedia({ audio: true })

		phone = new PhoneClient({
			username: $config.user,
			login: $config.login,
			password: $config.pass,
			sipServer: $config.sipServer
		})

		await phone.start()

		phone.on('sender', async (s) => {
			phoneSender = s
			if (botTrack) {
				console.debug('phone sender updated to bot track')
				await phoneSender.replaceTrack(botTrack)
			}
		})

		phone.on('track', async (t) => {
			startMediaFlow(t)
			phoneTrack = t
			if (botSender) {
				console.debug('bot sender updated to new phone track')
				await botSender.replaceTrack(phoneTrack)
			}
		})

		phoneReady = true
	}

	async function playRing() {
		if (!botSender) return

		const stream = await playAudioFromUrls({
			urls: ['/sounds/ringing.wav'],
			volume: 50,
			onStart: () => voice?.setSpeaking(true),
			onEnd: async () => {
				if (!oncall && botSender) await playRing()
			}
		})

		const [track] = stream.getAudioTracks()
		botSender?.replaceTrack(track)
	}

	async function makeCall() {
		const inviter = phone.makeInviter($config.phoneNum)

		outgoingSession = inviter

		outgoingSession.stateChange.addListener(async (state) => {
			switch (state) {
				case SessionState.Establishing: {
					await playRing()
					console.log('Session is establishing')
					break
				}
				case SessionState.Established: {
					voice?.setSpeaking(true)
					oncall = true
					console.log('Session has been established')
					break
				}
				case SessionState.Terminating: {
					break
				}
				case SessionState.Terminated: {
					if (botSender) {
						voice?.setSpeaking(true)
						const stream = await playAudioFromUrls({
							urls: ['/sounds/hangup.wav'],
							volume: 50,
							onStart: () => voice?.setSpeaking(true),
							onEnd: () => voice?.setSpeaking(false)
						})
						const [track] = stream.getAudioTracks()
						botSender.replaceTrack(track)
					} else {
						voice?.setSpeaking(false)
					}
					oncall = false
					phoneSender = undefined
					phoneTrack = undefined
					console.log('Session has terminated')
					break
				}
			}
		})

		await inviter.invite()
	}

	let bot: VoiceBot
	let botReady = false
	let voice: VoiceManager | undefined
	let connected = false

	function initBot() {
		bot = new VoiceBot({
			token: $config.discordToken!,
			debug: true
		})
		bot.on('ready', () => (botReady = true))
	}

	async function connect() {
		await getUserMedia({ audio: true })

		if (!voice) {
			voice = bot.connect({
				guild_id: $config.guildId!,
				channel_id: $config.channelId!,
				audio_settings: { mode: 'sendrecv' },
				initial_speaking: oncall
			})

			voice.on('connected', () => {
				connected = true
				console.debug('Connected')
			})

			voice.on('disconnected', async () => {
				connected = false
				botSender = undefined
				botTrack = undefined
				console.log('Disconnected')
			})

			voice.on('sender', async (s) => {
				botSender = s
				if (phoneTrack) {
					console.debug('bot sender updated to phone track')
					await botSender.replaceTrack(phoneTrack)
				}
			})

			voice.on('track', async (t) => {
				if (!audioContext) audioContext = new AudioContext()
				if (!botStreamDestination || !botTrack) {
					botStreamDestination = audioContext.createMediaStreamDestination()
					botTrack = botStreamDestination.stream.getAudioTracks()[0]
					startMediaFlow(botTrack)
				}

				const stream = new MediaStream()
				stream.addTrack(t)
				const source = audioContext.createMediaStreamSource(stream)
				source.connect(botStreamDestination)

				if (phoneSender) {
					console.debug('phone sender updated to new bot track')
					await phoneSender.replaceTrack(botTrack)
				}
			})
		} else {
			voice.connect({
				guild_id: $config.guildId!,
				channel_id: $config.channelId!
			})
		}
	}
</script>

<Title title="DisPhone" />

<div style="color: red; margin-bottom: 10px">
	Disclaimer: This project is a proof of concept and is still in early development. Use at own risk.
</div>

<button on:click={() => ($config.hideConfig = !$config.hideConfig)}>
	{$config.hideConfig ? 'Show Config' : 'Hide Config'}
</button>

{#if !botReady}
	<button disabled={!$config.discordToken} on:click={() => initBot()}>Start Bot</button>
{:else}
	<button
		on:click={() => {
			voice = undefined
			bot.shutdown()
			botReady = false
			botSender = undefined
		}}
	>
		Stop Bot
	</button>
{/if}

{#if !phoneReady}
	<button
		disabled={!$config.sipServer || !$config.user || !$config.pass}
		on:click={async () => await initPhone()}
	>
		Start Phone
	</button>
{:else}
	<button
		on:click={async () => {
			await phone.stop()
			phoneReady = false
			oncall = false
			phoneSender = undefined
			phoneTrack = undefined
		}}
	>
		Stop Phone
	</button>
{/if}

{#if phoneReady}
	<div style="margin: 10px 0; padding: 10px; border: 1px solid">
		<h1>Phone</h1>
		<form
			on:submit|preventDefault={async () => {
				if (oncall) {
					await outgoingSession.bye()
					return
				}
				if (!/[a-zA-Z]/.test($config.phoneNum)) {
					$config.phoneNum = $config.phoneNum.replace(/[^0-9#*+]/g, '')
				}
				$config.phoneNum = $config.phoneNum
				await makeCall()
			}}
		>
			<label>
				<input
					type="tel"
					placeholder="2484345508"
					bind:value={$config.phoneNum}
					disabled={oncall}
				/>
			</label>

			<button>{oncall ? 'HANGUP' : 'CALL'} </button>
		</form>

		{#if oncall}
			<form
				on:submit|preventDefault={() => {
					outgoingSession.sessionDescriptionHandler?.sendDtmf($config.dtmf)
				}}
			>
				<input
					type="tel"
					name="dtmf"
					id="dtmf"
					min="0"
					max="9"
					placeholder="0"
					bind:value={$config.dtmf}
				/>
				<button>Send DTMF</button>
			</form>
			<form
				on:submit|preventDefault={() => {
					const uri = UserAgent.makeURI(`sip:${$config.transfer_num}@${$config.sipServer}`)
					if (uri) {
						outgoingSession.refer(uri)
						outgoingSession.bye()
					}
				}}
			>
				<input
					type="tel"
					name="transfer_num"
					id="transfer_num"
					min="0"
					max="10"
					placeholder="2484345508"
					bind:value={$config.transfer_num}
				/>
				<button>Transfer</button>
			</form>
		{/if}
	</div>
{/if}

{#if botReady}
	<div style="margin: 10px 0; padding: 10px; border: 1px solid">
		<h1>Bot</h1>
		<div>
			<a
				target="_blank"
				href="https://discord.com/api/oauth2/authorize?client_id={bot.gateway.identity
					.id}&permissions=0&scope=bot%20applications.commands"
			>
				Invite Bot
			</a>
		</div>
		<div>
			{#if !connected}
				<div style="display: flex; flex-direction: column;">
					<label>
						Channel ID
						<input type="text" bind:value={$config.channelId} />
					</label>
					<label>
						Guild/Server ID
						<input type="text" bind:value={$config.guildId} />
					</label>
				</div>
				<button
					disabled={!$config.channelId || !$config.guildId}
					on:click={async () => await connect()}>Connect</button
				>
			{:else}
				<button on:click={() => voice?.disconnect()}>Disconnect</button>
			{/if}
		</div>
	</div>
{/if}

{#if !$config.hideConfig}
	<div style="margin: 10px 0; padding: 10px; border: 1px solid">
		<h1>Config</h1>
		<div>
			<h2>Discord Bot</h2>
			<label>
				Token
				<input type="text" bind:value={$config.discordToken} />
			</label>
		</div>
		<div>
			<h2>Soft Phone</h2>
			<div style="display: flex; flex-direction: column;">
				<label>
					SIP Server
					<input type="text" bind:value={$config.sipServer} />
				</label>
				<label>
					User
					<input type="text" bind:value={$config.user} />
				</label>
				<label>
					Login
					<input type="text" bind:value={$config.login} />
				</label>
				<label>
					Pass
					<input type="text" bind:value={$config.pass} />
				</label>
			</div>
		</div>
	</div>
{/if}
