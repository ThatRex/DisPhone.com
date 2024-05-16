<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
</script>

<FieldSwitch label="Conference Sounds" description="Play call connect and disconnect sounds to conference." bind:value={$config.conference_play_sounds} />
