<script lang="ts">
	import type { VoiceManager } from '$lib/clients/discord-voice-client/voice-manager'
	import { persisted } from 'svelte-local-storage-store'
	import { Inviter, Session, SessionState, UserAgent } from 'sip.js'
	import { getUserMedia, playAudioFromURLs, startMediaFlow } from '$lib/clients/utils'
	import { PhoneClient } from '$lib/clients/phone-client'
	import { Client as VoiceBot } from '$lib/clients/discord-voice-client'
	import Title from '$lib/components/misc/title.svelte'
	import { GatewayDispatchEvents } from 'discord-api-types/v10'

	let audio_context: AudioContext | undefined

	let bot_sender: RTCRtpSender | undefined
	let bot_track: MediaStreamTrack | undefined
	let bot_stream_sestination: MediaStreamAudioDestinationNode | undefined

	let guild_id: ''
	let channel_id: ''

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
		discord_token: '',
		discord_username: '',
		// phone
		server: '',
		user: '',
		login: '',
		pass: '',
		auto_redial_safety_limit: 0,
		// ui
		hide_config: false,
		dial_num: '',
		transfer_num: '',
		dtmf: ''
	})

	async function initPhone() {
		await getUserMedia({ audio: true })

		phone = new PhoneClient({
			username: $config.user,
			login: $config.login,
			password: $config.pass,
			sip_server: $config.server
		})

		await phone.start()

		phone.on('sender', async (s) => {
			phone_sender = s
			if (bot_track) {
				console.debug('phone_sender updated to bot_track')
				await phone_sender.replaceTrack(bot_track)
			}
		})

		phone.on('track', async (t) => {
			startMediaFlow(t)
			phone_track = t
			if (bot_sender) {
				console.debug('bot_sender updated to new phone_track')
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

	let call_counter = 0
	async function makeCall() {
		if ($config.auto_redial_safety_limit && call_counter === $config.auto_redial_safety_limit) {
			// this forces the user to view the page every X calls
			await getUserMedia({ audio: true })
			call_counter = 0
		}

		call_counter++

		if (['CALLING', 'ONCALL'].includes(phone_state)) return
		const inviter = phone.makeInviter($config.dial_num)

		outgoing_session = inviter

		outgoing_session.stateChange.addListener(async (state) => {
			switch (state) {
				case SessionState.Establishing: {
					phone_state = PhoneState.CALLING
					await playRing()
					console.debug('Session is establishing')
					break
				}
				case SessionState.Established: {
					asserted_identity = outgoing_session.assertedIdentity?.friendlyName
					phone_state = PhoneState.ONCALL
					call_started_time = new Date()
					voice?.setSpeaking(true)
					console.log('Session has been established')
					break
				}
				case SessionState.Terminated: {
					asserted_identity = undefined
					phone_state = PhoneState.READY
					phone_sender = undefined
					phone_track = undefined

					console.debug('Session has terminated')

					if (!bot_sender) break

					voice?.setSpeaking(true)
					const [stream] = await playAudioFromURLs({
						urls: ['/sounds/hangup.wav'],
						volume: 50,
						onStart: () => voice?.setSpeaking(true),
						onEnd: () => voice?.setSpeaking(false)
					})
					const [track] = stream.getAudioTracks()
					bot_sender.replaceTrack(track)

					if (do_auto_redial) {
						const min = 2000
						const max = 4500
						const ms = Math.floor(Math.random() * (max - min + 1)) + min
						setTimeout(async () => {
							if (do_auto_redial) await makeCall()
						}, ms)
					}

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
			token: $config.discord_token!,
			debug: true
		})
		bot.on('ready', () => (bot_ready = true))

		bot.gateway.on('packet', (p) => {
			if (!$config.discord_username || p.t !== GatewayDispatchEvents.VoiceStateUpdate) return
			if (p.d.member.user.username !== $config.discord_username) return
			channel_id = p.d.channel_id ?? ''
			guild_id = channel_id ? p.d.guild_id : ''
		})
	}

	async function connect() {
		await getUserMedia({ audio: true })

		if (!voice) {
			voice = bot.connect({
				guild_id: guild_id!,
				channel_id: channel_id!,
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
					console.debug('bot_sender updated to phone_track')
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
					console.debug('phone_sender updated to new bot_track')
					await phone_sender.replaceTrack(bot_track)
				}
			})
		} else {
			voice.connect({
				guild_id: guild_id!,
				channel_id: channel_id!,
			})
		}
	}

	let asserted_identity: string | undefined = undefined
	let call_started_time: Date | undefined = undefined
	let do_auto_redial = false
</script>

<Title title="DisPhone" />

<div style="display: flex; flex-direction: column; gap: 10px;">
	<div>
		<button on:click={() => ($config.hide_config = !$config.hide_config)}>
			{$config.hide_config ? 'Show Config' : 'Hide Config'}
		</button>

		{#if !bot_ready}
			<button
				disabled={!$config.discord_token || !$config.discord_username}
				on:click={() => initBot()}>Start Bot</button
			>
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
				disabled={!$config.server || !$config.user || !$config.pass}
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

	<div style="display: flex; flex-direction: column;">
		<div style="display: flex; flex-wrap: wrap; gap: 10px;">
			{#if phone_state !== PhoneState.NOTREADY}
				<div style="padding: 10px; border: 1px solid; flex-grow: 2;">
					<h1>Phone</h1>
					<div>
						<b>Status: </b>{phone_state}
						{#if asserted_identity}
							<br /><b>Name: </b>{asserted_identity}
						{/if}
					</div>
					<div style="display: flex; flex-direction: column; gap: 4px 0">
						<form
							on:submit|preventDefault={async () => {
								if (phone_state === PhoneState.ONCALL) {
									await outgoing_session.bye()
									return
								}
								if (phone_state === PhoneState.CALLING) {
									await outgoing_session.cancel()
									return
								}
								if (!/[a-zA-Z]/.test($config.dial_num)) {
									$config.dial_num = $config.dial_num.replace(/[^0-9#*+]/g, '')
								}
								$config.dial_num = $config.dial_num
								await makeCall()
							}}
						>
							<label>
								<input
									type="tel"
									placeholder="2484345508"
									bind:value={$config.dial_num}
									readonly={['ONCALL', 'CALLING'].includes(phone_state)}
								/>
							</label>

							<button>{phone_state === PhoneState.READY ? 'CALL' : 'HANGUP'}</button>
							<label>
								<input
									type="checkbox"
									name="do_auto_redial"
									id="do_auto_redial"
									bind:checked={do_auto_redial}
								/>
								Auto Redial
							</label>
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
									const uri = UserAgent.makeURI(`sip:${$config.transfer_num}@${$config.server}`)
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
				<div style="padding: 10px; border: 1px solid; flex-shrink: 1; flex-grow: 1;">
					<h1>Bot</h1>
					<div>
						{#if !connected}
							<div style="display: flex; flex-direction: column; gap: 4px 0">
								<div>
									If you havn't,
									<a
										target="_blank"
										href="https://discord.com/api/oauth2/authorize?client_id={bot.gateway.identity
											.id}&permissions=0&scope=bot%20applications.commands">Invite your bot</a
									>.
									<br />Then join a voice channel. If you are already in a channel toggle your mute.
									<br />If the connect button doesn't become clickable you either entered you
									discord name incorrectly or the bot can't see the channel.
								</div>
								<button disabled={!channel_id || !guild_id} on:click={async () => await connect()}>
									Connect
								</button>
							</div>
						{:else}
							<button on:click={() => voice?.disconnect()}>Disconnect</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		{#if !$config.hide_config}
			<div style="padding: 10px; border: 1px solid; margin-top: 10px">
				<h1>Config</h1>
				<div>
					For the best experience use this app with FireFox on desktop and Chome on mobile.<br />
					On mobile make sure the browser you use is not battery restricted or optimised.
				</div>
				<div>
					<h2>Discord Bot</h2>
					<p>
						You can create a bot <a
							target="_blank"
							href="https://discord.com/developers/applications">here</a
						>.
					</p>
					<div style="display: flex; flex-direction: column; gap: 4px 0;">
						<label>
							<div>Token</div>
							<input type="text" bind:value={$config.discord_token} />
						</label>
						<label>
							<div>Your Discord Username</div>
							<input type="text" bind:value={$config.discord_username} />
						</label>
					</div>
				</div>
				<div>
					<h2>Soft Phone</h2>
					<p>
						<span style="color: red;">Normal SIP won't work!</span><br />
						Make sure your device is WebRTC compatible.
					</p>
					<div style="display: flex; flex-direction: column; gap: 4px 0;">
						<label>
							<div>Server</div>
							<input type="text" bind:value={$config.server} />
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
						<br />
						<label>
							<div>Auto Redial Safety</div>
							<input type="number" min="0" bind:value={$config.auto_redial_safety_limit} />
						</label>
						<div>Forces you to view the page every X calls. 0 to disable.</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<div>
		<span style="color: red;">
			This project is in early development,
			<a target="_blank" href="https://github.com/ThatRex/BaitKit.net/issues">
				expect bugs and report them here</a
			>!
		</span>
		<!-- 
		<br />
		<span style="font-style: italic;">
			Projects like this take lots of time and effort to develop and maintain. Like my work?
			<a target="_blank" href="https://example.com">Your support is appreciated</a>.
		</span> 
		-->
		<span style="float: right; opacity: 50%;">
			Developed by <a target="_blank" href="https://rexslab.com">Rex's Lab</a>.
		</span>
	</div>
	<div />
</div>
