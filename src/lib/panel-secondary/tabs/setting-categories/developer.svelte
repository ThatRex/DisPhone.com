<script lang="ts">
	import { config, schema } from '$lib/stores/config.persistent'
	import FieldSwitch from '$lib/panel-secondary/ui/field-switch.svelte'
	import FieldGroup from '$lib/panel-secondary/ui/field-group.svelte'
	import { dev } from '$app/environment'
	import Button from '$lib/panel-secondary/ui/button.svelte'
	import { IconCheck, IconCopy, IconX, IconFileArrowLeft } from '@tabler/icons-svelte'
	import type { ColorsBtn } from '$lib/components/colors'

	let copying = false
	let btn_copy_icon: Component = IconCopy
	let btn_copy_color: ColorsBtn = 'mono'

	let pasting = false
	let btn_past_icon: Component = IconFileArrowLeft
	let btn_past_color: ColorsBtn = 'blue'

	const exportConfig = async () => {
		copying = true

		try {
			const string = JSON.stringify($config)
			const base64 = btoa(string)
			await navigator.clipboard.writeText(base64)
			btn_copy_icon = IconCheck
			btn_copy_color = 'green'
		} catch {
			btn_copy_icon = IconX
			btn_copy_color = 'red'
		}

		setTimeout(() => {
			btn_copy_icon = IconCopy
			btn_copy_color = 'mono'
		}, 1000)

		copying = false
	}

	const importConfig = async () => {
		pasting = true

		try {
			const string = await navigator.clipboard.readText()
			const base64 = atob(string.trim())
			const json = JSON.parse(base64)
			const parsed = schema.parse(json)
			$config = parsed
			btn_past_icon = IconCheck
			btn_past_color = 'green'
		} catch {
			btn_past_icon = IconX
			btn_past_color = 'red'
		}

		setTimeout(() => {
			btn_past_icon = IconFileArrowLeft
			btn_past_color = 'blue'
		}, 1000)

		pasting = false
	}
</script>

<FieldGroup
	name="Copy Past Settings"
	description="DO NOT SHARE! Passwords and tokens are included."
>
	<div class="flex gap-2">
		<Button
			label="Copy"
			icon={btn_copy_icon}
			color={btn_copy_color}
			on:click={exportConfig}
			disabled={copying}
		/>
		<Button
			label="Past"
			icon={btn_past_icon}
			color={btn_past_color}
			on:click={importConfig}
			disabled={pasting}
		/>
	</div>
</FieldGroup>

<FieldGroup name="Debug" description="Logs debug information to the console.">
	<FieldSwitch label="Softphone" bind:value={$config.sip_debug_enabled} default_value={dev} />
	<FieldSwitch
		label="Discord Bot"
		bind:value={$config.bot_discord_debug_enabled}
		default_value={dev}
	/>
</FieldGroup>
