<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import { createAccordion, melt } from '@melt-ui/svelte'
	import {
		IconAccessible,
		IconAppWindow,
		IconBrandDiscord,
		IconEye,
		IconPhone,
		IconTool,
		IconVolume
	} from '@tabler/icons-svelte'
	import { slide } from 'svelte/transition'
	import Category from './setting-categories'

	const {
		elements: { content, item, trigger, root },
		helpers: { isSelected }
	} = createAccordion({})

	const items = [
		{
			id: 'phone',
			title: 'Softphone',
			icon: IconPhone,
			component: Category.Phone
		},
		{
			id: 'bot',
			title: 'Discord Bot',
			icon: IconBrandDiscord,
			component: Category.Bot
		},
		{
			id: 'interface',
			title: 'Interface',
			icon: IconAppWindow,
			component: Category.Interface
		},
		{
			id: 'accessibility',
			title: 'Accessibility',
			icon: IconAccessible,
			component: Category.Accessibility
		},
		{
			id: 'sound',
			title: 'Sound',
			icon: IconVolume,
			component: Category.Sound
		},
		{
			id: 'hidden',
			title: 'Hidden Features',
			icon: IconEye,
			component: Category.Hidden
		},
		{
			id: 'developer',
			title: 'Developer',
			icon: IconTool,
			component: Category.Developer
		}
	]
</script>

<div {...$root} class="h-full flex flex-col max-xs:justify-end">
	{#each items as { id, title, icon, component }, i}
		<div
			use:melt={$item(id)}
			class="
				{id === 'hidden' && !$config.hidden_settings_enabled && 'hidden'} 
				"
		>
			<h2 class="flex">
				<button
					use:melt={$trigger(id)}
					on:pointerdown={() => navigator.vibrate?.(6)}
					class="
						flex-1 cursor-pointer p-4 font-bold leading-none focus:!ring-0
						{i !== 0 && 'border-t border-black dark:border-white !border-opacity-30'}
						"
				>
					<div class="flex items-center gap-2.5 mx-auto max-w-5xl">
						<svelte:component this={icon} size={20} />
						{title}
					</div>
				</button>
			</h2>
			{#if $isSelected(id)}
				<div
					class="overflow-hidden px-[18px]"
					use:melt={$content(id)}
					transition:slide={{ duration: 250 }}
				>
					<div class="mb-6 mt-3 flex flex-col gap-3 mx-auto max-w-5xl">
						<svelte:component this={component}></svelte:component>
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>
