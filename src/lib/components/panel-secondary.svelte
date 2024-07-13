<script lang="ts">
	import { createTabs, melt, createSync } from '@melt-ui/svelte'
	import { IconBook2, IconInfoCircle, IconSettings2, IconUsers } from '@tabler/icons-svelte'
	import { config } from '$lib/stores/config.svelte'
	import UI from './ui'
	import Tab from './tabs/'

	export let hidden = false

	const {
		elements: { root, list, content, trigger },
		states
	} = createTabs({
		loop: true,
		orientation: 'vertical',
		defaultValue: $config.secondary_panel_tab
	})

	const sync = createSync(states)
	$: sync.value(
		$config.secondary_panel_tab,
		(v) => ($config.secondary_panel_tab = v as typeof $config.secondary_panel_tab)
	)

	const triggers = [
		{ id: 'logs', title: 'Logs', icon: IconBook2, tab: Tab.Logs, padding: true },
		{ id: 'contacts', title: 'Contacts', icon: IconUsers, tab: Tab.Contacts, padding: true },
		{ id: 'settings', title: 'Settings', icon: IconSettings2, tab: Tab.Settings, padding: false },
		{ id: 'about', title: 'About', icon: IconInfoCircle, tab: Tab.About, padding: true }
	]
</script>

<section
	use:melt={$root}
	class="flex grow gap-2 max-xs:min-h-svh snap-start -mt-2 scroll-mb-3 {hidden ? 'hidden' : ''}"
>
	<!-- Sidebar -->
	<div
		class="
			xs:h-full max-xs:h-svh max-h-svh pl-3 py-3
			flex flex-col max-xs:flex-col-reverse
			sticky xs:top-0 max-xs:bottom-0
			xs:self-start max-xs:self-end
			overflow-auto scrollbar-none
			"
	>
		<div use:melt={$list} class="flex flex-col gap-2">
			{#each triggers as t}
				<div use:melt={$trigger(t.id)} class="!outline-none">
					<UI.ButtonTab tip={t.title} icon={t.icon} value={$config.secondary_panel_tab === t.id} />
				</div>
			{/each}
		</div>
		<div class="h-0 flex grow overflow-hidden">
			<div
				class="
					xs:mt-2 max-xs:mb-2 grow rounded-md
					border-2 border-neutral-500 dark:border-neutral-300 !border-opacity-20
				  bg-neutral-500 dark:bg-neutral-300 !bg-opacity-5
					"
			/>
		</div>
	</div>
	<!-- Content -->
	<div class="flex grow wrapper-min-h">
		<div
			class="
				w-0 flex grow rounded-md mr-3 my-3
				border border-black dark:border-white !border-opacity-30
				"
		>
			{#each triggers as { id, tab, padding }}
				<div use:melt={$content(id)} class="flex-1 {padding && 'p-2.5'}">
					<svelte:component this={tab} />
				</div>
			{/each}
		</div>
	</div>
</section>

<style lang="postcss">
	@container wrapper (height <= 298px) {
		.wrapper-min-h {
			@apply min-h-svh;
		}
	}
</style>
