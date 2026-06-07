# Table Header Sort Toggles

## Summary

Make Table View column headers sort controls while reusing the existing Table View state slice. Headers become the primary interaction, and the existing Sort toolbar control remains synchronized.

## Key Changes

- Extend Table View state with `sortDirection: "asc" | "desc"` plus visible numeric sort keys for `wordCount` and `targetWordCount`.
- Keep existing persisted `sortBy` snapshots compatible by defaulting missing directions from the selected column:
  - `title`, `kind`, `wordCount`, and `targetWordCount` default ascending.
  - `updatedAt` and `createdAt` default descending.
- Add a header-toggle state method:
  - New header selection uses that column's default direction.
  - Clicking the active header toggles direction.
  - Reset filters keeps the current sort key and direction.
- Update Table View headers with accessible sort buttons, active visual state, `aria-sort`, and compact direction indicators.
- Keep the Sort toolbar control, add a synchronized direction control, and leave Created sorting available from the toolbar.
- Extend screenshot capture with sort key and direction inputs.

## Public Interfaces / Types

- Update shared Table View state types only:
  - `TableSortBy = "title" | "updatedAt" | "createdAt" | "kind" | "wordCount" | "targetWordCount"`.
  - Add `TableSortDirection = "asc" | "desc"`.
  - Add optional persisted `sortDirection`.
- No SQLite schema, IPC contract, document API, or module contract change.

## Test Plan

- Run from `app-shell/`:
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`
  - Svelte autofixer on touched `.svelte` files.
- Validate scenarios:
  - Title, Kind, Updated, Words, and Target headers sort on first click and reverse on second click.
  - Active header shows the correct visual direction and `aria-sort`.
  - Toolbar Sort control stays synchronized with header clicks.
  - Existing Created sort remains available from the toolbar even though there is no Created column.
  - Filtering, row selection, select-all-visible, bulk action bar, and open-in-Documents behavior still work after sorting.
  - Missing target word counts sort last in both directions; ties fall back to title then id.
- Screenshot evidence:
  - `workspace-agents/implementation/screenshots/table-sort-title-asc-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/table-sort-updated-desc-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/table-sort-words-desc-after-2026-06-07.png`

## Assumptions

- Scope is sorting only: no column resizing, drag reordering, saved sort presets, multi-column sort, or database-backed sort.
- Sorting remains framework-agnostic in the Table View state slice; Svelte only renders controls and indicators.

## Implementation Results

Completed on 2026-06-07.

- Table View state now persists `sortDirection` alongside `sortBy`.
- Header clicks toggle sort direction when the active column is clicked and apply column defaults when switching columns.
- Visible headers sort by Title, Kind, Updated, Words, and Target.
- Toolbar sort controls remain synchronized and still expose Created sorting.
- Target word counts sort with missing values last in both ascending and descending directions; ties fall back to title and id.
- Screenshot capture now supports `SHELL_CAPTURE_TABLE_SORT` and `SHELL_CAPTURE_TABLE_SORT_DIRECTION`.

## Evidence

Validation run from `app-shell/`:

```bash
npm run typecheck
npm run build
git diff --check
```

Svelte autofixer:

- Not available in this session after tool discovery; Svelte validation was covered by `npm run build`.

Screenshot evidence:

- `workspace-agents/implementation/screenshots/table-sort-title-asc-after-2026-06-07.png`
- `workspace-agents/implementation/screenshots/table-sort-updated-desc-after-2026-06-07.png`
- `workspace-agents/implementation/screenshots/table-sort-words-desc-after-2026-06-07.png`
