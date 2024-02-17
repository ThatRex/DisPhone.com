<script lang="ts">
	import { createTabs, melt, createSync } from '@melt-ui/svelte'
	import { config } from '$lib/stores/state.persistent'
	import FieldText from '../fields/field-text.svelte'
	import SubGroup from '$lib/components/core/sub-group.svelte'
	import { IconPhone, IconBrandDiscord, IconAdjustmentsHorizontal } from '@tabler/icons-svelte'
	import ButtonTab from '../core/button-tab.svelte'
	import Filler from './filler.svelte'
	import FieldSwitch from '../fields/field-switch.svelte'

	const {
		elements: { root, list, content, trigger },
		states
	} = createTabs({
		loop: true,
		orientation: 'vertical',
		defaultValue: 'phone'
	})

	const sync = createSync(states)
	$: sync.value($config.tab_secondary_panel_config, (v) => {
		if ($config.tab_secondary_panel_config !== v) navigator.vibrate(6)
		$config.tab_secondary_panel_config = v
	})

	const triggers = [
		{ id: 'phone', title: 'Softphone', icon: IconPhone },
		{ id: 'bot', title: 'Discord Bot', icon: IconBrandDiscord },
		{ id: 'misc', title: 'Miscellaneous', icon: IconAdjustmentsHorizontal }
	]

	if (!$config.cfg_discord_profiles.length) {
		$config.cfg_discord_profiles.push({
			id: window.crypto.randomUUID(),
			usr_user_id: '',
			bot_status_mode: 'DYNAMIC',
			bot_token: '',
			bot_status_text: '',
			name: 'default'
		})
	}

	if (!$config.cfg_sip_profiles.length) {
		$config.cfg_sip_profiles.push({
			id: window.crypto.randomUUID(),
			register: true,
			sip_server: '',
			username: '',
			password: ''
		})
	}

	// const dispatch = createEventDispatcher()
	// dispatch('apply')
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
						value={$config.tab_secondary_panel_config === t.id}
					/>
				</div>
			{/each}
		</div>
	</Filler>
	<SubGroup>
		<div class="min-h-[154px] gap-x-2 gap-y-4 flex-wrap overflow-auto scrollbar-thin mx-1 mb-1.5">
			<div use:melt={$content('phone')}>
				<div class="flex flex-col gap-1">
					<h1 class="font-bold text-xl">Settings</h1>
					<FieldSwitch label="Simulate DTMF" bind:value={$config.cfg_simulate_dtmf} />
					<FieldSwitch label="Extend Dialpad" bind:value={$config.cfg_dialpad_extended} />
					<FieldSwitch label="Numeric Dialpad" bind:value={$config.cfg_dialpad_numeric} />
					{#if $config.cfg_show_hidden_settings}
						<FieldSwitch label="Auto Redial" bind:value={$config.cfg_auto_redial_enabled} />
					{/if}
					<h1 class="mt-1 font-bold text-xl">Profile</h1>
					<span>Refresh page to apply changes.</span>
					<form>
						<FieldText label="Server" bind:value={$config.cfg_sip_profiles[0].sip_server} />
						<FieldText label="User" bind:value={$config.cfg_sip_profiles[0].username} />
						<FieldText label="Login" bind:value={$config.cfg_sip_profiles[0].login} />
						<FieldText
							type="password"
							label="Password"
							bind:value={$config.cfg_sip_profiles[0].password}
						/>
					</form>
					<FieldSwitch label="Register" bind:value={$config.cfg_sip_profiles[0].register} />
				</div>
			</div>
			<div use:melt={$content('bot')}>
				<div class="flex flex-col gap-1">
					<h1 class="font-bold text-xl">Settings</h1>
					<FieldSwitch label="Follow Mode" bind:value={$config.cfg_discord_follow_mode} />
					<h1 class="mt-1 font-bold text-xl">Profile</h1>
					<span>Restart bot to apply changes.</span>
					<form>
						<FieldText
							label="Your User ID"
							bind:value={$config.cfg_discord_profiles[0].usr_user_id}
						/>
						<FieldText
							type="password"
							label="Dialler Account Token"
							bind:value={$config.cfg_discord_profiles[0].bot_token}
						/>
					</form>
				</div>
			</div>
			<div use:melt={$content('misc')}>
				<div class="flex flex-col gap-1">
					<h1 class="font-bold text-xl">Settings</h1>
					<FieldSwitch label="Debug" bind:value={$config.cfg_debug_enabled} />
				</div>
			</div>
		</div></SubGroup
	>
</div>
