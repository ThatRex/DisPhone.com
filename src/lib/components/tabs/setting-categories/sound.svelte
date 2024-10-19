<script lang="ts">
	import { config } from '$lib/stores/config.svelte'
	import UI from '$lib/components/ui'
</script>

<UI.Field.Switch
	label="Conference Sounds"
	description="Play call connect and disconnect sounds in the conference."
	bind:value={$config.conference_play_sounds}
	default_value={true}
/>
<UI.Field.Group name="Levels">
	<UI.Field.Slider
		label="Simulated DTMF Tones"
		bind:value={$config.sound_level_simulated_dtmf}
		default_value={10}
		displayValueParser={(n) => (n ? String(n) + '%' : 'Disabled')}
	/>
	<UI.Field.Slider
		label="Ring In"
		bind:value={$config.sound_level_ring_in}
		default_value={50}
		displayValueParser={(n) => (n ? String(n) + '%' : 'Disabled')}
	/>
	<UI.Field.Slider
		label="Ring Out"
		bind:value={$config.sound_level_ring_out}
		default_value={50}
		displayValueParser={(n) => (n ? String(n) + '%' : 'Disabled')}
	/>
</UI.Field.Group>
