# Plan 67 - UI/UX Next Pass

## Summary

This pass resolves the UI/UX audit items intentionally left after Plan 66: shell chrome priority, responsive panel recovery, color/state hierarchy, Jobs/toast priority, Web density/default inspector behavior, Command Palette scanability, and Documents/sidebar IA. It stays inside the existing Svelte shell/module architecture and avoids token-system, theme, IPC, schema, or module-contract rewrites.

Public interface changes: none planned. If implementation appears to require changes to `ModuleContext`, `LayoutState`, IPC, SQLite schema, or design-token API, stop and update this plan before coding.

## Audit Disposition Matrix

| Source | Issue | Disposition |
|---|---|---|
| Plan 66 completed | Empty states/narrow copy, AI inspector disclosure, Prompt Studio nav density, Table filters, Settings wording, Run history summary | Keep as baseline; do not reopen except if screenshots show regression. |
| Plan 66 deferred | Shell chrome utility priority and persistent Jobs alert | Target Slice 1. |
| Plan 66 deferred | Narrow layout hides sidebar/inspector function | Target Slice 2 with overlay recovery, not new zones. |
| Plan 66 deferred | Web module busy composition and inspector default | Target Slice 3. |
| Plan 66 deferred | Command Palette density | Target Slice 4. |
| Plan 66 deferred | Documents archived folders and right-inspector/empty copy | Target Slice 5. |
| Newly targeted | Color as hierarchy/state, not decoration | Cross-slice rule: accents only for primary action/active state; warnings/errors rare; utility chrome neutral. |
| Still out of scope | Assets library empty affordance, Prompt Studio focused edit mode, AI feature changes, notification center | Defer unless Carlo explicitly widens scope. |

## Subagent Workflow

- Explorer subagent first: independently inspect `AppShell.svelte`, `ContextStrip.svelte`, `ActivityRail.svelte`, `StatusBar.svelte`, `ToastContainer.svelte`, `JobsPanel.svelte`, Web module, `CommandPalette.svelte`, Documents nav/inspector, Plan 66, and the audit. Output must flag scope risk, likely file overlap, and missing acceptance criteria before implementation begins.
- Design/QA subagents after screenshots: critique hierarchy, density, color/state clarity, and narrow usability against the audit. Lead accepts or rejects their findings.
- Worker subagents only for disjoint slices: good candidates are Web module, Command Palette, and Documents IA. Lead owns shell chrome/jobs and responsive layout because those share global shell files.
- Lead remains responsible for integration, rejecting weak output, Svelte autofixer, validation, screenshots, plan outcome updates, handoff update, commit, push, and clean tree.

## Implementation Slices

### Slice 1 - Shell Chrome, Color Priority, Jobs/Toast Priority

Goal: make module work surfaces visually primary while global utilities become quieter; job issues should be discoverable without dominating normal work.

Likely files: `ContextStrip.svelte`, `ActivityRail.svelte`, `StatusBar.svelte`, `ToastContainer.svelte`, `JobsPanel.svelte`, `store/jobs.ts`, optionally `styles/tokens.css` only for tiny alias cleanup if unavoidable.

Approach: quiet inactive rail/toolbar buttons with neutral contrast, remove or demote always-visible utility labels such as `Jobs`, keep active/alert states legible, reserve strong accent styling for module-primary actions, use warning/danger only for meaningful attention states, and change background job failures away from persistent full-strength error toasts toward compact badge/status/panel visibility.

Acceptance criteria: inactive utilities are visibly secondary; active module and module-primary actions read first; failed background jobs do not leave an indefinite blocking toast by default; active jobs remain visible in status/chrome; Jobs panel still exposes failure detail; no new notification center, toast action API, token rewrite, or new dependency.

Screenshot evidence: `uiux-pass2-shell-chrome-after-2026-06-26.png`, `uiux-pass2-jobs-alert-after-2026-06-26.png`, `uiux-pass2-toast-priority-after-2026-06-26.png`.

Validation: Svelte autofixer on touched Svelte files, `cd app-shell && npm run typecheck`, `cd app-shell && npm run build`, `git diff --check`.

Subagent role: lead-owned implementation; QA subagent reviews screenshots.

Out of scope: new notification center, global toast API redesign, new icon library, decorative palette changes.

### Slice 2 - Responsive Sidebar/Inspector Recovery

Goal: at narrow widths, users must be able to reach sidebar and inspector functions instead of losing them when columns collapse.

Likely files: `AppShell.svelte`, `ContextStrip.svelte`, `Sidebar.svelte`, `Inspector.svelte`.

Approach: reuse existing `Sidebar` and `Inspector` as narrow overlay drawers when `max-width: 900px`; keep the rail/main surface stable; make toolbar toggles open the relevant drawer; close drawer via backdrop/Escape/module switch; do not persist narrow overlay state into the desktop layout service.

Acceptance criteria: at `900x1000` and below, sidebar and inspector can both be opened; drawer content is scrollable and not clipped; desktop resize/persistence behavior is unchanged; no new shell zone, IPC, or layout schema field.

Screenshot evidence: `uiux-pass2-documents-narrow-main-after-2026-06-26.png`, `uiux-pass2-documents-narrow-sidebar-after-2026-06-26.png`, `uiux-pass2-documents-narrow-inspector-after-2026-06-26.png`.

Validation: Svelte autofixer, typecheck, build, `git diff --check`.

Subagent role: lead-owned; design QA must test narrow usability.

Out of scope: mobile-first redesign, draggable mobile panels, persisted per-breakpoint layout.

### Slice 3 - Web Module Density And Inspector Default

Goal: make Web feel like a compact browser workspace, with page content dominant and page metadata secondary.

Likely files: `modules/web/MainView.svelte`, `modules/web/NavView.svelte`, `modules/web/InspectorView.svelte`, `AppShell.svelte` only for session-local Web inspector default.

Approach: reduce tab/address/sidebar visual weight; remove excess webview padding if it makes the page feel framed; make Web inspector content more compact and disclosure-based; add a session-local Web default that starts the inspector closed for `shell.web` without changing persisted `LayoutState`, IPC, or global inspector preference. If the no-persist default becomes fragile, drop the `AppShell` change and keep density/disclosure only.

Acceptance criteria: Web page content is the dominant element; bookmarks/history remain usable; inspector can be opened from chrome and stays available; Web default does not override desktop persisted inspector state for other modules; no managed web-surface API.

Screenshot evidence: `uiux-pass2-web-default-after-2026-06-26.png`, `uiux-pass2-web-inspector-open-after-2026-06-26.png`, optional `uiux-pass2-web-narrow-after-2026-06-26.png`.

Validation: Svelte autofixer, typecheck, build, `git diff --check`.

Subagent role: worker candidate because Web files are isolated; lead handles any `AppShell.svelte` touch.

Out of scope: browser engine changes, new web sessions API, tab persistence changes, bookmark/history schema changes.

### Slice 4 - Command Palette Density And Scanability

Goal: make command/search results faster to scan without changing command execution.

Likely files: `CommandPalette.svelte`; optionally `store/commands.ts` only if a tiny derived grouping helper is needed.

Approach: reduce modal and row vertical weight; keep the input prominent but not oversized; display command title, module/source, and keybinding in a compact row; group or visually separate command vs document-search mode without adding new command metadata to the shared contract.

Acceptance criteria: more results fit above the fold; selected row remains obvious; keyboard behavior and search mode are unchanged; command IDs are not exposed as primary copy; no `CommandCatalogEntry` type change.

Screenshot evidence: `uiux-pass2-command-palette-after-2026-06-26.png`, optional document-search screenshot if search styling changes.

Validation: Svelte autofixer, typecheck, build, `git diff --check`.

Subagent role: worker candidate; QA reviews scanability.

Out of scope: fuzzy-search algorithm, command categories in manifest, shortcut editor.

### Slice 5 - Documents Sidebar IA And Inspector Empty Copy

Goal: make the Documents sidebar easier to scan and keep archived content from competing with active writing.

Likely files: `modules/documents/NavView.svelte`, `DocumentTreeRow.svelte`, `InspectorView.svelte`, optionally `MainView.svelte` only for empty/right-inspector wording coordination.

Approach: default archived section collapsed when archived documents exist; make archived header neutral and lower priority; keep restore available; demote AI context count/toggle color so active document hierarchy wins; add concise inspector empty copy for no selected document/right panel states if current copy is thin.

Acceptance criteria: active document tree reads before archived content; archived count is discoverable but not loud; context toggles/counts remain accessible; right inspector empty state explains useful next action; no document tree data model or archive behavior change.

Screenshot evidence: `uiux-pass2-documents-sidebar-after-2026-06-26.png`, `uiux-pass2-documents-archived-after-2026-06-26.png`, `uiux-pass2-documents-inspector-empty-after-2026-06-26.png`.

Validation: Svelte autofixer, typecheck, build, `git diff --check`.

Subagent role: worker candidate if Slice 2 is not active in the same files; otherwise lead-owned.

Out of scope: search redesign, drag/drop changes, archive/delete semantics, new document kinds.

## Bloat Guardrails

- Do not rewrite tokens, theme architecture, module contract, IPC, layout persistence schema, or database schema.
- Prefer existing components and local CSS; add a new component/helper only if it removes real duplication in this pass.
- No new dependencies, decorative palettes, permanent panels, or future-ready hooks.
- Keep color semantic: accent for primary/active, neutral for utility chrome, warning/danger for rare meaningful states.
- After each slice, list every new file/export/type/helper and remove anything not exercised by the slice.

## Test Plan

Run per slice from `app-shell/`: `npm run typecheck`, `npm run build`, plus repo root `git diff --check`.

Run Svelte autofixer on every touched `.svelte` file and repeat until clean.

Capture screenshots with `SHELL_CAPTURE`, using existing env controls such as `SHELL_CAPTURE_MODULE`, `SHELL_CAPTURE_VIEWPORT=900x1000`, `SHELL_CAPTURE_OPEN_JOBS=1`, `SHELL_CAPTURE_COMMAND_PALETTE_QUERY=document`, `SHELL_CAPTURE_WEB_URL`, `SHELL_CAPTURE_SHOW_SIDEBAR`, and `SHELL_CAPTURE_SHOW_INSPECTOR`. Add capture-hook code only if a required proof state cannot be reached with existing hooks.

## Closeout Checklist

- Explorer subagent review completed and plan scope adjusted if needed.
- Each slice validated with Svelte autofixer, typecheck, build, and `git diff --check`.
- Required screenshots saved under `workspace-agents/implementation/screenshots/`.
- Design/QA subagent reviewed screenshots for hierarchy, density, color/state clarity, and narrow usability.
- Plan 67 updated with outcome log, evidence paths, validation, deferrals, and commit hashes.
- New `workspace-agents/session-handoffs/HANDOFF_74.md` created with completed slices, evidence, validation, intentionally not built items, and next recommendations.
- Commit after the verified logical unit or per slice if implementation is split.
- Push to `ai-playground/main`.
- Confirm clean tree with `git status --short --branch`.

## Assumptions

- Plan number is `67` because `workspace-agents/implementation/plans/66-ui-ux-audit-resolution.md` was the highest numbered plan.
- The default date suffix for evidence is `2026-06-26`.
- The session-local Web inspector default is allowed only if it avoids `LayoutState`/IPC changes; otherwise it is deferred with evidence and Web density still ships.

## Outcome Log

Implemented on 2026-06-26 as a single integrated UI/UX pass.

### Completed Slices

1. Shell chrome, color priority, and Jobs/toast priority.
   - Files: `ContextStrip.svelte`, `ActivityRail.svelte`, `StatusBar.svelte`, `ToastContainer.svelte`, `JobsPanel.svelte`, `store/jobs.ts`.
   - Result: inactive utility chrome is quieter, active shell state remains legible, failed background jobs use warning-level attention instead of persistent full-strength error toasts, and the Jobs panel/status bar still expose failure detail.

2. Responsive sidebar/inspector recovery.
   - Files: `AppShell.svelte`, `app-shell/src/main/capture/evidence.ts`.
   - Result: narrow layouts can open the sidebar and inspector as transient overlay drawers with backdrop/Escape/module-switch close behavior. Drawer state is renderer-local and is not persisted into `LayoutState`.

3. Web module density and default inspector behavior.
   - Files: `modules/web/MainView.svelte`, `modules/web/NavView.svelte`, `modules/web/InspectorView.svelte`, `AppShell.svelte`.
   - Result: Web page content is visually dominant, the tab/address/nav surfaces are tighter, inspector detail is more disclosure-based, and `shell.web` starts with the right inspector visually suppressed once per session without IPC or layout schema changes.

4. Command Palette density and scanability.
   - File: `CommandPalette.svelte`.
   - Result: modal chrome and result rows are denser, module/source labels are easier to scan, selected rows remain obvious, and command execution/search behavior is unchanged.

5. Documents sidebar IA and inspector empty copy.
   - Files: `modules/documents/NavView.svelte`, `modules/documents/DocumentTreeRow.svelte`, `modules/documents/InspectorView.svelte`.
   - Result: archived content defaults lower in hierarchy, archived evidence can be captured expanded, AI context counts/toggles are visually demoted, and the empty inspector state gives clearer next-action copy.

### Evidence

- `workspace-agents/implementation/screenshots/uiux-pass2-shell-chrome-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-pass2-jobs-alert-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-pass2-toast-priority-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-pass2-documents-narrow-main-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-pass2-documents-narrow-sidebar-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-pass2-documents-narrow-inspector-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-pass2-web-default-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-pass2-web-inspector-open-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-pass2-command-palette-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-pass2-documents-sidebar-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-pass2-documents-inspector-empty-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-pass2-documents-archived-after-2026-06-26.png`

### Validation

- `svelte_autofixer` on every touched Svelte component. `CommandPalette.svelte` retained pre-existing advisory suggestions about its search `$effect`; no new Svelte issues were reported.
- `cd app-shell && npm run typecheck`
- `cd app-shell && npm run build`
- `git diff --check`
- Manual screenshot inspection by the lead agent.
- Explorer subagent reviewed implementation risk before coding.
- QA/design subagent reviewed final screenshots and diff for hierarchy, density, color/state clarity, narrow usability, and scope control. Two non-blocking findings were resolved before commit: warning toast contrast was strengthened and Command Palette module labels now use manifest names when available.

### Bloat Review

No new dependencies, schema fields, IPC channels, module-contract changes, design-token architecture, or persisted layout fields were added.

New behavior is limited to:

- Renderer-local narrow drawer state in `AppShell.svelte`.
- Renderer-local, one-session Web inspector visual suppression in `AppShell.svelte`.
- Capture-only environment hooks in `app-shell/src/main/capture/evidence.ts` for archived-section and narrow-sidebar screenshot evidence.

### Intentionally Not Built

- Notification center or toast action API redesign.
- Mobile-first shell redesign or persisted per-breakpoint layout.
- Web engine/session/bookmark/history behavior changes.
- Command manifest category/type changes, shortcut editor, or search algorithm changes.
- Documents archive/search/drag/drop/data-model changes.
- Token-system rewrite, new theme architecture, or decorative palette expansion.
