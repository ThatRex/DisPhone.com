<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import UI from '$lib/components/ui'
</script>

<UI.Field.Switch
	label="Mute On Deafen"
	description="Automatically mute input when output muted."
	bind:value={$config.mute_on_deafen}
	default_value={true}
/>
<UI.Field.Switch
	label="Disable Haptics"
	description="Disable UI vibrations. Chrome mobile only."
	bind:value={$config.haptics_disabled}
	default_value={false}
/>
