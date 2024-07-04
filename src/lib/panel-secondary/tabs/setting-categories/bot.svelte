<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
	import FieldGroup from '$lib/panel-secondary/ui/field-group.svelte'
	import FieldText from '$lib/panel-secondary/ui/field-text.svelte'
</script>

<FieldSwitch
	label="Auto Start"
	bind:value={$config.bot_discord_autostart_enabled}
	default_value={false}
/>
<FieldSwitch
	label="Follow Mode"
	description="The bot will follow you between channels and leave when you leave."
	bind:value={$config.bot_discord_follow_mode_enabled}
	default_value={true}
/>

{#each $config.bot_discord_profiles as profile}
	<FieldGroup name="Profile">
		<FieldText
			label="Your User ID"
			description="User ID of your main Discord account."
			placeholder="000000000000000000"
			required={true}
			bind:value={profile.usr_user_id}
		/>
		<FieldText
			type="password"
			label="Dialer Account Token"
			description="Restart dialer to apply new token."
			required={true}
			bind:value={profile.bot_token}
		/>
	</FieldGroup>
	<FieldGroup name="Presence">
		<FieldSwitch label="Invisible" bind:value={profile.bot_invisible} default_value={false} />
		{#if !profile.bot_invisible}
			<FieldText
				label="Status"
				placeholder="Hello Discord!"
				max={128}
				bind:value={profile.bot_status_text}
			/>
		{/if}
	</FieldGroup>
{/each}
