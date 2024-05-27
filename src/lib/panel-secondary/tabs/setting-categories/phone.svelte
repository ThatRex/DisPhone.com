<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
	import FieldGroup from '$lib/panel-secondary/ui/field-group.svelte'
	import FieldText from '$lib/panel-secondary/ui/field-text.svelte'
</script>

{#each $config.sip_profiles as profile}
	<FieldGroup name="Profile" description="Refresh page to apply changes.">
		<FieldSwitch
			label="Expert Settings"
			bind:value={$config.sip_expert_settings_enabled}
			default_value={false}
		/>
		{#if $config.sip_expert_settings_enabled}
			<FieldSwitch
				label="Register"
				description="Allow this device to receive calls and voicemail updates."
				bind:value={profile.register}
				default_value={true}
			/>
			<FieldSwitch
				label="Early Media"
				description="Play media sent before the call is connected."
				bind:value={profile.early_media}
				default_value={true}
			/>
			<FieldText
				label="WebSocket Server"
				placeholder="yourpbx.tel:8089/ws"
				bind:value={profile.ws_server}
			/>
		{/if}
		<FieldText
			label="Server"
			placeholder="yourpbx.tel:5060"
			required={true}
			bind:value={profile.sip_server}
		/>
		<FieldText label="Username" placeholder="1001" required={true} bind:value={profile.username} />
		{#if $config.sip_expert_settings_enabled}
			<FieldText label="Login" bind:value={profile.login} />
		{/if}
		<FieldText label="Password" type="password" bind:value={profile.password} />
		{#if $config.sip_expert_settings_enabled}
			<FieldText label="Voicemail Number" placeholder="*97" bind:value={profile.voicemail_number} />
		{/if}
	</FieldGroup>
{/each}
