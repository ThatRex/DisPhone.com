<script lang="ts">
	import PanelSecondary from '$lib/components/panel-secondary.svelte'
	import PanelMain from '$lib/components/panel-main.svelte'
	import { state } from '$lib/stores/state.svelte'
	import { config } from '$lib/stores/config.svelte'
	import { dropText } from '$lib/stores/dial.svelte'
	import { setContext } from 'svelte'
	import PhoneClient from '$lib/client-phone'

	const ac = new AudioContext()
	const phone = new PhoneClient({ ac, debug: $config.sip_debug_enabled })

	setContext('ac', ac)
	setContext('phone', phone)

	$: ({ haptics_disabled, theme_mode } = $config)
	$: ({ secondary_panel_enabled } = $state)

	const vibrate = navigator.vibrate
	$: navigator.vibrate = haptics_disabled ? undefined : vibrate
	$: document.documentElement.setAttribute('data-theme-mode', theme_mode)

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

<div class="container-wrapper h-svh">
	<div
		class="overflow-auto h-svh max-xs:snap-y snap-mandatory max-xl:scrollbar-thin wrapper-min-snap"
	>
		<div class="h-full xs:flex flex-col mx-auto max-w-7xl">
			<PanelMain />
			<PanelSecondary hidden={!secondary_panel_enabled} />
		</div>
	</div>
</div>

<style lang="postcss">
	.container-wrapper {
		container-name: wrapper;
		container-type: size;
	}

	@container wrapper (283px <= height <= 298px) {
		.wrapper-min-snap {
			@apply snap-y;
		}
	}
</style>
