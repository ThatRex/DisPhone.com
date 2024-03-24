<script lang="ts">
	import PhoneClient from '$lib/phone-client'
	import { config } from '$lib/stores/state.persistent'
	import { createSelect, createRadioGroup, melt } from '@melt-ui/svelte'
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
	import { createEventDispatcher, getContext } from 'svelte'
	import { fade } from 'svelte/transition'

	let options: string[] = []
	let value: (typeof options)[number] = options[0]
	const phone = getContext<PhoneClient>('phone')

	let color: keyof typeof color_classes = 'red'
	let text = ''

	const color_classes = {
		red: 'bg-gradient-to-r from-red-500/60 to-rose-500/60',
		blue: 'bg-gradient-to-r from-blue-500/60 to-blue-500/60',
		green: 'bg-gradient-to-r from-green-500/60 to-emerald-500/60'
	} as const

	phone.on('profile-update', (pu) => {
		text = pu.state
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

	let last_selected_value: any // i give up...
	selected.subscribe((v) => {
		if (v?.value === '__add_new__') {
			selected.set(last_selected_value)
			open.set(false)
			$config.secondary_panel_tab_root = 'config'
			$config.secondary_panel_tab_config = 'phone'
			$config.secondary_panel_enabled = true
		}
		last_selected_value = v
	})
</script>

<button
	use:melt={$trigger}
	aria-label="Profile Selector"
	class="
		transition duration-75 active:scale-x-[99%] active:scale-y-[97%] h-[36px]
		border-2 border-transparent hover:border-neutral-500/80 dark:hover:border-white/80
		flex items-center justify-center gap-x-4 grow flex-wrap
		rounded-md py-[4px] px-[10px] {color_classes[color]}
		"
>
	<div class="font-medium capitalize">
		{text.toLowerCase()}
		<!-- {$selected ? $selected.label : 'Select a profile'} -->
	</div>
	<div class="max-md:hidden m-auto" />
	<!-- <div class="max-md:hidden">Registered</div> -->
	{#if $open}<IconChevronUp />
	{:else}<IconChevronDown />
	{/if}
</button>

{#if $open}
	<div
		transition:fade={{ delay: 0, duration: 25 }}
		use:melt={$menu}
		class="
			z-10 flex max-h-[300px] flex-col focus:!ring-0 overflow-y-auto
			rounded-md p-1 gap-1 border-2 backdrop-blur-xl
			border-neutral-500/40 bg-neutral-500/10
			dark:border-neutral-300/40 dark:bg-neutral-300/10
			"
	>
		{#each options as item}
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
			<!-- Add New -->
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
