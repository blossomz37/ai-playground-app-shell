# Table View Bulk Duplicate/Delete Pass 2

## Summary

Extend Table View bulk actions with recursive duplicate and destructive DB-only delete. This builds on Plan 43's multi-select foundation and keeps delete clearly separate from archive through a two-click confirmation pattern matching the existing project delete UI.

## Key Changes

- Add document lifecycle APIs:
  - `documents.duplicate(id, options?: { recursive?: boolean }): Promise<Doc[]>`
  - `documents.delete(id, options?: { recursive?: boolean }): Promise<string[]>`
  - Wire both through shared contract, preload, IPC, browser preview shell, `DocumentsPort`, `DocumentsStateSlice`, renderer store helpers, and Table View UI.
- Recursive duplicate behavior:
  - Selected folders duplicate their full active subtree; selected non-folder files duplicate only themselves.
  - If a selected child is already inside a selected folder, duplicate it only once as part of the folder copy.
  - Duplicated root rows are inserted immediately after each source root in the same parent.
  - Descendants preserve internal hierarchy, order, kind, icon, content, content format, source provenance fields, and `metadataJson`.
  - Root titles use `"<title> Copy"` with numeric suffixes when needed in the destination parent; descendant titles are preserved.
  - New rows get new IDs and fresh `createdAt`/`updatedAt`; document versions are not copied.
- Destructive delete behavior:
  - Delete permanently removes selected active rows from SQLite only; source files/folders on disk are never removed.
  - Folders delete recursively, including descendants and their `document_versions`.
  - Selected descendants under selected folders are deduped before deletion.
  - If the active dirty document is in the delete set, save it before delete so version history captures the last editor state before row removal.
  - After delete, clear Table View selection and select the same fallback behavior used by archive.
- Table View UI:
  - Add `Duplicate` and `Delete from DB` actions to the existing bulk action bar.
  - `Archive` remains non-destructive and separate.
  - Delete uses the same two-click pattern as workspace deletion: first click arms confirmation and shows a short note, second click executes.
  - Changing selection, clearing selection, filtering, or running any other bulk action cancels the pending delete confirmation.
  - Use Phosphor `CopyIcon`, `TrashIcon`, and `CheckIcon` for the new actions.

## Test Plan

- Run from `app-shell/`:
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`
  - Svelte autofixer on touched `.svelte` files.
- Validate scenarios:
  - Duplicate a single file; copy appears after source with `Copy` title, content and target word metadata preserved.
  - Duplicate a folder; all descendants copy once with hierarchy/order preserved.
  - Duplicate mixed folder/file selection; selected descendants inside selected folders are not duplicated twice.
  - Delete a single file; row and versions are removed from DB and source file path is untouched.
  - Delete a folder; active subtree disappears and descendant versions are removed.
  - Delete mixed selection; selected descendants inside selected folders are not double-processed.
  - Delete confirmation arms on first click, executes on second click, and cancels on selection/filter changes.
  - Existing archive, kind update, target-word update, row opening, and select-all behavior still work.
- Required screenshot evidence:
  - `workspace-agents/implementation/screenshots/table-bulk-duplicate-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/table-bulk-delete-confirm-after-2026-06-06.png`

## Assumptions

- This is document-level duplicate/delete only, not workspace duplicate/delete.
- Delete means hard DB delete, not archive, and does not touch imported/source files on disk.
- Duplicates copy live document data and metadata, but not document version history.
- No new SQLite schema is needed.
- Restore-from-table, undo for delete, source-file deletion, duplicate-name editing, and permanent delete from archived lists are out of scope.

## Implementation Results

- Added shared document lifecycle APIs for duplicate and DB-only delete across the shell contract, preload bridge, IPC, main document service, renderer document state, browser preview shell, and store helpers.
- Added recursive folder duplicate/delete behavior with selected-descendant dedupe in document state, fresh IDs/timestamps for duplicated rows, preserved live document fields and metadata, and no document-version copying.
- Added destructive delete cleanup for active documents, descendant rows, `document_versions`, and related AI proposals while leaving source files/folders on disk untouched.
- Added Table View bulk-bar actions for `Duplicate` and two-click `Delete from DB` / `Confirm delete`, with confirmation canceling on selection, filter, clear, archive, duplicate, kind, and target-word changes.
- Extended screenshot capture support for duplicate and delete-confirm bulk states.

## Validation Results

- `npm run typecheck` passed from `app-shell/`.
- `npm run build` passed from `app-shell/`.
- `git diff --check` passed.
- Svelte autofixer reported no issues for `MainView.svelte`.
- Screenshot evidence captured:
  - `workspace-agents/implementation/screenshots/table-bulk-duplicate-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/table-bulk-delete-confirm-after-2026-06-06.png`
