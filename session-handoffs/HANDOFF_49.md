# Session Handoff 49 - Document Export And Archive Restore

_Session: 2026-06-05 - Slice: Plan 34 document export and archive restore_

## What Changed

- Added document APIs for archived listing, restore, and subtree export:
  - `documents.listArchived(workspaceId)`
  - `documents.restore(id, { recursive? })`
  - `documents.exportSubtree(id, { targetDir? })`
- Added `app-shell/src/main/core/document-export.ts` for filesystem-safe Markdown subtree export.
- Export writes from SQLite `documents.content`, not original `sourcePath`, and does not re-add imported source frontmatter.
- Export handles filename collisions with numeric suffixes.
- Restore restores archived ancestor chains and recursive descendants so restored docs become visible.
- Documents state now tracks active and archived trees separately.
- Documents nav now has an `Export` context-menu action and a compact archived section with restore buttons.
- Browser fallback and capture evidence support the expanded document API.

## Decisions

- Kept this document-level, not a whole-workspace package/export format.
- Kept export body-only for now; document versions and source metadata manifests are out of scope.
- Kept archived UI inline in the Documents nav instead of building a full archive manager.
- Kept smoke cleanup internal to the capture harness so generated test docs do not remain in the app DB.

## Evidence

- Svelte autofixer clean for `NavView.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `git diff --check`
- Smoke export directory:
  - `/var/folders/g7/tz7l2sbd5sd_42fjbxrjqc1m0000gn/T/app-shell-document-export-1780696182456`
- Smoke assertions:
  - `exportedFilesExist: true`
  - `exportedFoldersExist: true`
  - `collisionHandled: true`
  - `contentMatched: true`
  - `archivedAfterArchiveCount: 5`
  - `hiddenAfterArchive: true`
  - `restoredCount: 5`
  - `visibleAfterRestore: true`
  - `archivedAfterRestoreCount: 0`
  - `cleanupScheduled: true`
- Generated smoke documents and versions were deleted after screenshot capture.
- Screenshot evidence: `implementation/screenshots/document-export-archive-restore-after-2026-06-05.png`.

## Next Recommended Action

- Commit Plans 33 and 34 together only if that is the desired boundary; otherwise commit Plan 33 first, then Plan 34. Screenshot files are under an ignored screenshots path and will need force-adding if they should be included.
- Good follow-up lifecycle slices are Journal Markdown/frontmatter import/export or Assets archive/export manifest. Start from live repo status and the newest handoff before choosing.
