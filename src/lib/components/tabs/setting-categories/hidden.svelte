<script lang="ts">
	import { config } from '$lib/stores/config.svelte'
	import UI from '$lib/components/ui'
	import { IconCheck, IconListCheck } from '@tabler/icons-svelte'
	import { getContext } from 'svelte'
	import PhoneClient from '$lib/client-phone'
	import { call_ids_selected } from '$lib/stores/calls.svelte'

	$: ({
		auto_redial_delay_ms_min_max: delay_ms_min_max,
		auto_redial_max_sequential_failed_calls: max_sequential_failed_calls,
		auto_redial_short_call_duration_ms: short_call_duration_ms
	} = $config)

	const phone = getContext<PhoneClient>('phone')
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
		<div class="flex grow justify-end gap-2">
			<UI.ButtonText
				color="blue"
				icon={IconCheck}
				label="Update Selected"
				on:click={() =>
					phone.setAutoRedial({
						ids: $call_ids_selected,
						delay_ms_min_max,
						max_sequential_failed_calls,
						short_call_duration_ms
					})}
			/>
			<UI.ButtonText
				color="purple"
				icon={IconListCheck}
				label="Update All"
				on:click={() =>
					phone.setAutoRedial({
						delay_ms_min_max,
						max_sequential_failed_calls,
						short_call_duration_ms
					})}
			/>
		</div>
	</UI.Field.Group>
{/if}
