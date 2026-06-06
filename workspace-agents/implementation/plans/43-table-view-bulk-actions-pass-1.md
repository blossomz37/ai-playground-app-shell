# Table View Bulk Actions Pass 1

## Summary

Add v1 multi-select to Table View so users can select folders and files, then bulk archive selected rows or bulk-edit file metadata. This pass deliberately avoids duplicate and destructive delete; those remain Pass 2 after the selection and metadata flow is proven.

## Key Changes

- Extend Table View state with non-persisted multi-selection:
  - `selectedDocIds`, `selectedFileIds`, `selectedFolderIds`, and helpers for toggle, range select, clear, and select-all-visible.
  - Keep existing `selectedDocId` as the focused/open row.
  - Prune selected IDs when documents or filters change so hidden rows are not accidentally edited.
- Update Table View UI:
  - Add a fixed-width checkbox column with row checkboxes and a tri-state "select visible" header checkbox.
  - Add a compact bulk action bar when one or more rows are selected.
  - Archive applies to selected folders and files; folders archive recursively.
  - Change kind and target word count apply only to non-folder docs. Mixed selections say folders are skipped.
  - Bulk kind options are `chapter`, `scene`, and `plan`.
- Add minimal document metadata support:
  - Add `DocumentMetadataPatch` and `documents.updateMetadata(id, patch)` to the shared shell API, preload bridge, IPC, document service, and Documents state port.
  - Store target word count in existing `documents.metadataJson` as `targetWordCount: number`.
  - Preserve unrelated metadata fields, including imported source metadata such as `word_count`.
  - No SQLite schema migration.
- Add bulk-safe document state helpers:
  - Add `archiveDocs(ids)` so bulk archive reuses dirty-document save behavior and avoids archiving descendants twice when a selected folder already contains selected children.
  - Bulk kind and metadata edits can loop through existing single-document update paths, but refresh store state and clear selection after success.

## Test Plan

- Run from `app-shell/`:
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`
  - Svelte autofixer on touched `.svelte` files.
- Validate scenarios:
  - Select one row, multiple rows, shift-select range, clear selection, and select all visible filtered rows.
  - Existing row open behavior still routes to Documents.
  - Changing filters prunes selection to visible rows.
  - Bulk target word count writes `metadataJson.targetWordCount` for files and preserves existing metadata.
  - Bulk kind changes only selected non-folder docs.
  - Mixed folder/file selection disables or skips file-only metadata actions for folders with clear UI text.
  - Bulk archive removes selected files and recursively removes selected folders without double-processing descendants.
  - Archived active dirty document is saved before archive.
- Required screenshot evidence:
  - `workspace-agents/implementation/screenshots/table-bulk-select-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/table-bulk-target-words-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/table-bulk-kind-after-2026-06-06.png`

## Assumptions

- "Files" means non-folder documents: `chapter`, `scene`, `plan`, and future non-folder kinds.
- Target word count is document metadata, not the derived current word count.
- Multi-selection is a transient UI state and should not persist across app reloads or workspace switches.
- Duplicate, permanent delete, restore-from-table, saved bulk presets, custom metadata fields, and schema-level word-count columns are out of scope for Pass 1.

## Implementation Results

Completed on 2026-06-06.

- Table View now supports transient multi-select with row checkboxes, shift-click range selection, visible-row select all, and clear selection.
- Bulk action bar appears for selected rows with archive, file-kind updates, and target word count updates.
- Folder rows are included for archive and skipped for file metadata actions with visible skipped-folder text.
- Document metadata updates use the existing `metadataJson` column and preserve unrelated metadata keys.
- Bulk archive dedupes selected descendants under selected folders and reuses dirty active-document save handling.
- Table View includes a Target column that displays `metadataJson.targetWordCount` when present.
- Capture support can set bulk selection states through `SHELL_CAPTURE_TABLE_BULK_STATE`.

## Evidence

- `workspace-agents/implementation/screenshots/table-bulk-select-after-2026-06-06.png`
- `workspace-agents/implementation/screenshots/table-bulk-target-words-after-2026-06-06.png`
- `workspace-agents/implementation/screenshots/table-bulk-kind-after-2026-06-06.png`

Validation run from `app-shell/`:

```bash
npm run typecheck
npm run build
git diff --check
```

Svelte autofixer:

- `MainView.svelte`: no issues, no suggestions after fixes.
