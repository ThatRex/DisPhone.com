<script lang="ts">
	import { config } from '$lib/stores/config.svelte'
	import UI from '$lib/components/ui'
</script>

<UI.Field.Switch
	label="Auto Redial"
	description="Add an auto redial toggle to each call."
	bind:value={$config.auto_redial_enabled}
/>

{#if $config.auto_redial_enabled}
	<UI.Field.Group name="Auto Redial Defaults">
		<UI.Field.SliderDuo
			label="Delay Min Max"
			displayValueParser={(n) => String(n / 1000) + 's'}
			default_value={[2000, 4500]}
			step={100}
			max={30000}
			bind:value={$config.auto_redial_delay_ms_min_max}
		/>
		<UI.Field.Slider
			label="Max Sequential Failed Calls"
			description="When a call fails too many times auto redial will stop automatically."
			displayValueParser={(n) => (n === 0 ? 'Disabled' : String(n))}
			max={20}
			default_value={3}
			bind:value={$config.auto_redial_max_sequential_failed_calls}
		/>
		<UI.Field.Slider
			label="Short Call Duration"
			description="Calls with a duration less or equal to this value will be considered failed."
			displayValueParser={(n) => String(n / 1000) + 's'}
			step={100}
			max={60000}
			default_value={4000}
			bind:value={$config.auto_redial_short_call_duration_ms}
		/>
	</UI.Field.Group>
{/if}
