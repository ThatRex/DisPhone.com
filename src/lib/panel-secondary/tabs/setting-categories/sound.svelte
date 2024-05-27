<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
	import FieldSlider from '$lib/panel-secondary/ui/field-slider.svelte'
	import FieldGroup from '$lib/panel-secondary/ui/field-group.svelte'
</script>

<FieldSwitch
	label="Conference Sounds"
	description="Play call connect and disconnect sounds in the conference."
	bind:value={$config.conference_play_sounds}
	default_value={false}
/>
<FieldGroup name="Ringer Volume">
	<FieldSlider
		label="Ring In"
		bind:value={$config.sound_level_ring_in}
		default_value={50}
		displayValueParser={(n) => (n ? String(n) + '%' : 'Disabled')}
	/>
	<FieldSlider
		label="Ring Out"
		bind:value={$config.sound_level_ring_out}
		default_value={50}
		displayValueParser={(n) => (n ? String(n) + '%' : 'Disabled')}
	/>
</FieldGroup>
