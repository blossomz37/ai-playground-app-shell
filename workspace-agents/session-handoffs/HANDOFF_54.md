# Session Handoff 54 - Core and Custom Modules

_Session: 2026-06-06 - Slice: Required/Core/Custom module policy and settings_

## What Changed

- Implemented `workspace-agents/implementation/plans/39-core-and-custom-modules.md`.
- Added shared module policy:
  - Required: `shell.tableview`; always enabled and visible.
  - Core: `shell.documents`, `shell.journal`, `shell.assets`, `shell.web`; hideable from navigation, never disabled.
  - Custom: `shell.aichat`, `shell.promptstudio`, `shell.workflow`; fully disableable.
- Extended `modules:list` with `category`, `required`, `canDisable`, `canHide`, `visible`, `enabled`, and `activated`.
- Added `modules:setVisible` for Core visibility and preserved `modules:setEnabled` for Custom enablement.
- Settings now includes `Core & Custom Plugins` with search, Required/Core/Custom groups, Show toggles for Core, and Enable toggles for Custom.
- Activity rail, command listing, direct command execution, and browser preview now honor module state.
- Active module fallback is now Table View when the current module becomes hidden or disabled.
- Main/sidebar/inspector module views are lazy dynamic imports with simple loading/unavailable states.
- Renderer module state registration is factory-based and blocks disabled Custom state once the module policy snapshot is loaded.
- Replaced an existing command-palette `{@html}` search snippet with escaped text while touching that component.

## Evidence

- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Svelte autofixer clean for `ModulePluginSettings.svelte`, `ActivityRail.svelte`, `AppShell.svelte`, `MainPane.svelte`, `Sidebar.svelte`, `Inspector.svelte`, and `SettingsPanel.svelte`.
- `CommandPalette.svelte` has no autofixer issues after the escaped snippet fix; remaining autofixer output is advisory against the pre-existing effect-based search flow.
- Screenshots:
  - `workspace-agents/implementation/screenshots/core-custom-modules-settings-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/core-custom-modules-settings-search-custom-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/core-custom-modules-core-hidden-rail-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/core-custom-modules-custom-disabled-rail-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/core-custom-modules-command-palette-disabled-custom-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/core-custom-modules-browser-preview-state-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/core-custom-modules-reenabled-custom-render-after-2026-06-06.png`

## Known Notes

- Screenshot files remain ignored under `workspace-agents/implementation/screenshots/`.
- Capture-only module state overrides are transient in memory and do not write user module preferences.
- Browser preview was validated on the assigned App Shell port `5183`; the server bound to IPv6 localhost during validation, so Playwright used `http://localhost:5183/`.
- The re-enabled Prompt Studio capture rendered correctly but logged existing local database foreign-key warnings from AI template/context default seeding. Treat that as a future AI data-integrity cleanup if it reproduces outside Carlo's current local DB.

## Next Recommended Action

- Run a narrow follow-up only if desired: inspect and harden AI template default seeding against stale/archived workspace rows, because Prompt Studio can render while still logging foreign-key warnings in this local database.
