<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
	import FieldGroup from '$lib/panel-secondary/ui/field-group.svelte'
	import FieldText from '$lib/panel-secondary/ui/field-text.svelte'
</script>

<FieldSwitch label="Auto Start" bind:value={$config.bot_discord_autostart_enabled} />
<FieldSwitch
	label="Follow Mode"
	description="Bot will follow you between channels and leave when you leave."
	bind:value={$config.bot_discord_follow_mode_enabled}
/>

<FieldGroup name="Profile" description="Restart bot to apply changes.">
	<FieldText
		label="Your User ID"
        description="User ID of your main Discord account."
		placeholder="000000000000000000"
		required={true}
		bind:value={$config.cfg_discord_profiles[0].usr_user_id}
	/>
	<FieldText
		type="password"
		label="Dialler Account Token"
		required={true}
		bind:value={$config.cfg_discord_profiles[0].bot_token}
	/>
	<FieldText
		label="Text Status"
		bind:value={$config.cfg_discord_profiles[0].bot_status_text}
	/>
</FieldGroup>
