<script lang="ts">
	import { config } from '$lib/stores/config.svelte'
	import UI from '$lib/components/ui'
</script>

<UI.Field.Switch
	label="Auto Start"
	bind:value={$config.bot_discord_autostart_enabled}
	default_value={false}
/>
<UI.Field.Switch
	label="Follow Mode"
	description="The bot will follow you between channels and leave when you leave."
	bind:value={$config.bot_discord_follow_mode_enabled}
	default_value={true}
/>

{#each $config.bot_discord_profiles as profile}
	<UI.Field.Group name="Profile">
		<UI.Field.Text
			label="Your User ID"
			description="User ID of your main Discord account."
			placeholder="000000000000000000"
			required={true}
			bind:value={profile.usr_user_id}
		/>
		<UI.Field.Text
			type="password"
			label="Dialer Account Token"
			description="Restart dialer to apply new token."
			required={true}
			bind:value={profile.bot_token}
		/>
	</UI.Field.Group>
	<UI.Field.Group name="Presence">
		<UI.Field.Switch label="Invisible" bind:value={profile.bot_invisible} default_value={false} />
		{#if !profile.bot_invisible}
			<UI.Field.Text
				label="Status"
				placeholder="Hello Discord!"
				max={128}
				bind:value={profile.bot_status_text}
			/>
		{/if}
	</UI.Field.Group>
{/each}
