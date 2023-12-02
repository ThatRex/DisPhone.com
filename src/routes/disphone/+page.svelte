<script lang="ts">
	import { VoiceManager, VoiceManagerState } from '$lib/clients/discord-voice-client/voice-manager'
	import { persisted } from 'svelte-local-storage-store'
	import { Inviter, Session, SessionState, UserAgent } from 'sip.js'
	import { getUserMedia, playAudioFromURLs, startMediaFlow, wait } from '$lib/clients/utils'
	import { PhoneClient } from '$lib/clients/phone-client'
	import { Client as VoiceBot } from '$lib/clients/discord-voice-client'
	import Title from '$lib/components/misc/title.svelte'
	import { GatewayDispatchEvents, PresenceUpdateStatus } from 'discord-api-types/v10'
	import type { SocketState } from '$lib/clients/discord-voice-client/types'

	let bot_sender: RTCRtpSender | undefined
	let bot_track: MediaStreamTrack | undefined
	let bot_is_bot: boolean

	let guild_id = ''
	let channel_id = ''

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

	let asserted_identity: string | undefined = undefined
	let call_start_time: number | undefined = undefined
	let max_sequential_short_calls = 3
	let sequential_short_calls = 0
	let do_auto_redial = false

	const config = persisted('config', {
		// bot
		discord_token: '',
		discord_username: '', // or user id
		// phone
		server: '',
		user: '',
		login: '',
		pass: '',
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
			onStart: () => {
				if (phone_state === PhoneState.CALLING) voice?.setSpeaking(true)
			},
			onEnd: async () => {
				if (phone_state === PhoneState.CALLING && bot_sender) await playRing()
				else if (phone_state !== PhoneState.ONCALL && !!phone_track) voice?.setSpeaking(false)
			}
		})

		const [track] = stream.getAudioTracks()
		bot_sender.replaceTrack(track)
	}

	async function autoDTMF() {
		const [, ...dtmf_digits] = $config.dial_num.split(',')

		for (const digits of dtmf_digits) {
			await wait(1000)
			if (phone_state !== PhoneState.ONCALL) break
			outgoing_session.sessionDescriptionHandler?.sendDtmf(digits)
		}
	}

	async function makeCall() {
		if (['CALLING', 'ONCALL'].includes(phone_state)) return

		$config.dial_num = $config.dial_num.replace(/[^0-9#*+,]/g, '')

		const [num] = $config.dial_num.split(',')
		const inviter = phone.makeInviter(num)

		outgoing_session = inviter
		outgoing_session.stateChange.addListener(async (state) => {
			switch (state) {
				case SessionState.Establishing: {
					phone_state = PhoneState.CALLING
					await playRing()
					console.debug('Session is establishing')
					call_start_time = Date.now()
					break
				}
				case SessionState.Established: {
					bot?.setPresence({
						since: 0,
						afk: false,
						status: PresenceUpdateStatus.Online,
						activities: []
					})

					asserted_identity = outgoing_session.assertedIdentity?.friendlyName
					phone_state = PhoneState.ONCALL
					autoDTMF()
					call_start_time = Date.now()
					voice?.setSpeaking(true)
					console.log('Session has been established')
					break
				}
				case SessionState.Terminated: {
					if (do_auto_redial && call_start_time) {
						if (Date.now() - call_start_time > 4000) {
							sequential_short_calls = 0
						} else {
							sequential_short_calls++
							if (sequential_short_calls === max_sequential_short_calls) {
								do_auto_redial = false
								sequential_short_calls = 0
							}
						}
					}
					call_start_time = undefined

					bot?.setPresence({
						since: 0,
						afk: false,
						status: PresenceUpdateStatus.Idle,
						activities: []
					})
					asserted_identity = undefined
					phone_state = PhoneState.READY
					phone_sender = undefined
					phone_track = undefined

					console.debug('Session has terminated')

					if (!bot_sender) {
						do_auto_redial = false
						break
					}

					const [stream] = await playAudioFromURLs({
						urls: ['/sounds/hangup.wav'],
						volume: 50,
						onStart: () => voice?.setSpeaking(true),
						onEnd: () => {
							if (phone_state === PhoneState.READY) voice?.setSpeaking(false)
						}
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
	let bot_state: SocketState
	let voice: VoiceManager | undefined
	let voice_state: VoiceManagerState

	function initBot() {
		bot = new VoiceBot({
			token: $config.discord_token!,
			debug: true,
			properties: {
				os: 'linux',
				browser: 'Discord Android',
				device: 'Discord Android'
			},
			presence: {
				since: 0,
				afk: false,
				status: PresenceUpdateStatus.Idle,
				activities: []
			}
		})

		bot.on('state', (state) => {
			bot_state = state
			switch (state) {
				case 'DONE':
				case 'FAILED': {
					voice = undefined
					bot_sender = undefined
					channel_id = ''
					guild_id = ''
					break
				}
			}
		})

		bot.gateway.on('packet', ({ t, d }) => {
			if (!$config.discord_username || t !== GatewayDispatchEvents.VoiceStateUpdate) return
			if (
				d.member.user.username !== $config.discord_username &&
				d.member.user.id !== $config.discord_username
			) {
				return
			}

			channel_id = d.channel_id ?? ''
			guild_id = channel_id ? d.guild_id : ''
		})

		bot.gateway.on('packet', ({ t, d }) => {
			if (!$config.discord_username || t !== GatewayDispatchEvents.Ready) return
			bot_is_bot = d.user.bot
			if (d.user.bot) return

			let _channel_id = ''
			let _guild_id = ''

			for (const { id, voice_states } of d.guilds) {
				for (const { user_id, channel_id } of voice_states) {
					if (user_id === $config.discord_username) {
						_channel_id = channel_id
						break
					}
				}

				if (_channel_id) {
					_guild_id = id
					break
				}
			}

			channel_id = _channel_id
			guild_id = _guild_id
		})

		bot.start()
	}

	async function connect() {
		await getUserMedia({ audio: true })

		if (!voice) {
			voice = bot.createVoiceManager({ audio_settings: { mode: 'sendrecv' } })

			voice.on('state', (state) => {
				voice_state = state
				switch (state) {
					case 'FAILED':
					case 'DISCONNECTED': {
						bot_sender = undefined
						bot_track = undefined
						break
					}
				}
			})

			voice.on('sender', async (s) => {
				bot_sender = s
				if (phone_track) {
					console.debug('bot_sender updated to phone_track')
					await bot_sender.replaceTrack(phone_track)
				}
			})

			voice.on('track', async (t) => {
				startMediaFlow(t)
				bot_track = t
				if (phone_sender) {
					console.debug('phone_sender updated to new bot_track')
					await phone_sender.replaceTrack(bot_track)
				}
			})
		}

		voice.connect({
			guild_id: guild_id!,
			channel_id: channel_id!,
			initial_speaking: ['ONCALL', 'CALLING'].includes(phone_state)
		})
	}
</script>

<Title title="DisPhone" />

<div style="display: flex; flex-direction: column; gap: 10px;">
	<div>
		<button on:click={() => ($config.hide_config = !$config.hide_config)}>
			{$config.hide_config ? 'Show Config' : 'Hide Config'}
		</button>

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

		{#if !bot_state || ['DONE', 'FAILED'].includes(bot_state)}
			<button
				disabled={!$config.discord_token || !$config.discord_username}
				on:click={() => initBot()}
				>{bot_state === 'FAILED' ? 'Crashed - Restart Bot' : 'Start Bot'}</button
			>
		{:else if bot_state === 'INITIALISING'}
			<button disabled>Starting Bot</button>
		{:else}
			<button
				on:click={() => {
					voice = undefined
					bot_sender = undefined
					bot.shutdown()
				}}
			>
				Stop Bot
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

			{#if ['READY', 'RESUMING'].includes(bot_state)}
				<div style="padding: 10px; border: 1px solid; flex-shrink: 1; flex-grow: 1;">
					<h1>Bot</h1>
					<div>
						{#if !voice_state || ['DISCONNECTED', 'FAILED'].includes(voice_state)}
							<div style="display: flex; flex-direction: column; gap: 4px 0">
								{#if bot_is_bot}
									<div>
										If you haven't,
										<a
											target="_blank"
											href="https://discord.com/api/oauth2/authorize?client_id={bot.gateway.identity
												.id}&permissions=0&scope=bot%20applications.commands">Invite your bot</a
										>.
									</div>
								{/if}
								<button
									style="max-width: 30rem;"
									disabled={!channel_id || !guild_id}
									on:click={async () => await connect()}
								>
									{#if !channel_id || !guild_id}
										To connect join a voice channel{!bot_is_bot &&
										/^[0-9]+$/.test($config.discord_username)
											? '.'
											: ' or toggle your mute.'}
									{:else}
										{voice_state === VoiceManagerState.FAILED
											? 'Disconnected - Reconect'
											: 'Connect'}
									{/if}
								</button>
							</div>
						{:else}
							<button on:click={() => voice?.disconnect()}>
								{#if voice_state === VoiceManagerState.CONNECTING}
									Connecting -
								{:else if voice_state === VoiceManagerState.RECONNECTING}
									Reconnecting -
								{/if}
								Disconnect
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		{#if !$config.hide_config}
			<div style="padding: 10px; border: 1px solid; margin-top: 10px">
				<h1>Before You Start</h1>
				<div>
					Check out the wiki @ <a target="_blank" href="http://wiki.baitkit.net">wiki.baitkit.net</a>.
				</div>
				<span style="color: red;">
					This project is in early development,
					<a target="_blank" href="https://github.com/ThatRex/BaitKit.net/issues">
						expect bugs and report them here</a
					>!
				</span>
				<div>
					For the best experience use this app with FireFox on desktop and Chome on mobile.<br />
					On mobile make sure the browser you use is not battery restricted or optimised.
				</div>
				<h1>Config</h1>
				<div>
					<h2>Soft Phone</h2>
					<p>
						<span style="color: red;">Normal SIP won't work!</span><br />
						Make sure your device is WebRTC compatible.
					</p>
					<div style="display: flex; flex-direction: column; gap: 4px 0;">
						<label>
							<div>Server</div>
							<input
								type="text"
								bind:value={$config.server}
								on:blur={() => ($config.server = $config.server.trim())}
							/>
						</label>
						<label>
							<div>User</div>
							<input
								type="text"
								bind:value={$config.user}
								on:blur={() => ($config.user = $config.user.trim())}
							/>
						</label>
						<label>
							<div>Login</div>
							<input
								type="text"
								bind:value={$config.login}
								on:blur={() => ($config.login = $config.login.trim())}
							/>
						</label>
						<label>
							<div>Password</div>
							<input
								type="text"
								bind:value={$config.pass}
								on:blur={() => ($config.pass = $config.pass.trim())}
							/>
						</label>
					</div>
				</div>
				<div>
					<h2>Your Discord Account</h2>
					<div style="display: flex; flex-direction: column; gap: 4px 0;">
						<label>
							<div>
								User ID Or Username (<span style="color: red;">Not Display Or Nickname!</span>)
							</div>
							<input
								type="text"
								bind:value={$config.discord_username}
								on:blur={() => ($config.discord_username = $config.discord_username.trim())}
							/>
						</label>
					</div>
				</div>
				<div>
					<h2>Discord Dialler Account</h2>
					<div style="display: flex; flex-direction: column; gap: 4px 0;">
						<label>
							<div>Bot / User Account Token</div>
							<input
								type="text"
								bind:value={$config.discord_token}
								on:blur={() => ($config.discord_token = $config.discord_token.trim())}
							/>
						</label>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<div>
		<span>
			Projects like this take lots of time and effort to develop and maintain.
			<a target="_blank" href="https://ko-fi.com/thatrex">
				If you like this project considar supporting its development.
			</a>
		</span>
		<span style="float: right;">
			Developed by <a target="_blank" href="https://rexslab.com">Rex's Lab</a>.
		</span>
	</div>
	<div />
</div>

<svelte:head>
	<meta name="description" content="Browser Softphone with discord integration." />
</svelte:head>
