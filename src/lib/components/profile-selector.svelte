<script lang="ts">
	import PhoneClient from '$lib/client-phone'
	import { state } from '$lib/stores/state.svelte'
	import { config } from '$lib/stores/config.svelte'
	import { createSelect, melt, type SelectOption } from '@melt-ui/svelte'
	import {
		IconChevronDown,
		IconChevronUp,
		IconSquareDot,
		IconSquareDotFilled,
		IconSquarePlus2,
		IconSquareCheck,
		IconSquareCheckFilled,
		IconAlertSquareFilled
	} from '@tabler/icons-svelte'
	import { getContext } from 'svelte'
	import { fade, fly } from 'svelte/transition'

	const phone = getContext<PhoneClient>('phone')

	let color: keyof typeof color_classes = 'red'
	let profile_state = ''

	const color_classes = {
		red: 'bg-gradient-to-r from-red-500/60 to-rose-500/60',
		blue: 'bg-gradient-to-r from-blue-500/60 to-blue-500/60',
		green: 'bg-gradient-to-r from-green-500/60 to-emerald-500/60'
	} as const

	phone.on('profile-update', (pu) => {
		profile_state = pu.state
		switch (pu.state) {
			case 'CONNECTING':
			case 'RECONNECTING':
				color = 'blue'
				break
			case 'CONNECTED':
			case 'REGISTERED':
				color = 'green'
				break
			default:
				color = 'red'
				break
		}
	})

	const {
		elements: { trigger, menu, option },
		states: { open, selected },
		helpers: { isSelected }
	} = createSelect<string>({
		forceVisible: true,
		positioning: {
			placement: 'bottom',
			fitViewport: true,
			sameWidth: true
		}
	})

	open.subscribe(() => navigator.vibrate?.(6))

	// i chose this jank to keep the list keyboard navigable
	let last_selected_value: SelectOption<string> | undefined
	selected.subscribe((v) => {
		if (v?.value === '__add_new__') {
			selected.set(last_selected_value)
			open.set(false)
			$state.secondary_panel_tab = 'settings'
			$state.secondary_panel_enabled = true
		}
		last_selected_value = v
	})
</script>

<button
	use:melt={$trigger}
	aria-label="Profile Selector"
	class="
		py-[4px] px-[10px] {color_classes[color]}
		flex items-center justify-between gap-x-4 grow
		transition duration-75 active:scale-x-[99%] active:scale-y-[97%]
		rounded-md border-2 border-transparent
		hover:border-neutral-500/80 dark:hover:border-white/80
		"
>
	<div
		class="flex font-medium overflow-hidden whitespace-nowrap overflow-ellipsis w-0 grow justify-start"
	>
		{$config.sip_profiles[0].username}@{$config.sip_profiles[0].server_sip}
	</div>
	<div class="flex items-center gap-x-4 justify-end">
		<div class="max-sm:hidden font-semibold capitalize">{profile_state.toLowerCase()}</div>
		{#if $open}<IconChevronUp />
		{:else}<IconChevronDown />
		{/if}
	</div>
</button>

{#if $open}
	<div
		transition:fly={{ duration: 100, y: -5 }}
		use:melt={$menu}
		class="
			z-10 max-h-[300px] p-1 flex flex-col gap-1 focus:!ring-0 overflow-y-auto
			rounded-md border-2 border-neutral-500/40 dark:border-neutral-300/40
			backdrop-blur-xl bg-neutral-500/10 dark:bg-neutral-300/10
			max-sm:!left-0 max-sm:!right-0 max-sm:!w-auto max-sm:!mx-3
			"
	>
		{#each [] as item}
			<div use:melt={$option({ value: item, label: item })} class="item grow">
				<div class="w-[20px] flex items-center">
					{#if $isSelected(item)}<IconSquareCheckFilled size={18} />
					{:else}<IconSquareDot size={18} />
					{/if}
				</div>
				{item}
				<div class="max-md:hidden m-auto" />
				<div class="max-md:hidden">Registered</div>
			</div>
		{/each}
		<button use:melt={$option({ value: '__add_new__' })} class="item">
			<div class="w-[20px] flex items-center">
				<IconSquarePlus2 size={18} />
			</div>
			Edit Profile
		</button>
	</div>
{/if}

<style lang="postcss">
	.item {
		@apply flex items-center justify-start py-[4px] pl-[8px] pr-[10px] select-none overflow-hidden
			relative cursor-pointer rounded-[3px] focus:z-10 gap-2 transition duration-75 
			data-[highlighted]:bg-neutral-500/20 data-[selected]:bg-neutral-500/10
			data-[highlighted]:dark:bg-white/20 data-[selected]:dark:bg-white/10;
	}
</style>
