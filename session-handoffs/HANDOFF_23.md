# Session Handoff 23 - Shell Utility Settings Cleanup

_Session: 2026-06-05 · Slice: Narrow utility action consolidation after UX duplication cleanup_

## What Changed

- Removed the duplicate bottom-left Settings gear from the Activity Rail.
- Kept the top-right context-strip Settings gear as the single visible Settings entry point.
- Removed `rail-settings` from Activity Rail roving focus state and fallback focus selection.
- Left `shell.settings`, `Cmd+,`, command-palette access, SettingsPanel behavior, IPC, persistence, and module contracts unchanged.

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

- `implementation/screenshots/shell-utility-cleanup-documents-after-2026-06-05.png`
- `implementation/screenshots/shell-utility-cleanup-web-after-2026-06-05.png`

Visual checks:

- Documents shows only the top-right Settings gear; the bottom rail utility gear is gone.
- Web advanced-module state still renders with the More rail control active.

## Carry Forward

- Existing top-right toolbar density was intentionally left alone.
- The screenshot captures used the persisted light theme; contrast coverage still passed for both light and dark themes.
- `implementation/plans/25-shell-utility-and-accessibility-cleanup.md` was present as an untracked approved-plan artifact and was not modified by this slice.
