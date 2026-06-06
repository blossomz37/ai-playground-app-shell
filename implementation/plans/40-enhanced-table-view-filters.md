# Enhanced Table View Filters Plan

## Summary

Enhance the existing Table View filters instead of rebuilding the table. This slice adds multi-kind filtering with `All`, `None`, and `Invert`, word-count range filtering, modified-date quick ranges, visible filter chips, a result summary, screenshot evidence, per-slice commits, and a final handoff.

## Key Changes

- Extend Table View state from single `filterKind` to:
  - `kindFilterMode: "all" | "custom"`
  - `selectedKinds: string[]`
  - `wordCountMin?: number`
  - `wordCountMax?: number`
  - `updatedRange: "all" | "today" | "7d" | "30d"`
- Preserve old persisted state:
  - old `filterKind: "all"` migrates to `kindFilterMode: "all"`.
  - old specific `filterKind` migrates to `kindFilterMode: "custom"` plus `selectedKinds: [filterKind]`.
- Update Table View UI:
  - Replace the kind dropdown with a compact multi-select popover.
  - Add `All`, `None`, and `Invert` controls in the popover.
  - Add word-count min/max controls and modified-date quick range.
  - Show active filter chips and `Showing X of Y documents`.
  - Keep existing search, sort, row selection, and open-in-Documents behavior.
- Extend screenshot capture support:
  - Add `SHELL_CAPTURE_TABLE_KINDS=chapter,scene`.
  - Keep existing `SHELL_CAPTURE_TABLE_KIND` as backward-compatible single-kind input.
  - Add `SHELL_CAPTURE_TABLE_WORDS_MIN`, `SHELL_CAPTURE_TABLE_WORDS_MAX`, and `SHELL_CAPTURE_TABLE_UPDATED_RANGE`.

## Implementation Slices

1. **Plan Artifact Slice**
   - Create this plan artifact.
   - Commit: `Add enhanced table filter plan`.

2. **Filter Model and UI Slice**
   - Update shared Table View state and renderer adapter.
   - Implement the multi-kind popover, range controls, chips, summary line, and clear behavior.
   - Normalize word-count inputs: negatives become `0`; if min exceeds max, swap values on commit/blur.
   - Run validation and capture evidence before commit.
   - Commit: `Enhance table view filters`.

3. **Evidence, Docs, and Handoff Slice**
   - Update this plan artifact with implementation results and evidence paths.
   - Update orientation docs if behavior is durable enough to matter next session.
   - Write `session-handoffs/HANDOFF_55.md`.
   - Commit: `Document table filter enhancements`.

## Test Plan

- Run:
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`
  - Svelte autofixer on touched `.svelte` files.
- Manual/evidence scenarios:
  - Default Table View with no active filters.
  - Multi-kind filter: `chapter + scene`.
  - `All`, `None`, and `Invert` kind controls.
  - Search combined with multi-kind filter.
  - Word-count range filter.
  - Modified-date quick range filter.
  - Empty filtered state.
  - Reset clears every filter and preserves sort.
  - Opening a filtered row still routes to Documents.
- Required screenshots:
  - `implementation/screenshots/table-filters-default-after-2026-06-06.png`
  - `implementation/screenshots/table-filters-multi-kind-after-2026-06-06.png`
  - `implementation/screenshots/table-filters-range-after-2026-06-06.png`
  - `implementation/screenshots/table-filters-empty-after-2026-06-06.png`

## Assumptions

- Saved filter presets, custom date pickers, DB-backed full-text search, and cross-module filtering are out of scope for this v1.
- Filtering remains in the existing framework-agnostic Table View state slice; no SQLite schema change is needed.
- Screenshot files remain ignored evidence artifacts under `implementation/screenshots/`.

