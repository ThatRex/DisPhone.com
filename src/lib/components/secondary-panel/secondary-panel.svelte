<script lang="ts">
	import { createTabs, melt, createSync } from '@melt-ui/svelte'
	import { IconBook2, IconSettings2, IconUsers } from '@tabler/icons-svelte'
	import TabConfig from './tab-config.svelte'
	import TabLogs from './tab-logs.svelte'
	import TabContacts from './tab-contacts.svelte'
	import ButtonTab from '../core/button-tab.svelte'
	import { config } from '$lib/stores/config.persistent'
	import Filler from './filler.svelte'

	const {
		elements: { root, list, content, trigger },
		states
	} = createTabs({
		loop: true,
		orientation: 'vertical',
		defaultValue: $config.secondary_panel_tab_root
	})

	const sync = createSync(states)
	$: sync.value($config.secondary_panel_tab_root, (v) => {
		if ($config.secondary_panel_tab_root !== v) navigator.vibrate?.(6)
		$config.secondary_panel_tab_root = v
	})

	const triggers = [
		{ id: 'logs', title: 'Logs', icon: IconBook2 },
		{ id: 'contacts', title: 'Contacts', icon: IconUsers },
		{ id: 'config', title: 'Config', icon: IconSettings2 }
	]
</script>

<div use:melt={$root} class="flex grow gap-2">
	<Filler>
		<div use:melt={$list} class="flex flex-col gap-2">
			{#each triggers as t}
				<div use:melt={$trigger(t.id)} class="!outline-none">
					<ButtonTab
						tip={t.title}
						tip_placement="right"
						icon={t.icon}
						value={$config.secondary_panel_tab_root === t.id}
					/>
				</div>
			{/each}
		</div>
	</Filler>
	<div class="flex-1 grow">
		<div style="height: 100%;" use:melt={$content('logs')}>
			<TabLogs />
		</div>
		<div style="height: 100%;" use:melt={$content('contacts')}>
			<TabContacts />
		</div>
		<div style="height: 100%;" use:melt={$content('config')}>
			<TabConfig on:apply />
		</div>
	</div>
</div>
