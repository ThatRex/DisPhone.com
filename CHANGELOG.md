# 0.10.0 [XX-05-2024]

_multi sip account support, early media and more_

## Changes

- added: TODO: multi sip account support
- added: TODO: auto redial config
- added: call item transition and animation
- added: ability to copy paste settings
- added: early media support
- added: hold unselected calls option
- added: auto answer delay option
- added: disconnected call visibility option
- added: close confirmation option
- added: after dial selection option
- added: invisible (bot) option
- added: websocket server field
- added: per call level indicator
- fixed: holding enter spams redial
- fixed: delay when using STUN server
- fixed: using sip server with custom port results in an invalid websocket url
- fixed: toggling mute or deafen after bot has left channel results in bot re-joining
- changed: calls always disappear immediately when disconnected by user 
- changed: disabled pull down to refresh on mobile
- changed: refined secondary panel settings
- other minor changes

# 0.9.8 [13-05-2024]

_the updated mobile experience is here_

## Changes

- added: bot text status field
- fixed: discord dialing now works on chrome mobile
- changed: new lines replaced with ampersand when dropping text
- changed: improved haptics
- changed: revamped secondary panel
- removed: non window mode
- other minor changes

# 0.9.7 [30-04-2024]

## Changes

- fixed: page not loading for users with no previous config
- changed: improved call keyboard navigation
- changed: improved accessibility
- other minor changes

# 0.9.6 [29-04-2024]

## Changes

- fixed: voicemail button not working properly
- fixed: green call button tooltip displaying "Call" when in answer mode
- fixed: bot not speaking when joining deafned
- changed: call destination only displays user rather than user and domain for incoming calls
- other minor changes

# 0.9.5 [28-04-2024]

An update! Finally...

## Changes

- added: mute on deafen setting
- added: uppercase letter to number conversion
- added: voicemail number setting
- added: dynamic bot status like the original version had
- fixed: auto redial not automatically stopping if call is not established
- fixed: bot disconnecting when updating deaf/mute (#41)
- fixed: glitchy dialpad colors
- fixed: firefox setting the document location to dropped text
- fixed: level switcher tooltip showing on click/tap
- changed: sounds now load once during initiation rather than at the time of playing
- changed: outbound ring will only play when no calls are connected
- changed: bot only speaks when on call or playing sound
- changed: setting DND now silences inbound ringing
- changed: dialpad now positioned to right
- changed: improved window mode
- changed: improved call display
- changed: dropping text in the dial field replaces rather than appends
- changed: ring-in sound
- other minor changes

# 0.9.4 [24-02-2024]

## Changes

- added: level switcher for super small displays
- added: window mode
- fixed: bot debug switch sets phone debug
- changed: when bot in channel levels switch position and toggles turn blue
- other minor changes

# 0.9.3 [23-02-2024]

## Changes

- added: copy destination call button
- added: `Dialpad Focus Dial Field` setting
- fixed: dialpad letter R missing
- changed: calls scale for small displays and windows
- changed: moved some settings to accessibility
- changed: separated bot and phone debug settings
- changed: answered inbound call destination set as redial value
- other minor changes

# 0.9.2 [20-02-2024]

## Changes

- fixed: clicking on switch thumb doesn't switch switch
- fixed: extended dialpad characters not flashing
- fixed: now works in safari 15.4 and above
- changed: disabled a b c d DTMF sounds as typical softphones do not play them
- changed: removed outer border
- other minor changes

# 0.9.1 [20-02-2024]

## Changes

- added: middle click on hangup button to hangup all
- added: middle click on call button to redial
- added: middle click on call to select an additional call
- fixed: Bot Changes To Waiting Mode When In Channel (#40)
- fixed: Unable To Dial Anything With # (#42)
- changed: switch UI/UX
- other minor changes

# 0.9.0 [17-02-2024]

The first version of the complete overhaul of the UI & phone. The version name is also arbitrary. Going forward version numbers will work as follows:

- 0.0.X - Minor features, changes &or bug fixes.
- 0.X.0 - Substantial new features.
- X.0.0 - New major version.

# 0.5.0 [27-12-2023]

The last version of the ugly discord dialler Proof of Concept phase. The version name is arbitrary.
