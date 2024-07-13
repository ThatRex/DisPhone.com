<script lang="ts">
	import { config } from '$lib/stores/config.svelte'
	import UI from '$lib/components/ui'

	$: ({ sip_expert_settings_enabled } = $config)
</script>

<UI.Field.Group name="Profile" description="Refresh page to apply changes.">
	{#each $config.sip_profiles as { register, early_media, server_stun, server_ws, server_sip, username, login, password, number_voicemail }}
		<UI.Field.Switch
			label="Expert Settings"
			bind:value={$config.sip_expert_settings_enabled}
			default_value={false}
		/>
		{#if sip_expert_settings_enabled || !register}
			<UI.Field.Switch
				label="Register"
				description="Allow this profile to receive calls and voicemail updates."
				bind:value={register}
				default_value={true}
			/>
		{/if}
		{#if sip_expert_settings_enabled || !early_media}
			<UI.Field.Switch
				label="Early Media"
				description="Play media sent before the call is connected."
				bind:value={early_media}
				default_value={true}
			/>
		{/if}
		{#if sip_expert_settings_enabled || server_stun}
			<UI.Field.Text
				label="STUN Server"
				placeholder="stun.l.google.com:19302"
				bind:value={server_stun}
			/>
		{/if}
		{#if sip_expert_settings_enabled || server_ws}
			<UI.Field.Text
				label="WebSocket Server"
				placeholder="yourpbx.tel:8089/ws"
				bind:value={server_ws}
			/>
		{/if}
		<UI.Field.Text
			label="Server"
			placeholder="yourpbx.tel:5060"
			required={true}
			bind:value={server_sip}
		/>
		<UI.Field.Text label="Username" placeholder="1001" required={true} bind:value={username} />
		{#if sip_expert_settings_enabled || login}
			<UI.Field.Text label="Login" bind:value={login} />
		{/if}
		<UI.Field.Text label="Password" type="password" bind:value={password} />
		{#if sip_expert_settings_enabled || number_voicemail}
			<UI.Field.Text label="Voicemail Number" placeholder="*97" bind:value={number_voicemail} />
		{/if}
	{/each}
</UI.Field.Group>
