# Session Handoff 26 - All Modules Visible In Rail

_Session: 2026-06-05 · Slice: Remove More overflow menu from Activity Rail_

## What Changed

- Removed the More modules rail button and its hidden flyout menu.
- Moved all enabled modules directly into the Activity Rail.
- Preserved the current rail order: Table View, Documents, Journal, AI Chat, Assets, Workflow Runner, Web, Prompt Studio.
- Kept the project book button and its project menu behavior unchanged.
- Left module manifests, activation, IPC, persistence, and shell contracts unchanged.

## Evidence

Validation passed from `app-shell/`:

```bash
npm run audit:contrast
npm run typecheck
npm run build
```

Contrast summary:

```text
Contrast audit passed: all measured token pairs meet targets.
```

Svelte autofixer passed clean on:

- `app-shell/src/renderer/src/shell/ActivityRail.svelte`

Screenshot evidence:

- `implementation/screenshots/rail-all-modules-visible-after-2026-06-05.png`

Visual check:

- More icon is gone.
- Workflow Runner, Web, and Prompt Studio are visible as direct rail icons.

## Carry Forward

- Existing untracked `implementation/plans/25-shell-utility-and-accessibility-cleanup.md` was not touched.
