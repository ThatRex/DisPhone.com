<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
</script>

<FieldSwitch
	label="Auto Redial"
	description="Adds an auto redial toggle to each call item."
	bind:value={$config.auto_redial_enabled}
/>