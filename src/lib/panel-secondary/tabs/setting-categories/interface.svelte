<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
	import FieldGroup from '$lib/panel-secondary/ui/field-group.svelte'
	import FieldRadioGroup from '$lib/panel-secondary/ui/field-radio-group.svelte'
	import FieldSlider from '$lib/panel-secondary/ui/field-slider.svelte'
</script>

<FieldGroup
	name="Dialpad"
	description="Dialpad will always be hidden in views narrower than 640px."
>
	<FieldSwitch label="Enabled" bind:value={$config.dialpad_enabled} default_value={true} />
	{#if $config.dialpad_enabled}
		<FieldSwitch
			label="Extended Keypad"
			bind:value={$config.dialpad_extended}
			default_value={false}
		/>
		<FieldSwitch
			label="Numeric Layout"
			bind:value={$config.dialpad_numeric}
			default_value={false}
		/>
		<FieldSwitch
			label="Touchescreen Mode"
			description="Stops keyboard opening on keypress."
			bind:value={$config.dialpad_touchescreen_mode}
			default_value={false}
		/>
	{/if}
</FieldGroup>

<FieldGroup name="Behaviour">
	<FieldSwitch
		label="Hold Unselected Calls"
		description="When not in conference mode unselected calls will be put on hold."
		bind:value={$config.hold_unselected_calls}
		default_value={true}
	/>
	<FieldSlider
		label="Disconnected Call Visibility Timeout"
		description="How long a disconnected call remains visible."
		bind:value={$config.disconnected_timeout_ms}
		displayValueParser={(n) => String(n / 1000) + 's'}
		default_value={2500}
		max={5000}
		step={500}
	/>
	<FieldSlider
		label="Auto Answer Delay"
		bind:value={$config.auto_answer_delay_ms}
		displayValueParser={(n) => String(n / 1000) + 's'}
		default_value={0}
		max={30000}
		step={500}
	/>
</FieldGroup>

<FieldRadioGroup
	name="After Dial Call Selection"
	description="When a new call should be selected."
	bind:value={$config.after_dial_call_selection_mode}
	options={[
		{
			label: 'Always',
			value: 'always',
			default: true
		},

		{
			label: 'No Calls Selected',
			value: 'non-selected'
		},
		{
			label: 'Never',
			value: 'never'
		}
	]}
/>

<FieldRadioGroup
	name="Close Confirmation"
	description="When confirmation should be requested before exiting."
	bind:value={$config.close_confirmation_mode}
	options={[
		{
			label: 'Always',
			value: 'always'
		},

		{
			label: 'Calls Active',
			value: 'calls-active',
			default: true
		},
		{
			label: 'Never',
			value: 'never'
		}
	]}
/>
