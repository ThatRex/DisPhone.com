<script lang="ts">
	import PanelSecondary from '$lib/panel-secondary/panel-secondary.svelte'
	import PanelMain from '$lib/panel-main/panel-main.svelte'
	import { config } from '$lib/stores/config.persistent'
	import { dropText } from '$lib/stores/dial.volitile'

	const vibrate = navigator.vibrate
	$: ({ haptics_disabled, secondary_panel_enabled } = $config)
	$: navigator.vibrate = haptics_disabled ? undefined : vibrate

	// stops firefox setting the document location to dropped text
	document.documentElement.addEventListener('dragover', (e) => {
		if (e.target instanceof HTMLInputElement) return
		e.preventDefault()
	})
	document.documentElement.addEventListener('drop', (e) => {
		if (e.target instanceof HTMLInputElement) return
		dropText(e)
	})
</script>

<div class="overflow-auto h-svh max-xs:snap-y snap-mandatory max-xl:scrollbar-thin">
	<div class="h-full xs:flex flex-col mx-auto max-w-7xl">
		<PanelMain />
		{#if secondary_panel_enabled}
			<PanelSecondary />
		{/if}
	</div>
</div>
