# Core & Custom Modules Settings Plan

## Summary

Add an Obsidian-style `Core & Custom Plugins` settings page for App Shell modules. Core modules can be hidden from user navigation surfaces but remain available internally. Custom modules can be fully disabled. Table View stays required and always available. This plan also makes command listings, browser preview, renderer imports, and module state initialization respect the new module model.

Definitions for implementation:
- **Required:** `shell.tableview`; always enabled, always visible, not user-toggleable.
- **Core:** `shell.documents`, `shell.journal`, `shell.assets`, `shell.web`; user can hide from rail/module listing surfaces, but they are never disabled.
- **Custom:** `shell.aichat`, `shell.promptstudio`, `shell.workflow`; user can disable fully.
- **Command filtering:** commands from disabled Custom modules are hidden; commands from Required and Core modules remain available even if the Core module is hidden.

## Slice 1 - Module Taxonomy and Registry Semantics

### Objective
Create a clear module policy layer for Required, Core, and Custom modules without changing the visible UI yet.

### Scope
- Add shared module metadata for `category`, `required`, `canDisable`, and `canHide`.
- Preserve existing persisted `modules.enabled` behavior for Custom modules.
- Add persisted Core visibility state, defaulting all Core modules visible.
- Keep Table View always enabled and visible.

### Out of Scope
- Settings UI.
- Renderer lazy loading.
- Browser preview behavior.

### Implementation Approach
- Add a shared module policy helper near the module contract or a small shared module metadata file.
- Extend `modules:list` result to include `category`, `required`, `canDisable`, `canHide`, `visible`, `enabled`, and `activated`.
- Update registry rules:
  - Required modules ignore disable attempts.
  - Core modules ignore disable attempts but accept visibility changes.
  - Custom modules accept enabled/disabled changes.
- Add a narrow IPC method such as `modules:setVisible(id, visible)` for Core visibility.
- Keep existing `modules:setEnabled(id, enabled)` for Custom modules.

### Dependencies
- None.

### Suggested Commit Checkpoint
- Commit message: `Add module visibility policy`

### Testing Plan
- `npm run typecheck`
- Unit or smoke check through IPC/list result where available.
- Verify Table View cannot be disabled.
- Verify Core modules remain enabled after hide/show operations.
- Verify Custom modules can still be disabled and re-enabled.

### Snapshot Evidence
- Not required unless a lightweight IPC/browser console proof is available.

### Acceptance Criteria
- Module list returns enough metadata for Settings to render Required/Core/Custom correctly.
- Required Table View is always enabled and visible.
- Core modules persist visibility separately from enabled state.
- Custom modules continue to persist enabled state.

### Risks and Rollback Notes
- Risk: old persisted `modules.enabled` might omit a now-Core module.
- Mitigation: migration/read logic should force Required/Core enabled regardless of stale persisted values.
- Rollback: restore old `enabled`-only list shape and ignore Core visibility keys.

## Slice 2 - Obsidian-Style Core & Custom Plugins Settings UI

### Objective
Add a Settings page/section that resembles Obsidian’s plugin toggles and manages module visibility/enabled state.

### Scope
- Add `Core & Custom Plugins` UI inside the existing Settings panel.
- Include search input.
- Show Core and Custom groups.
- Show Table View as a locked required module note or row.
- Core toggles control visibility.
- Custom toggles control full enablement.

### Out of Scope
- Marketplace/community plugins.
- Per-module detailed settings pages.
- Drag ordering changes.

### Implementation Approach
- Add a `ModulePluginSettings.svelte` settings component.
- Use existing Settings panel styling, but match Obsidian’s simple list pattern: search field, grouped rows, title, description, right-aligned toggle.
- Recommended copy:
  - Required/Table View: `Required. Always available.`
  - Core toggle label: `Show`
  - Custom toggle label: `Enable`
- On toggle:
  - Core calls `window.shell.modules.setVisible(id, visible)`.
  - Custom calls `window.shell.modules.setEnabled(id, enabled)`.
- Refresh module list after each toggle and emit/handle a renderer event or store update so the rail updates without reload.

### Dependencies
- Slice 1.

### Suggested Commit Checkpoint
- Commit message: `Add core and custom module settings`

### Testing Plan
- `npm run typecheck`
- Svelte autofixer for the new/touched Svelte files.
- Toggle each Core module hidden/visible and verify persistence after reload.
- Toggle each Custom module disabled/enabled and verify persistence after reload.
- Search filters module rows without changing state.

### Snapshot Evidence
- Settings panel with Core and Custom groups visible.
- Search-filtered settings view.
- Core module hidden state.
- Custom module disabled state.

### Acceptance Criteria
- UI clearly distinguishes Required, Core, and Custom behavior.
- Core modules can be hidden but not disabled.
- Custom modules can be disabled completely.
- Table View is visibly required and not toggleable.
- Settings state persists across app reload.

### Risks and Rollback Notes
- Risk: Settings panel grows crowded.
- Mitigation: keep this as one compact section with search and grouped rows.
- Rollback: remove the settings component while leaving registry policy intact.

## Slice 3 - Navigation, Commands, and Browser Preview Honor Module State

### Objective
Make visible app surfaces respect the new module policy consistently.

### Scope
- Activity rail hides Core modules when `visible=false`.
- Activity rail hides disabled Custom modules.
- Command palette excludes disabled Custom module commands.
- Browser preview persists and honors module enabled/visible state.
- If the active module becomes hidden/disabled, fall back to Table View.

### Out of Scope
- Lazy imports.
- State initialization gating.

### Implementation Approach
- Update `ActivityRail.svelte` to filter with `module.visible && module.enabled`.
- Add a small renderer store/helper for module list refresh so Settings and rail stay in sync.
- Update command listing in main registry to return commands only for enabled modules; Required/Core are always enabled by policy.
- Update command execution to no-op or throw a clear error for disabled Custom module commands.
- Update `browser-shell.ts` to store module state in localStorage and return the same `enabled/visible/category` shape as Electron.
- Ensure Table View remains the fallback selected module.

### Dependencies
- Slices 1-2.

### Suggested Commit Checkpoint
- Commit message: `Honor module visibility in navigation`

### Testing Plan
- `npm run typecheck`
- Hide each Core module and verify it leaves the rail.
- Disable each Custom module and verify it leaves the rail and its commands disappear.
- Re-enable/re-show modules and verify they return.
- Browser preview reload preserves module visibility/enabled state.
- Active disabled/hidden module falls back to Table View.

### Snapshot Evidence
- Rail before and after hiding a Core module.
- Rail before and after disabling a Custom module.
- Command palette without a disabled Custom module’s commands.
- Browser preview honoring the same state after reload.

### Acceptance Criteria
- Rail reflects module visibility/enabled state.
- Commands are filtered by enabled module.
- Browser preview matches Electron module state behavior.
- Table View remains reachable and selected as fallback.

### Risks and Rollback Notes
- Risk: hidden active module could leave a blank shell.
- Mitigation: force active module fallback to `shell.tableview`.
- Rollback: restore old rail filtering and old browser-shell module list behavior.

## Slice 4 - Lazy/Dynamic Renderer Module Views

### Objective
Stop loading every module view at renderer startup.

### Scope
- Convert Main, Sidebar, and Inspector module views to lazy/dynamic imports.
- Keep Table View immediately available or lazily loaded with a fast fallback.
- Add simple loading and unavailable states.

### Out of Scope
- Bundler chunk naming polish.
- Performance telemetry dashboard.
- Main-process module lazy registration.

### Implementation Approach
- Replace static imports in `MainPane.svelte`, `Sidebar.svelte`, and `Inspector.svelte` with module-id-to-loader maps.
- Use dynamic imports for each module view.
- Cache loaded components in memory after first load.
- If a disabled Custom module is requested directly, show a concise disabled state and fall back to Table View when possible.
- Keep the loading UI minimal and shell-native.

### Dependencies
- Slice 3.

### Suggested Commit Checkpoint
- Commit message: `Lazy load module views`

### Testing Plan
- `npm run typecheck`
- `npm run build`
- Svelte autofixer for touched Svelte files.
- Visit every module view and verify main/sidebar/inspector render.
- Disable a Custom module and verify its view is not loaded through normal navigation.
- Verify Table View still renders on cold load.

### Snapshot Evidence
- Table View cold-load view.
- One lazily loaded Core module.
- One lazily loaded Custom module.
- Disabled Custom module absent from normal navigation.

### Acceptance Criteria
- Main/Sidebar/Inspector no longer statically import all module views.
- Every enabled/visible module still renders correctly when selected.
- Disabled Custom modules are not reachable through normal UI.
- Build output succeeds with split renderer chunks.

### Risks and Rollback Notes
- Risk: Svelte dynamic component handling can regress view rendering.
- Mitigation: validate every module view and run Svelte autofixer.
- Rollback: restore static imports in the three pane components.

## Slice 5 - Gate Module State Initialization

### Objective
Avoid constructing state slices for disabled Custom modules until they are needed.

### Scope
- Replace eager module state construction with lazy factories.
- Always allow Required/Core state if requested.
- Block disabled Custom module state from initializing through normal paths.
- Keep existing state APIs stable for module views.

### Out of Scope
- Rewriting individual state slice internals.
- Moving persistence schemas.
- Full performance instrumentation.

### Implementation Approach
- Refactor `module-state-registry.ts` from eager `registerModuleState(... new Slice())` to factory registration.
- Instantiate a state slice only on first `getModuleState(moduleId, key)`.
- Add a guard that checks current module policy before initializing Custom module state.
- Keep Table View state registered as required.
- Ensure Settings can still list modules without initializing module state.

### Dependencies
- Slices 1-4.

### Suggested Commit Checkpoint
- Commit message: `Lazy initialize module state`

### Testing Plan
- `npm run typecheck`
- `npm run build`
- Disable AI Chat, Prompt Studio, and Workflow Runner; verify normal app boot and navigation do not initialize their state.
- Re-enable each Custom module; verify its state initializes on first selection and existing data remains.
- Verify Core hidden modules do not initialize from normal rail navigation, but still work after being shown.

### Snapshot Evidence
- Settings with Custom modules disabled.
- Rail without disabled Custom modules.
- Re-enabled Custom module rendering successfully.

### Acceptance Criteria
- Disabled Custom modules do less renderer work at startup.
- Re-enabling a Custom module restores normal behavior.
- Core/Required module behavior remains stable.
- No data is deleted or migrated.

### Risks and Rollback Notes
- Risk: shared stores may assume state exists at import time.
- Mitigation: update callers to request state only inside module-specific paths or after module selection.
- Rollback: restore eager state registration while keeping UI/module policy changes.

## Slice 6 - Documentation, Evidence, and Handoff

### Objective
Document the new module policy and leave the implementation easy to continue.

### Scope
- Update durable orientation docs after behavior is verified.
- Add or update an implementation plan/status artifact.
- Add a numbered handoff.
- Record screenshots and validation commands.

### Out of Scope
- Creating user-facing help docs beyond a concise behavior note.
- Creating a plugin marketplace roadmap.

### Implementation Approach
- Update `CLAUDE.md` or `.agent/knowledge/WORKSPACE_ORIENTATION.md` only after final validation.
- Add a handoff summarizing Required/Core/Custom policy, commits, evidence, and known limitations.
- Mention that disabled Custom modules improve renderer startup only after lazy imports/state gating land.

### Dependencies
- Slices 1-5.

### Suggested Commit Checkpoint
- Commit message: `Document module plugin settings`

### Testing Plan
- Verify docs match implemented behavior.
- Run final validation checklist.

### Snapshot Evidence
- Final Settings UI.
- Final rail after Core hidden and Custom disabled.
- Final command palette after Custom disabled.
- Browser preview after reload honoring module state.

### Acceptance Criteria
- Docs describe Required/Core/Custom semantics accurately.
- Handoff lists all commits, evidence, and residual risks.
- Final git status is clean after commits.

### Risks and Rollback Notes
- Risk: docs drift if implementation changes late.
- Mitigation: write final docs only after behavior is verified.
- Rollback: revert docs/handoff if implementation is rolled back.

## Recommended Slice Order

1. Module taxonomy and registry semantics.
2. Obsidian-style Core & Custom Plugins Settings UI.
3. Navigation, commands, and browser preview honor module state.
4. Lazy/dynamic renderer module views.
5. Gate module state initialization.
6. Documentation, evidence, and handoff.

## Final Validation Checklist

- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Svelte autofixer clean for touched Svelte files.
- Electron cold boot with default module state.
- Browser preview cold boot at `http://localhost:5183/`.
- Settings shows Required/Core/Custom behavior.
- Core hide/show persists across reload.
- Custom disable/enable persists across reload.
- Disabled Custom module commands disappear.
- Required Table View remains visible and selectable.
- Hidden/disabled active module falls back to Table View.
- Lazy-loaded views render for every visible/enabled module.
- Disabled Custom state is not initialized through normal boot/navigation.
- Final `git status --short --branch` is clean.

## Required Evidence

- Screenshot: Settings page with Core and Custom groups.
- Screenshot: Core module hidden from rail.
- Screenshot: Custom module disabled from rail.
- Screenshot: Command palette without disabled Custom module commands.
- Screenshot: Browser preview after reload honoring module state.
- Screenshot: Re-enabled Custom module rendering normally.
- Optional build artifact note showing renderer chunks after dynamic imports.

## Documentation Updates

- Update `CLAUDE.md` or `.agent/knowledge/WORKSPACE_ORIENTATION.md` after validation.
- Add or update an implementation plan/status document under `workspace-agents/implementation/plans/`.
- Add a new numbered `workspace-agents/session-handoffs/HANDOFF_NN.md`.
- Mention that Table View is required, Core modules are hideable but not disabled, and Custom modules are disableable.

## Open Questions and Assumptions

- Assumption: Core hidden state affects rail/module navigation surfaces only; Core commands remain available because Core modules are not disabled.
- Assumption: Table View is not shown as a toggleable item; it is shown as required or explained in the settings UI.
- Assumption: one Core toggle controls both “shown in rail” and any other module-list visibility for v1; no separate per-surface toggles.
- Assumption: existing persisted `modules.enabled` values should not be allowed to disable Required/Core modules after this change.
- Assumption: no user data is deleted when a Custom module is disabled.

## Implementation Result - 2026-06-06

Status: implemented.

What landed:
- Shared Required/Core/Custom policy in `app-shell/src/shared/module-policy.ts`.
- `modules:list` now returns category, required, canDisable, canHide, visible, enabled, and activated.
- `modules:setVisible` persists Core visibility separately from Custom enablement.
- Table View is the required fallback and cannot be disabled or hidden.
- Settings now includes Core & Custom Plugins with search, Required/Core/Custom grouping, Core Show toggles, and Custom Enable toggles.
- Activity rail, commands, direct command execution, and browser preview honor module enabled/visible state.
- Main/sidebar/inspector module views load through dynamic import maps and cache after first load.
- Renderer module state registration is factory-based; Custom module state is blocked when the latest module policy snapshot says the module is disabled.

Validation:
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Svelte autofixer clean for new/touched module-settings, rail, shell, and pane components; `CommandPalette.svelte` has no autofixer issues after replacing an existing `{@html}` snippet with escaped text, though the autofixer still reports advisory suggestions against its pre-existing effect-based search flow.
- Electron captures:
  - `workspace-agents/implementation/screenshots/core-custom-modules-settings-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/core-custom-modules-settings-search-custom-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/core-custom-modules-core-hidden-rail-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/core-custom-modules-custom-disabled-rail-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/core-custom-modules-command-palette-disabled-custom-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/core-custom-modules-reenabled-custom-render-after-2026-06-06.png`
- Browser preview capture:
  - `workspace-agents/implementation/screenshots/core-custom-modules-browser-preview-state-after-2026-06-06.png`

Known notes:
- Screenshot capture module enabled/visible overrides are transient in-memory overrides and do not persist to user settings.
- The Prompt Studio render capture logged existing local database foreign-key warnings while still rendering the module UI; this appears tied to the current local database state, not module policy or lazy loading.
