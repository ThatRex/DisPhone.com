<script lang="ts">
	import { config } from '$lib/stores/config.svelte'
	import UI from '$lib/components/ui'
</script>

<UI.Field.RadioGroup
	name="Theme"
	bind:value={$config.theme_mode}
	options={[
		{ label: 'Sync with device', value: 'device', default: true },
		{ label: 'Dark', value: 'dark' },
		{ label: 'Light', value: 'light' }
	]}
/>

<UI.Field.Group
	name="Dialpad"
	description="Dialpad will always be hidden in views narrower than 640px."
>
	<UI.Field.Switch label="Enabled" bind:value={$config.dialpad_enabled} default_value={true} />
	{#if $config.dialpad_enabled}
		<UI.Field.Switch
			label="Extended Keypad"
			bind:value={$config.dialpad_extended}
			default_value={false}
		/>
		<UI.Field.Switch
			label="Numeric Layout"
			bind:value={$config.dialpad_numeric}
			default_value={false}
		/>
		<UI.Field.Switch
			label="Touchscreen Mode"
			description="Stops keyboard opening on keypress."
			bind:value={$config.dialpad_touchscreen_mode}
			default_value={false}
		/>
	{/if}
</UI.Field.Group>

<UI.Field.Group name="Behaviour">
	{#if 'chrome' in window}
		<UI.Field.Switch
			label="Audio Interaction Request"
			description="Not hearing Audio? Enable this, then refresh."
			bind:value={$config.audio_request_interaction}
			default_value={false}
		/>
	{/if}
	<UI.Field.Switch
		label="Hold Unselected Calls"
		description="When not in conference mode unselected calls will be put on hold."
		bind:value={$config.hold_unselected_calls}
		default_value={true}
	/>
	<UI.Field.Slider
		label="Disconnected Call Visibility Timeout"
		description="How long a disconnected call remains visible."
		bind:value={$config.disconnected_timeout_ms}
		displayValueParser={(n) => String(n / 1000) + 's'}
		default_value={2500}
		max={5000}
		step={500}
	/>
	<UI.Field.Slider
		label="Auto Answer Delay"
		bind:value={$config.auto_answer_delay_ms}
		displayValueParser={(n) => String(n / 1000) + 's'}
		default_value={0}
		max={30000}
		step={500}
	/>
</UI.Field.Group>

<UI.Field.RadioGroup
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

<UI.Field.RadioGroup
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
