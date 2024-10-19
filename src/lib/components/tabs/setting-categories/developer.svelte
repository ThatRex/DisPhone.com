<script lang="ts">
	import { config } from '$lib/stores/config.svelte'
	import schema from '$lib/schemas'
	import { dev } from '$app/environment'
	import { IconCheck, IconCopy, IconX, IconFileDownload } from '@tabler/icons-svelte'
	import type { ColorsBtn } from '$lib/components/ui/colors'
	import UI from '$lib/components/ui'

	let copying = false
	let btn_copy_icon: Component = IconCopy
	let btn_copy_color: ColorsBtn = 'mono'

	let pasting = false
	let btn_paste_icon: Component = IconFileDownload
	let btn_paste_color: ColorsBtn = 'blue'

	const exportConfig = async () => {
		copying = true

		try {
			const string = JSON.stringify($config)
			const base64 = btoa(encodeURI(string))
			await navigator.clipboard.writeText(base64)
			btn_copy_icon = IconCheck
			btn_copy_color = 'green'
		} catch (e) {
			console.error('Error exporting config:', e)
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
			const base64 = decodeURI(atob(string.trim()))
			const json = JSON.parse(base64)
			const parsed = schema.config.parse(json)
			$config = parsed
			btn_paste_icon = IconCheck
			btn_paste_color = 'green'
		} catch (e) {
			console.error('Error importing config:', e)
			btn_paste_icon = IconX
			btn_paste_color = 'red'
		}

		setTimeout(() => {
			btn_paste_icon = IconFileDownload
			btn_paste_color = 'blue'
		}, 1000)

		pasting = false
	}
</script>

<UI.Field.Group
	name="Copy Paste Settings"
	description="Keep this safe! Passwords and tokens are within."
>
	<div class="flex gap-2">
		<UI.ButtonText
			label="Copy"
			icon={btn_copy_icon}
			color={btn_copy_color}
			on:click={exportConfig}
			disabled={copying}
		/>
		<UI.ButtonText
			label="Paste"
			icon={btn_paste_icon}
			color={btn_paste_color}
			on:click={importConfig}
			disabled={pasting}
		/>
	</div>
</UI.Field.Group>

<UI.Field.Group name="Debug" description="Logs debug information to the console.">
	<UI.Field.Switch
		label="Softphone"
		description="Refresh page to apply."
		bind:value={$config.sip_debug_enabled}
		default_value={dev}
	/>
	<UI.Field.Switch
		label="Discord Dialer"
		description="Restart dialer to apply."
		bind:value={$config.bot_discord_debug_enabled}
		default_value={dev}
	/>
</UI.Field.Group>
