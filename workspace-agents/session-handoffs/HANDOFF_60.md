# Session Handoff 60 - Table Header Sort Toggles

_Session: 2026-06-07 - Slice: Plan 49 Table View header sort controls_

## What Changed

- Completed `workspace-agents/implementation/plans/49-table-header-sort-toggles.md`.
- Extended Table View state with persisted `sortDirection` and new sort keys for `wordCount` and `targetWordCount`.
- Added header sort buttons for Title, Kind, Updated, Words, and Target with active indicators and `aria-sort`.
- Kept the toolbar Sort control synchronized and added a direction selector so Created sorting remains reversible from the toolbar.
- Added capture support for `SHELL_CAPTURE_TABLE_SORT` and `SHELL_CAPTURE_TABLE_SORT_DIRECTION`.

## Evidence

- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshots:
  - `workspace-agents/implementation/screenshots/table-sort-title-asc-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/table-sort-updated-desc-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/table-sort-words-desc-after-2026-06-07.png`

## Not Built

- No column resizing, drag reordering, saved sort presets, multi-column sort, or database-backed sort.
- No SQLite schema, IPC contract, document API, or module contract change.
- No additional Table View filtering behavior.

## Notes for Next Agent

- Sorting remains in `app-shell/src/shared/state/tableview-state.ts`; Svelte only renders controls and indicators.
- `sortBy` persistence remains backward compatible. Old snapshots without `sortDirection` hydrate to the default direction for the saved sort key.
- Target word counts intentionally keep missing values last in both directions.
- `svelte-autofixer` was not available in this session after tool discovery; the Svelte component was validated through the production build.
