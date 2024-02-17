<script lang="ts">
	import { createTabs, melt, createSync } from '@melt-ui/svelte'
	import { IconDeviceAudioTape, IconBook2, IconSettings2, IconUsers } from '@tabler/icons-svelte'
	import TabConfig from './tab-config.svelte'
	import TabLogs from './tab-logs.svelte'
	import TabContacts from './tab-contacts.svelte'
	import TabSoundboard from './tab-soundboard.svelte'
	import ButtonTab from '../core/button-tab.svelte'
	import { config } from '$lib/stores/state.persistent'
	import Filler from './filler.svelte'

	const {
		elements: { root, list, content, trigger },
		states
	} = createTabs({
		loop: true,
		orientation: 'vertical',
		defaultValue: $config.tab_secondary_panel
	})

	const sync = createSync(states)
	$: sync.value($config.tab_secondary_panel, (v) => {
		if ($config.tab_secondary_panel !== v) navigator.vibrate(6)
		$config.tab_secondary_panel = v
	})

	const triggers = [
		// { id: 'logs', title: 'Logs', icon: IconBook2 },
		// { id: 'contacts', title: 'Contacts', icon: IconUsers },
		// { id: 'soundboard', title: 'Soundboard', icon: IconDeviceAudioTape },
		{ id: 'config', title: 'Config', icon: IconSettings2 }
	]
</script>

<div use:melt={$root} class="flex gap-2">
	<Filler>
		<div use:melt={$list} class="flex flex-col gap-2">
			{#each triggers as t}
				<div use:melt={$trigger(t.id)} class="!outline-none">
					<ButtonTab
						tip={t.title}
						tip_placement="right"
						icon={t.icon}
						value={$config.tab_secondary_panel === t.id}
					/>
				</div>
			{/each}
		</div>
	</Filler>
	<div class="flex-1 min-w-0">
		<div use:melt={$content('logs')}>
			<TabLogs />
		</div>
		<div use:melt={$content('contacts')}>
			<TabContacts />
		</div>
		<div use:melt={$content('soundboard')}>
			<TabSoundboard />
		</div>
		<div use:melt={$content('config')}>
			<TabConfig on:apply />
		</div>
	</div>
</div>
