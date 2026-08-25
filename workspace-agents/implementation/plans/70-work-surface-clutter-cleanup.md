# Plan 70 — Work-Surface Clutter Cleanup

## Goal and scope

Remove five approved sources of repeated or idle chrome in Project Menu, Table
View, Documents, Jobs, and Prompt Studio without changing persistence, IPC,
module manifests, or application behavior behind the affected controls.

Anchor: the approved findings in
`workspace-agents/implementation/user_feedback/2026-08-25-project-menu-clutter-audit.md`
and the clutter-pass direction in plan 68.

## Approach

1. Add one renderer-owned accessible overflow-menu component and reuse it for
   project rows, prompt rows, and Prompt Studio library actions. Preserve action
   availability and destructive confirmation behavior.
2. Make Table View a default-closed inspector module by generalizing the
   existing session-local Web inspector suppression. Move Sort Direction and
   Reset Filters into the Filters disclosure; keep the top Sort-by selector and
   sortable headers.
3. Default the Documents AI inspector section collapsed and auto-expand it only
   when an AI preview/proposal needs attention. Never auto-collapse a section
   the author opened.
4. Keep job progress/failure detail only in the Status Bar and leave the top
   briefcase as a neutral drawer entry point.
5. Validate keyboard behavior, desktop/narrow layout, and all five visual
   outcomes before committing.

## Files and areas

- Renderer shell: shared overflow menu, workspace switcher, application layout,
  and context strip.
- Modules: Table View main view, Documents inspector, and Prompt Studio nav.
- Evidence and carry-forward: this plan, screenshots, and the next numbered
  session handoff.

## Decisions and guardrails

- No database, IPC, preload, manifest, schema, dependency, or public contract
  changes.
- Workspace types remain stored and remain available during create/import.
- Table Reset Filters retains its existing semantics and does not reset sort.
- The Documents inspector stays available; only its AI section defaults closed.
- The Jobs drawer is unchanged.
- Journal, Assets, editor-toolbar, and broader AI-model cleanup remain out of
  scope.

## Validation

- Svelte autofixer on each touched `.svelte` component.
- `npm run typecheck`, `npm run build`, and `git diff --check`.
- Keyboard-only menu traversal, dismissal, focus return, protected-prompt
  restrictions, and destructive confirmation checks.
- Table default-close/open/selection/filter/sort checks; Documents idle and AI
  attention checks; Jobs single-status-source checks.
- After screenshots for Project Menu, Table View, Documents, Jobs, and Prompt
  Studio under `workspace-agents/implementation/screenshots/`, using the audit
  captures as before evidence. Verify desktop and narrow layouts.

## Outcome log

- 2026-08-25: Carlo approved all five audit recommendations and authorized the
  implementation details. Execution started from clean `main` at `0c0323e`.
- 2026-08-25: Implemented the renderer-only cleanup. Project and Prompt Studio
  row management now use one shared accessible overflow menu; project type
  values remain stored but are no longer rendered in the project list. Table
  View joins Web in the session-local default-closed inspector policy, and its
  direction/reset controls now live inside Filters. Documents defaults only the
  AI section closed and subscribes to busy, cancellable, preview, and pending
  proposal state to open it when attention is required. The toolbar Jobs button
  is now a neutral drawer entry point, leaving persistent progress/failure
  status to the Status Bar.
- 2026-08-25: Svelte autofixer reported no issues or suggestions for all seven
  touched components. `npm run typecheck`, `npm run build`, and
  `git diff --check` passed. Browser/Electron checks covered Arrow/Home/End and
  Escape navigation, focus return, outside-click dismissal, the keep-open
  project confirmation state, Prompt Studio's quiet library menu, Table's cold
  default-close/reopen/selection retention and sort-reset semantics, manual
  Documents AI expansion, active and failed Jobs status, and 820px overlay/menu
  geometry. Prompt protected-template exclusions and the preserved native
  deletion confirmation were verified in the rendered action construction.
- 2026-08-25: The idle Documents state was verified in Electron. A live AI
  provider transition was deliberately not invoked against manuscript content;
  the busy/preview/pending auto-open paths were instead verified at their direct
  store subscriptions plus the clean Svelte/type/build gates.
- 2026-08-25: Reused the audit folder as before evidence:
  `workspace-agents/implementation/screenshots/project-menu-clutter-audit-2026-08-25/`.
  Saved after evidence:
  - `work-surface-clutter-project-menu-after-2026-08-25.png`
  - `work-surface-clutter-table-after-2026-08-25.png`
  - `work-surface-clutter-documents-after-2026-08-25.png`
  - `work-surface-clutter-jobs-after-2026-08-25.png`
  - `work-surface-clutter-prompt-studio-after-2026-08-25.png`
- 2026-08-25: Bloat pass retained one new renderer component and its item/tone
  types because the project row, prompt row, and prompt library consumers share
  the same keyboard, focus, dismissal, and danger-state behavior. No other
  files, helpers, stores, contracts, or dependencies were added.
