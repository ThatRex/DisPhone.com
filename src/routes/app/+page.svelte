<script lang="ts">
	import PanelSecondary from '$lib/panel-secondary/panel-secondary.svelte'
	import PanelMain from '$lib/panel-main/panel-main.svelte'
	import { config } from '$lib/stores/config.persistent'
	import { dropText } from '$lib/stores/dial.volitile'

	const vibrate = navigator.vibrate
	$: navigator.vibrate = $config.haptics_disabled ? undefined : vibrate

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

<div
	class="
		block xs:flex flex-col scrollbar-thin
		h-svh max-xs:snap-y snap-mandatory overflow-auto
		"
>
	<PanelMain />
	{#if $config.secondary_panel_enabled}
		<PanelSecondary />
	{/if}
</div>
