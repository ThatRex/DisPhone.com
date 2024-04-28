<script lang="ts">
	import { createTabs, melt, createSync } from '@melt-ui/svelte'
	import { config } from '$lib/stores/config.persistent'
	import FieldText from '../fields/field-text.svelte'
	import Group from '$lib/components/core/group.svelte'
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
	$: sync.value($config.secondary_panel_tab_config, (v) => {
		if ($config.secondary_panel_tab_config !== v) navigator.vibrate?.(6)
		$config.secondary_panel_tab_config = v
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
			password: '',
			simultaneous_call_limit: 0
		})
	}
</script>

<div use:melt={$root} class="flex gap-2 grow h-full">
	<Filler>
		<div use:melt={$list} class="flex flex-col gap-2">
			{#each triggers as t}
				<div use:melt={$trigger(t.id)} class="!outline-none">
					<ButtonTab
						tip={t.title}
						tip_placement="right"
						icon={t.icon}
						value={$config.secondary_panel_tab_config === t.id}
					/>
				</div>
			{/each}
		</div>
	</Filler>
	<Group>
		<div class="min-h-[154px] overflow-auto scrollbar-thin mx-1 mb-1.5">
			<div style="height: 100%;" use:melt={$content('phone')}>
				<div class="flex flex-col gap-1">
					<h1 class="font-bold text-xl">Settings</h1>
					{#if $config.hidden_settings_enabled}
						<FieldSwitch label="Auto Redial Feature" bind:value={$config.auto_redial_enabled} />
					{/if}
					<FieldSwitch label="Debug" bind:value={$config.sip_debug_enabled} />
					<h1 class="mt-1 font-bold text-xl">Profiles</h1>
					<span>Refresh page to apply changes.</span>
					<form class="flex flex-col gap-y-1">
						<FieldSwitch label="Expert Settings" bind:value={$config.sip_expert_settings_enabled} />
						{#if $config.sip_expert_settings_enabled}
							<FieldSwitch label="Register" bind:value={$config.cfg_sip_profiles[0].register} />
						{/if}
						<FieldText
							label="Server"
							description="PBX server address."
							examples={['157.55.39.60', 'yourpbx.tel']}
							required={true}
							bind:value={$config.cfg_sip_profiles[0].sip_server}
						/>
						<FieldText
							label="User"
							required={true}
							bind:value={$config.cfg_sip_profiles[0].username}
						/>
						{#if $config.sip_expert_settings_enabled}
							<FieldText label="Login" bind:value={$config.cfg_sip_profiles[0].login} />
						{/if}
						<FieldText
							label="Password"
							type="password"
							bind:value={$config.cfg_sip_profiles[0].password}
						/>
						{#if $config.sip_expert_settings_enabled}
							<FieldText
								label="Voicemail Number"
								bind:value={$config.cfg_sip_profiles[0].voicemail_number}
							/>
						{/if}
					</form>
				</div>
			</div>
			<div style="height: 100%;" use:melt={$content('bot')}>
				<div class="flex flex-col gap-1">
					<h1 class="font-bold text-xl">Settings</h1>
					<FieldSwitch label="Auto Start" bind:value={$config.bot_discord_autostart} />
					<FieldSwitch label="Follow Mode" bind:value={$config.bot_discord_follow_mode_enabled} />
					<FieldSwitch label="Debug" bind:value={$config.bot_discord_debug_enabled} />
					<h1 class="mt-1 font-bold text-xl">Profiles</h1>
					<span>Restart bot to apply changes.</span>
					<form class="flex flex-col gap-y-1">
						<FieldText
							label="Your User ID"
							required={true}
							bind:value={$config.cfg_discord_profiles[0].usr_user_id}
						/>
						<FieldText
							type="password"
							label="Dialler Account Token"
							required={true}
							bind:value={$config.cfg_discord_profiles[0].bot_token}
						/>
					</form>
				</div>
			</div>
			<div style="height: 100%;" use:melt={$content('misc')}>
				<div class="@container">
					<div class="grid columns gap-x-2 gap-y-3">
						<div class="flex flex-col gap-1 grow">
							<h1 class="font-bold text-xl">Interface</h1>
							<FieldSwitch label="Window Mode" bind:value={$config.window_mode_enabled} />
						</div>
						<div class="flex flex-col gap-1 grow">
							<h1 class="font-bold text-xl">Accessibility</h1>
							<FieldSwitch label="Mute On Deafen" bind:value={$config.mute_on_deafen} />
							<FieldSwitch label="Simulate DTMF Tones" bind:value={$config.simulate_dtmf} />
							<FieldSwitch label="Disable Haptics" bind:value={$config.haptics_disabled} />
						</div>
						<div class="flex flex-col gap-1 grow">
							<h1 class="font-bold text-xl">Dialpad</h1>
							<FieldSwitch label="Enabled" bind:value={$config.dialpad_enabled} />
							<FieldSwitch label="Extended" bind:value={$config.dialpad_extended} />
							<FieldSwitch label="Numeric" bind:value={$config.dialpad_numeric} />
							<FieldSwitch label="Focus Dial Field" bind:value={$config.dialpad_focus_dial_field} />
						</div>
						<div class="flex flex-col gap-1 grow">
							<h1 class="font-bold text-xl">Conference</h1>
							<FieldSwitch label="Play Sounds" bind:value={$config.conference_play_sounds} />
						</div>
					</div>
				</div>
			</div>
		</div>
	</Group>
</div>

<style lang="postcss">
	@container (min-width: calc(24ch * 2)) {
		.columns {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@container (min-width: calc(24ch * 4)) {
		.columns {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>
