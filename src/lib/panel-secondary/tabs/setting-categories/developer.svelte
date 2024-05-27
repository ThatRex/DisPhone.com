<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
	import FieldGroup from '$lib/panel-secondary/ui/field-group.svelte'
	import { dev } from '$app/environment'
</script>

<FieldGroup name="Debug" description="Logs debug information to the console.">
	<FieldSwitch label="Softphone" bind:value={$config.sip_debug_enabled} default_value={dev} />
	<FieldSwitch
		label="Discord Bot"
		bind:value={$config.bot_discord_debug_enabled}
		default_value={dev}
	/>
</FieldGroup>
