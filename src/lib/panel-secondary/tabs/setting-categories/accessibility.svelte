<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
	import FieldGroup from '$lib/panel-secondary/ui/field-group.svelte'
</script>

<FieldSwitch label="Simulate DTMF Tones" bind:value={$config.simulate_dtmf} />
<FieldSwitch
	label="Mute On Deafen"
	description="Automatically mute input when output muted."
	bind:value={$config.mute_on_deafen}
/>
<FieldSwitch
	label="Disable Haptics"
	description="Disable UI vibrations. Chrome mobile only."
	bind:value={$config.haptics_disabled}
/>

<FieldGroup name="Dialpad">
	<FieldSwitch
		label="Enabled"
		description="Dialpad will be hidden on screens narrower than 640px."
		bind:value={$config.dialpad_enabled}
	/>
	<FieldSwitch label="Extended" bind:value={$config.dialpad_extended} />
	<FieldSwitch label="Numeric" bind:value={$config.dialpad_numeric} />
	<FieldSwitch
		label="Focus Destination Field"
		description="On key press focus destination field."
		bind:value={$config.dialpad_focus_dial_field}
	/>
</FieldGroup>
