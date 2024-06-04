<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
	import FieldGroup from '$lib/panel-secondary/ui/field-group.svelte'
	import FieldText from '$lib/panel-secondary/ui/field-text.svelte'

	$: ({ sip_expert_settings_enabled } = $config)
</script>

<FieldGroup name="Profile" description="Refresh page to apply changes.">
	{#each $config.sip_profiles as { register, early_media, server_stun, server_ws, server_sip, username, login, password, number_voicemail }}
		<FieldSwitch
			label="Expert Settings"
			bind:value={$config.sip_expert_settings_enabled}
			default_value={false}
		/>
		{#if sip_expert_settings_enabled || !register}
			<FieldSwitch
				label="Register"
				description="Allow this profile to receive calls and voicemail updates."
				bind:value={register}
				default_value={true}
			/>
		{/if}
		{#if sip_expert_settings_enabled || !early_media}
			<FieldSwitch
				label="Early Media"
				description="Play media sent before the call is connected."
				bind:value={early_media}
				default_value={true}
			/>
		{/if}
		{#if sip_expert_settings_enabled || server_stun}
			<FieldText
				label="STUN Server"
				placeholder="stun.l.google.com:19302"
				bind:value={server_stun}
			/>
		{/if}
		{#if sip_expert_settings_enabled || server_ws}
			<FieldText
				label="WebSocket Server"
				placeholder="yourpbx.tel:8089/ws"
				bind:value={server_ws}
			/>
		{/if}
		<FieldText
			label="Server"
			placeholder="yourpbx.tel:5060"
			required={true}
			bind:value={server_sip}
		/>
		<FieldText label="Username" placeholder="1001" required={true} bind:value={username} />
		{#if sip_expert_settings_enabled || login}
			<FieldText label="Login" bind:value={login} />
		{/if}
		<FieldText label="Password" type="password" bind:value={password} />
		{#if sip_expert_settings_enabled || number_voicemail}
			<FieldText label="Voicemail Number" placeholder="*97" bind:value={number_voicemail} />
		{/if}
	{/each}
</FieldGroup>
