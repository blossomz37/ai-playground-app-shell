# Session Handoff 24 - Rail Icon Order Cleanup

_Session: 2026-06-05 · Slice: Narrow Activity Rail ordering and project icon pass_

## What Changed

- Replaced the project switcher `M` initial plus caret with a single book icon.
- Promoted Table View out of the More menu and placed it directly after the project/book button.
- Reordered visible rail modules so Journal appears directly after Documents.
- Left the project switcher menu behavior, module manifests, IPC, persistence, and Settings behavior unchanged.

## Evidence

Validation passed from `app-shell/`:

```bash
npm run audit:contrast
npm run typecheck
npm run build
```

Svelte autofixer passed clean on:

- `app-shell/src/renderer/src/shell/WorkspaceSwitcher.svelte`
- `app-shell/src/renderer/src/shell/ActivityRail.svelte`

Screenshot evidence:

- `implementation/screenshots/rail-order-book-table-journal-after-2026-06-05.png`

Visual check:

- Rail order is project/book, Table View, Documents, Journal, AI Chat, Assets, More.

## Carry Forward

- Existing untracked `implementation/plans/25-shell-utility-and-accessibility-cleanup.md` was not touched.
- Screenshot capture initially found a stale dev server on port 5183; that app-shell dev server was stopped and capture then succeeded.
