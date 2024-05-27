<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
</script>

<FieldSwitch label="Simulate DTMF Tones" bind:value={$config.simulate_dtmf} default_value={true} />
<FieldSwitch
	label="Mute On Deafen"
	description="Automatically mute input when output muted."
	bind:value={$config.mute_on_deafen}
	default_value={true}
/>
<FieldSwitch
	label="Disable Haptics"
	description="Disable UI vibrations. Chrome mobile only."
	bind:value={$config.haptics_disabled}
	default_value={false}
/>
