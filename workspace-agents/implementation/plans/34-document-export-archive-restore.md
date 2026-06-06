# Plan 34 - Document Export And Archive Restore

## Summary

Add the next shell-owned document lifecycle slice: export a selected document subtree from SQLite to a Markdown folder, and make archived documents restorable from the Documents UI. This follows Plans 32-33: project import already brings files into SQLite with provenance metadata, and imported frontmatter is now source metadata rather than editor body text.

## Anchor

- Shell primitive: Documents are a shell-owned primitive and SQLite is the live editing source of truth.
- Current behavior:
  - `documents.archive(id, { recursive? })` exists and sets `documents.archivedAt`.
  - `documents.list(workspaceId)` hides archived documents.
  - No document restore API or archived-document UI exists yet.
  - Workspace export is not implemented; folder import is one-way into SQLite.
- Boundary: This slice is document-level lifecycle, not workspace-level lifecycle and not source-file sync.

## Goal

From the Documents module, a user can:

1. Export the selected document or folder subtree to a chosen folder as Markdown files/folders.
2. Archive a document or folder subtree as today.
3. View archived documents for the current workspace.
4. Restore an archived document or folder subtree back into the active document tree.

## Key Changes

1. Add document export in shell core.
   - Add a shell-owned export helper, likely near `app-shell/src/main/core/documents.ts` or in a focused `app-shell/src/main/core/document-export.ts` if it keeps `documents.ts` readable.
   - Export from SQLite content, not from original `sourcePath`.
   - For a selected folder, recursively export descendants into matching folders.
   - For a selected non-folder document, write one Markdown file.
   - Use stable, filesystem-safe names derived from document titles.
   - Include a simple collision strategy, e.g. append `-2`, `-3`.
   - Preserve the app document body exactly as stored, without re-inserting imported source frontmatter.
   - Emit an export manifest JSON file if useful for proof/debugging, but do not create a broad package format unless needed.

2. Expose document export through IPC/preload/shared types.
   - Add `documents.exportSubtree(id, { targetDir? })`.
   - If `targetDir` is omitted, open a native folder picker.
   - Return a small result object with:
     - `rootDocumentId`
     - `targetDir`
     - `filesWritten`
     - `foldersWritten`
     - `manifestPath` if a manifest is written.

3. Add document restore support in shell core.
   - Add `documents.listArchived(workspaceId)` or `documents.list(workspaceId, { includeArchived: true })`.
   - Add `documents.restore(id, { recursive?: boolean })`.
   - Restoring a folder should restore its archived descendants by default.
   - Restoring a child whose parent is archived should either:
     - restore the ancestor chain too, or
     - restore it to the root.
   - Prefer restoring the ancestor chain because it preserves user intent and tree structure.

4. Update shared state and renderer store.
   - Extend `DocumentsStateSlice` with archived document loading and restore/export actions.
   - Keep active document selection stable:
     - after archive, select the next visible document if the active document was archived;
     - after restore, select the restored root document.
   - Refresh active and archived lists after archive/restore/export where needed.

5. Update Documents UI.
   - Add `Export` to document context menu for any selected node.
   - Add a compact archived section in the Documents nav pane, below the active tree.
   - Show archived document title, kind/icon, and a restore action.
   - Keep the archived section collapsed by default if there are no archived documents.
   - Avoid building a full archive manager modal in this slice.

6. Update browser fallback.
   - Add no-op or in-memory-safe behavior for `documents.exportSubtree`, `listArchived`, and `restore` in `app-shell/src/renderer/src/browser-shell.ts` so browser-mode development does not break.

7. Extend capture smoke validation.
   - Add a deterministic capture hook, e.g. `SHELL_CAPTURE_DOCUMENT_LIFECYCLE_SMOKE=1`.
   - Use a temporary export directory outside the repo, optionally supplied by `SHELL_CAPTURE_DOCUMENT_EXPORT_DIR`.
   - During smoke:
     - create a folder with nested child documents in the current workspace;
     - export the folder subtree;
     - confirm expected files/folders exist and file content matches SQLite content;
     - archive the folder recursively;
     - confirm active list hides archived docs and archived list includes them;
     - restore the folder recursively;
     - confirm active list includes restored docs and archived list no longer includes them;
     - clean up generated smoke docs from the app database if feasible, or clearly mark them as generated and archive them.

## Files / Areas Likely Touched

- `app-shell/src/main/core/documents.ts`
- `app-shell/src/main/core/document-export.ts` if helper separation is justified.
- `app-shell/src/main/ipc.ts`
- `app-shell/src/preload/index.ts`
- `app-shell/src/shared/module-contract.ts`
- `app-shell/src/shared/state/documents-state.ts`
- `app-shell/src/renderer/src/store/index.ts`
- `app-shell/src/renderer/src/modules/documents/NavView.svelte`
- `app-shell/src/renderer/src/modules/documents/DocumentTree.svelte` or `DocumentTreeRow.svelte` if archived rendering is shared.
- `app-shell/src/renderer/src/browser-shell.ts`
- `app-shell/src/main/capture/evidence.ts`
- `implementation/screenshots/document-export-archive-restore-after-2026-06-05.png`
- `implementation/plans/34-document-export-archive-restore.md`
- New `session-handoffs/HANDOFF_49.md` after implementation.

## Acceptance Criteria

- A selected document exports to a Markdown file in the chosen target folder.
- A selected folder exports as a folder subtree with Markdown files for non-folder descendants.
- Exported Markdown content matches `documents.content` exactly enough to round-trip body text; imported source frontmatter is not re-added.
- Export never writes to original `sourcePath` unless the user explicitly chooses that output folder.
- Export result reports written files/folders.
- Archived documents are visible in the Documents UI.
- Archived documents can be restored.
- Restoring a folder restores archived descendants.
- Restoring a child preserves or repairs its tree ancestry so it becomes visible.
- Existing workspace duplicate/delete behavior remains unchanged.
- Existing document archive behavior remains database-only and does not delete source/export files.

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
npm run audit:contrast
```

Additional validation:

- Run Svelte autofixer on any edited Svelte files, likely `NavView.svelte` and any new archived-list component.
- Run `git diff --check`.
- Use a deterministic temporary export folder outside the repo.
- Confirm by smoke log and filesystem checks:
  - exported root folder exists;
  - expected Markdown files exist;
  - exported body content matches SQLite document content;
  - filename collisions are handled deterministically;
  - archive hides docs from normal list;
  - archived list includes archived docs;
  - restore returns docs to normal list;
  - archived list no longer includes restored docs;
  - no original source files are modified.
- Capture screenshot evidence with the archived section visible, for example:

```bash
SHELL_CAPTURE_DOCUMENT_LIFECYCLE_SMOKE=1 \
SHELL_CAPTURE_SHOW_ARCHIVED_DOCUMENTS=1 \
SHELL_CAPTURE=../implementation/screenshots/document-export-archive-restore-after-2026-06-05.png \
npm run start
```

Optional real-project validation:

- Use the manual `dead-acre` workspace if present.
- Export one small subtree such as `chapter-plans/chapter-01-plan` into a temporary directory.
- Archive and restore only generated test docs or a disposable copied subtree, not Carlo's real imported manuscript/planning files.

## Risks / Unknowns

- Filename collisions are likely in real projects because repeated titles already appear in imported run folders. The export helper needs deterministic collision handling.
- Restoring a child whose parent remains archived can create invisible restored docs if ancestry is not handled deliberately.
- Exporting every document in a large workspace could be slow; this slice should start with selected subtree export rather than whole-workspace export.
- Current module state persistence lives partly in `shell_settings`; this plan intentionally avoids exporting module state.
- If export manifests become a future import format, that should be a separate plan.

## Out Of Scope

- Whole-workspace export/import package format.
- Syncing edits back to source files.
- Rehydrating exported Markdown back into the same workspace.
- Exporting document version history.
- Exporting AI conversations, runs, assets, journal entries, workflow profiles, web bookmarks, settings, or jobs.
- Permanent trash/delete UI for archived documents.
- Cloud share/export targets.

## Outcome - 2026-06-05

Implemented.

- Added shell document APIs for `listArchived`, `restore`, and `exportSubtree`.
- Added `app-shell/src/main/core/document-export.ts` to keep filesystem-safe Markdown subtree export separate from document persistence.
- Export writes from SQLite `documents.content`, not `sourcePath`, and never re-adds imported source frontmatter.
- Export handles filename collisions deterministically with numeric suffixes.
- Restore brings archived ancestor chains and recursive descendants back into the active document list.
- Documents state now tracks active and archived document trees separately.
- Documents nav now includes an `Export` context-menu action and a compact archived section with restore controls.
- Browser fallback supports the expanded document API.
- Capture smoke validates export, archive, restore, collision handling, filesystem output, and cleanup.

Smoke evidence:

```json
{
  "exportedFilesExist": true,
  "exportedFoldersExist": true,
  "collisionHandled": true,
  "contentMatched": true,
  "archivedAfterArchiveCount": 5,
  "hiddenAfterArchive": true,
  "restoredCount": 5,
  "visibleAfterRestore": true,
  "archivedAfterRestoreCount": 0,
  "cleanupScheduled": true
}
```

Export proof directory:

- `/var/folders/g7/tz7l2sbd5sd_42fjbxrjqc1m0000gn/T/app-shell-document-export-1780696182456`

Exported files:

- `Lifecycle Export Smoke/Overview.md`
- `Lifecycle Export Smoke/Scenes/Scene Notes.md`
- `Lifecycle Export Smoke/Scenes/Scene Notes-2.md`

Cleanup:

- Generated smoke documents and document versions were deleted after screenshot capture.

Validation:

- Svelte autofixer clean for `app-shell/src/renderer/src/modules/documents/NavView.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `git diff --check`
- Screenshot evidence: `implementation/screenshots/document-export-archive-restore-after-2026-06-05.png`.
