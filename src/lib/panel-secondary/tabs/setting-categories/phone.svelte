<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
	import FieldGroup from '$lib/panel-secondary/ui/field-group.svelte'
	import FieldText from '$lib/panel-secondary/ui/field-text.svelte'
</script>

<FieldGroup name="Profile" description="Refresh page to apply changes.">
	<FieldSwitch label="Expert Settings" bind:value={$config.sip_expert_settings_enabled} />
	{#if $config.sip_expert_settings_enabled}
		<FieldSwitch
			label="Register"
			description="Allow this device to receive calls and voicemail updates."
			bind:value={$config.cfg_sip_profiles[0].register}
		/>
	{/if}
	<FieldText
		label="Server"
		placeholder="yourpbx.tel"
		required={true}
		bind:value={$config.cfg_sip_profiles[0].sip_server}
	/>
	<FieldText
		label="User"
		placeholder="1001"
		required={true}
		bind:value={$config.cfg_sip_profiles[0].username}
	/>
	{#if $config.sip_expert_settings_enabled}
		<FieldText label="Login" bind:value={$config.cfg_sip_profiles[0].login} />
	{/if}
	<FieldText label="Password" type="password" bind:value={$config.cfg_sip_profiles[0].password} />
	{#if $config.sip_expert_settings_enabled}
		<FieldText
			label="Voicemail Number"
			placeholder="*97"
			bind:value={$config.cfg_sip_profiles[0].voicemail_number}
		/>
	{/if}
</FieldGroup>
