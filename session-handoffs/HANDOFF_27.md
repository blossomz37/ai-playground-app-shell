# Session Handoff 27 - Draggable Rail Modules

_Session: 2026-06-05 · Slice: Drag-and-drop Activity Rail module ordering_

## What Changed

- Made Activity Rail module icons draggable.
- Added before/after drop indicators while hovering over a target icon.
- Persisted custom module order with the shell setting key `activityRail.order`.
- Normalized saved order against the known default module list so missing/new modules fall back safely.
- Kept the project/book button fixed at the top because it opens the project menu rather than a module view.
- Left module manifests, activation, IPC, persistence schema, and workspace behavior unchanged.

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

- `implementation/screenshots/rail-drag-reorder-after-2026-06-05.png`

## Carry Forward

- The screenshot confirms the rail still renders correctly; drag/drop itself was validated through the component implementation and compile/build checks rather than browser automation.
- Existing untracked `implementation/plans/25-shell-utility-and-accessibility-cleanup.md` was not touched.
