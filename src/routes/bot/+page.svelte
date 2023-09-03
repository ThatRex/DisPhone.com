<script lang="ts">
	import type { VoiceManager } from '$lib/discord-browser-voice-client/voice-manager'
	import { persisted } from 'svelte-local-storage-store'
	import { Session, SessionState } from 'sip.js'
	import { generateDummyStream, getUserMedia, playAudioFromUrls, startMediaFlow } from '$lib/utils'
	import { PhoneClient } from '$lib/phone-client'
	import VoiceBot from '$lib/discord-browser-voice-client'

	let phoneSender: RTCRtpSender | undefined
	let botSender: RTCRtpSender | undefined
	let phoneTrack: MediaStreamTrack | undefined
	let botTrack: MediaStreamTrack | undefined

	const config = persisted('config', {
		// bot
		discordToken: '',
		guildId: '',
		channelId: '',
		// phone
		sipServer: '',
		user: '',
		pass: '',
		phoneNum: '',
		// ui
		hideConfig: false
	})

	let phone: PhoneClient
	let phoneReady = false
	let oncall = false
	let outgoingSession: Session

	async function initPhone() {
		await getUserMedia({ audio: true })

		phone = new PhoneClient({
			username: $config.user,
			password: $config.pass,
			sipServer: $config.sipServer
		})

		phone.on('sender', async (s) => {
			phoneSender = s
			if (botTrack) {
				console.debug('phone sender updated to new bot track')
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

	async function makeCall() {
		const inviter = phone.makeInviter($config.phoneNum)

		outgoingSession = inviter

		outgoingSession.stateChange.addListener(async (state: SessionState) => {
			switch (state) {
				case SessionState.Establishing: {
					console.log('Session is establishing')
					break
				}
				case SessionState.Established: {
					oncall = true
					console.log('Session has been established')
					break
				}
				case SessionState.Terminated: {
					if (botSender) {
						const stream = await playAudioFromUrls(['/sounds/hangup.wav'], 50)
						const [track] = stream.getAudioTracks()
						botSender.replaceTrack(track)
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
			debug: false
		})
		bot.on('ready', () => (botReady = true))
	}

	async function connect() {
		await getUserMedia({ audio: true })
		const stream = generateDummyStream()

		const [audio_track] = stream.getAudioTracks()

		if (!voice) {
			voice = bot.connect({
				audio_track,
				guild_id: $config.guildId!,
				channel_id: $config.channelId!,
				initial_speaking: true,
				audio_settings: { mode: 'sendrecv' }
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
				if (phoneSender) {
					const stream = await playAudioFromUrls(
						[
							'/music/07. The Demon-Haunted World.mp3',
							'/music/03. Body & Symphony.mp3',
							'/music/03. Shades Of Hell - Kuolleet Sielut.mp3'
						].sort(() => Math.random() - 0.5)
					)
					const [track] = stream.getAudioTracks()
					phoneSender.replaceTrack(track)
				}
			})

			voice.on('sender', async (s) => {
				botSender = s
				if (phoneTrack) {
					console.debug('bot sender updated to new phone track')
					await botSender.replaceTrack(phoneTrack)
				}
			})

			voice.on('track', async (t) => {
				startMediaFlow(t)
				botTrack = t
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
			phone.stop()
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
		<label>
			<input type="text" placeholder="2484345508" bind:value={$config.phoneNum} disabled={oncall} />
		</label>
		{#if oncall}
			<button
				on:click={async () => {
					await outgoingSession.bye()
				}}
			>
				HANGUP
			</button>
		{:else}
			<button on:click={async () => await makeCall()}>CALL</button>
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
		<div><b>Connected:</b> {connected}</div>
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
					SIP User
					<input type="text" bind:value={$config.user} />
				</label>
				<label>
					SIP Pass
					<input type="text" bind:value={$config.pass} />
				</label>
			</div>
		</div>
	</div>
{/if}
