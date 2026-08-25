# Session Handoff 76 - Work-Surface Clutter Cleanup

_Session: 2026-08-25 - Plan 70 renderer cleanup, implementation and evidence complete_

## What Changed

Implemented the five approved clutter reductions as one renderer-only slice:

- Project Menu: removed project-type labels and replaced repeated management
  buttons with accessible overflow menus while preserving the two-step app-only
  deletion safeguard.
- Table View: defaults Row Detail closed per session, reopens without losing the
  selected row, and moves direction/reset into Filters.
- Documents: defaults only the AI inspector section closed and opens it for AI
  work requiring attention without an automatic re-collapse.
- Jobs: leaves the toolbar briefcase neutral and keeps persistent job state in
  the Status Bar; the drawer itself is unchanged.
- Prompt Studio: moves row management and Import/Export into shared overflow
  menus while preserving protected templates and destructive confirmation.

The only new abstraction is
`app-shell/src/renderer/src/shell/OverflowMenu.svelte`; it is shared by project
rows, prompt rows, and Prompt Studio library actions.

## Validation

- Svelte autofixer: clean for every touched component.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- Live browser/Electron checks: keyboard traversal, focus return,
  outside-click/Escape close, two-step project delete state, Table default
  close/reopen/selection retention, direction plus reset semantics, 820px
  overlay geometry, idle/manual Documents AI disclosure, neutral Jobs entry,
  and active/failed Status Bar states.
- The active/failed Jobs checks used exact synthetic records; both records were
  removed after capture. The manual Documents check used the browser's
  ephemeral Local Preview document and left no saved document behind.
- Provider-backed Documents AI activity was not invoked against manuscript
  content. Busy, cancellable, preview, and pending-proposal auto-open behavior
  is wired through direct store subscriptions and passed Svelte/type/build
  validation.

## Evidence

Before evidence remains in
`workspace-agents/implementation/screenshots/project-menu-clutter-audit-2026-08-25/`.

After evidence:

- `workspace-agents/implementation/screenshots/work-surface-clutter-project-menu-after-2026-08-25.png`
- `workspace-agents/implementation/screenshots/work-surface-clutter-table-after-2026-08-25.png`
- `workspace-agents/implementation/screenshots/work-surface-clutter-documents-after-2026-08-25.png`
- `workspace-agents/implementation/screenshots/work-surface-clutter-jobs-after-2026-08-25.png`
- `workspace-agents/implementation/screenshots/work-surface-clutter-prompt-studio-after-2026-08-25.png`

## Scope Boundaries

No database, IPC, preload, module-manifest, persistence, schema, dependency, or
public contract changed. Journal, Assets, editor-toolbar, and AI-model roadmap
work from plan 68 remains intentionally untouched.

Plan of record:
`workspace-agents/implementation/plans/70-work-surface-clutter-cleanup.md`.
Target commit: `Fix work-surface UI clutter` on `main`.
