<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
	import FieldGroup from '$lib/panel-secondary/ui/field-group.svelte'
	import FieldSlider from '$lib/panel-secondary/ui/field-slider.svelte'
	import FieldSliderDuo from '$lib/panel-secondary/ui/field-slider-duo.svelte'
</script>

<!-- <FieldSwitch label="Auto Record" description="Record calls automatically." /> -->

<FieldGroup name="Auto Redial">
	<FieldSwitch
		label="Enabled"
		description="Add an auto redial toggle to each call item."
		bind:value={$config.auto_redial_enabled}
	/>
	<!-- {#if $config.auto_redial_enabled}
		<FieldSliderDuo
			label="Delay Min Max"
			displayValueParser={(n) => String(n / 1000) + 's'}
			default_value={[2000, 4500]}
			step={100}
			max={30000}
			bind:value={$config.auto_redial_delay_ms_min_max}
		/>
		<FieldSlider
			label="Max Sequential Failed Calls"
			description="When a call fails too many times auto redial will stop automatically."
			displayValueParser={(n) => (n === 0 ? 'Disabled' : String(n))}
			max={20}
			default_value={3}
			bind:value={$config.auto_redial_max_sequential_failed_calls}
		/>
		<FieldSlider
			label="Short Call Duration"
			description="Calls with a duration less or equal to this value will be considered failed."
			displayValueParser={(n) => String(n / 1000) + 's'}
			step={100}
			max={60000}
			default_value={4000}
			bind:value={$config.auto_redial_short_call_duration_ms}
		/>
	{/if} -->
</FieldGroup>
