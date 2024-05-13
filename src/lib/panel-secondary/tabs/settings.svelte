<script lang="ts">
	import { config } from '$lib/stores/config.persistent'
	import { createAccordion, melt } from '@melt-ui/svelte'
	import {
		IconAccessible,
		IconBrandDiscord,
		IconEye,
		IconPhone,
		IconTool,
		IconVolume
	} from '@tabler/icons-svelte'
	import { slide } from 'svelte/transition'
	import Categories from './setting-categories'

	const {
		elements: { content, item, trigger, root },
		helpers: { isSelected }
	} = createAccordion()

	const items = [
		{
			id: 'phone',
			title: 'Softphone',
			icon: IconPhone,
			component: Categories.Phone
		},
		{
			id: 'bot',
			title: 'Discord Bot',
			icon: IconBrandDiscord,
			component: Categories.Bot
		},
		{
			id: 'sound',
			title: 'Sounds',
			icon: IconVolume,
			component: Categories.Sound
		},
		{
			id: 'accessibility',
			title: 'Accessibility',
			icon: IconAccessible,
			component: Categories.Accessibility
		},
		{
			id: 'hidden',
			title: 'Hidden Features',
			icon: IconEye,
			component: Categories.Hidden
		},
		{
			id: 'developer',
			title: 'Developer',
			icon: IconTool,
			component: Categories.Developer
		}
	]
</script>

<div {...$root} class="h-full flex flex-col max-xs:justify-end mx-auto max-w-5xl">
	{#each items as { id, title, icon, component }, i}
		<div
			use:melt={$item(id)}
			class="
				overflow-hidden transition-colors duration-75
				{id === 'hidden' && !$config.hidden_settings_enabled && 'hidden'} 
				"
		>
			<h2 class="flex">
				<button
					use:melt={$trigger(id)}
					on:pointerdown={() => navigator.vibrate?.(6)}
					class="
						flex flex-1 cursor-pointer items-center gap-2.5
						py-4 px-2 font-bold leading-none focus:!ring-0
						{i !== 0 && 'border-t border-black dark:border-white !border-opacity-30'}
						{i === 0 && 'pt-2'}
						{i === items.length - 1 && 'pb-2'}
						"
				>
					<svelte:component this={icon} size={20} />
					{title}
				</button>
			</h2>
			{#if $isSelected(id)}
				<div class="overflow-hidden" use:melt={$content(id)} transition:slide>
					<div class="mx-2.5 mb-7 mt-3 flex flex-col gap-3">
						<svelte:component this={component}></svelte:component>
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style lang="postcss">
	.content {
		box-shadow: inset 0px 1px 0px theme('colors.neutral.300');
	}
</style>
