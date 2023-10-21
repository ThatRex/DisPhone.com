<script lang="ts">
	import type { VoiceManager } from '$lib/discord-browser-voice-client/voice-manager'
	import { persisted } from 'svelte-local-storage-store'
	import { Inviter, Session, SessionState, UserAgent } from 'sip.js'
	import { getUserMedia, playAudioFromURLs, startMediaFlow } from '$lib/utils'
	import { PhoneClient } from '$lib/phone-client'
	import { Client as VoiceBot } from '$lib/discord-browser-voice-client'
	import Title from '$lib/components/misc/title.svelte'

	let audio_context: AudioContext | undefined

	let bot_sender: RTCRtpSender | undefined
	let bot_track: MediaStreamTrack | undefined
	let bot_stream_sestination: MediaStreamAudioDestinationNode | undefined

	type PhoneState = keyof typeof PhoneState
	const PhoneState = {
		NOTREADY: 'NOTREADY',
		READY: 'READY',
		CALLING: 'CALLING',
		ONCALL: 'ONCALL'
	} as const

	let phone: PhoneClient
	let phone_state: PhoneState = PhoneState.NOTREADY
	let phone_sender: RTCRtpSender | undefined
	let phone_track: MediaStreamTrack | undefined
	let outgoing_session: Session & Inviter

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
			phone_sender = s
			if (bot_track) {
				console.debug('phone sender updated to bot track')
				await phone_sender.replaceTrack(bot_track)
			}
		})

		phone.on('track', async (t) => {
			startMediaFlow(t)
			phone_track = t
			if (bot_sender) {
				console.debug('bot sender updated to new phone track')
				await bot_sender.replaceTrack(phone_track)
			}
		})

		phone_state = PhoneState.READY
	}

	async function playRing() {
		if (!bot_sender) return

		const [stream] = await playAudioFromURLs({
			urls: ['/sounds/ringing.wav'],
			volume: 50,
			onStart: () => voice?.setSpeaking(true),
			onEnd: async () => {
				if (phone_state === PhoneState.CALLING && bot_sender) await playRing()
			}
		})

		const [track] = stream.getAudioTracks()
		bot_sender.replaceTrack(track)
	}

	async function makeCall() {
		const inviter = phone.makeInviter($config.phoneNum)

		outgoing_session = inviter

		outgoing_session.stateChange.addListener(async (state) => {
			switch (state) {
				case SessionState.Establishing: {
					phone_state = PhoneState.CALLING
					await playRing()
					console.log('Session is establishing')
					break
				}
				case SessionState.Established: {
					phone_state = PhoneState.ONCALL
					voice?.setSpeaking(true)
					console.log('Session has been established')
					break
				}
				case SessionState.Terminated: {
					phone_state = PhoneState.READY
					phone_sender = undefined
					phone_track = undefined

					if (bot_sender) {
						voice?.setSpeaking(true)
						const [stream] = await playAudioFromURLs({
							urls: ['/sounds/hangup.wav'],
							volume: 50,
							onStart: () => voice?.setSpeaking(true),
							onEnd: () => voice?.setSpeaking(false)
						})
						const [track] = stream.getAudioTracks()
						bot_sender.replaceTrack(track)
					} else {
						voice?.setSpeaking(false)
					}

					console.log('Session has terminated')
					break
				}
			}
		})

		await inviter.invite()
	}

	let bot: VoiceBot
	let bot_ready = false
	let voice: VoiceManager | undefined
	let connected = false

	function initBot() {
		bot = new VoiceBot({
			token: $config.discordToken!,
			debug: true
		})
		bot.on('ready', () => (bot_ready = true))
	}

	async function connect() {
		await getUserMedia({ audio: true })

		if (!voice) {
			voice = bot.connect({
				guild_id: $config.guildId!,
				channel_id: $config.channelId!,
				audio_settings: { mode: 'sendrecv' },
				initial_speaking: phone_state === PhoneState.ONCALL
			})

			voice.on('connected', () => {
				connected = true
				console.debug('Connected')
			})

			voice.on('disconnected', async () => {
				connected = false
				bot_sender = undefined
				bot_track = undefined
				console.log('Disconnected')
			})

			voice.on('sender', async (s) => {
				bot_sender = s
				if (phone_track) {
					console.debug('bot sender updated to phone track')
					await bot_sender.replaceTrack(phone_track)
				}
			})

			voice.on('track', async (t) => {
				if (!audio_context) audio_context = new AudioContext()
				if (!bot_stream_sestination || !bot_track) {
					bot_stream_sestination = audio_context.createMediaStreamDestination()
					bot_track = bot_stream_sestination.stream.getAudioTracks()[0]
					startMediaFlow(bot_track)
				}

				const stream = new MediaStream()
				stream.addTrack(t)
				const source = audio_context.createMediaStreamSource(stream)
				source.connect(bot_stream_sestination)

				if (phone_sender) {
					console.debug('phone sender updated to new bot track')
					await phone_sender.replaceTrack(bot_track)
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

<div style="display: flex; flex-direction: column; gap: 10px;">
	<div style="color: red;">
		This project in early development, expect bugs & use at own risk.
		<a href="https://github.com/ThatRex/BaitKit.net/issues">
			If you have an issue please create one here.
		</a>
	</div>

	<div>
		<button on:click={() => ($config.hideConfig = !$config.hideConfig)}>
			{$config.hideConfig ? 'Show Config' : 'Hide Config'}
		</button>

		{#if !bot_ready}
			<button disabled={!$config.discordToken} on:click={() => initBot()}>Start Bot</button>
		{:else}
			<button
				on:click={() => {
					voice = undefined
					bot.shutdown()
					bot_ready = false
					bot_sender = undefined
				}}
			>
				Stop Bot
			</button>
		{/if}

		{#if phone_state === PhoneState.NOTREADY}
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
					phone_state = PhoneState.NOTREADY
					phone_sender = undefined
					phone_track = undefined
				}}
			>
				Stop Phone
			</button>
		{/if}
	</div>

	<div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px;">
		{#if phone_state !== PhoneState.NOTREADY}
			<div style="padding: 10px; border: 1px solid">
				<h1>Phone</h1>

				<b>Status: </b>{phone_state}
				<div style="display: flex; flex-direction: column; gap: 4px 0">
					<form
						on:submit|preventDefault={async () => {
							if (phone_state === PhoneState.ONCALL) {
								await outgoing_session.bye()
								return
							}
							if (phone_state === PhoneState.CALLING) {
								outgoing_session.cancel()
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
								disabled={phone_state === PhoneState.ONCALL}
							/>
						</label>

						<button>{phone_state === PhoneState.READY ? 'CALL' : 'HANGUP'}</button>
					</form>

					{#if phone_state === PhoneState.ONCALL}
						<form
							on:submit|preventDefault={() => {
								$config.dtmf = $config.dtmf.replace(/[^0-9#*]/g, '')
								outgoing_session.sessionDescriptionHandler?.sendDtmf($config.dtmf)
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
							on:submit|preventDefault={async () => {
								if (!/[a-zA-Z]/.test($config.transfer_num)) {
									$config.transfer_num = $config.transfer_num.replace(/[^0-9#*+]/g, '')
								}
								const uri = UserAgent.makeURI(`sip:${$config.transfer_num}@${$config.sipServer}`)
								if (uri) {
									await outgoing_session.refer(uri)
									await outgoing_session.bye()
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
			</div>
		{/if}

		{#if bot_ready}
			<div style="padding: 10px; border: 1px solid">
				<h1>Bot</h1>
				<div>
					{#if !connected}
						<div style="display: flex; flex-direction: column; gap: 4px 0">
							<div>
								<a
									target="_blank"
									href="https://discord.com/api/oauth2/authorize?client_id={bot.gateway.identity
										.id}&permissions=0&scope=bot%20applications.commands"
								>
									Invite Bot
								</a>
							</div>
							<label>
								<div>Channel ID</div>
								<input type="text" bind:value={$config.channelId} />
							</label>
							<label>
								<div>Guild/Server ID</div>
								<input type="text" bind:value={$config.guildId} />
							</label>
							<button
								disabled={!$config.channelId || !$config.guildId}
								on:click={async () => await connect()}>Connect</button
							>
						</div>
					{:else}
						<button on:click={() => voice?.disconnect()}>Disconnect</button>
					{/if}
				</div>
			</div>
		{/if}
		{#if !$config.hideConfig}
			<div style="padding: 10px; border: 1px solid">
				<h1>Config</h1>
				<div>
					<h2>Discord Bot</h2>
					<label>
						<div>Token</div>
						<input type="text" bind:value={$config.discordToken} />
					</label>
				</div>
				<div>
					<h2>Soft Phone</h2>
					<p>
						<span style="color: red;">Normal SIP won't work!</span>
						Make sure your devie is WebRTC compatible.
					</p>
					<div style="display: flex; flex-direction: column; gap: 4px 0;">
						<label>
							<div>Server</div>
							<input type="text" bind:value={$config.sipServer} />
						</label>
						<label>
							<div>User</div>
							<input type="text" bind:value={$config.user} />
						</label>
						<label>
							<div>Login</div>
							<input type="text" bind:value={$config.login} />
						</label>
						<label>
							<div>Pass</div>
							<input type="text" bind:value={$config.pass} />
						</label>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
