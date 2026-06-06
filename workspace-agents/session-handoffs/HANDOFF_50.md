# Session Handoff 50 - Journal Import Export And Archive Restore

_Session: 2026-06-05 - Slice: Plan 35 journal lifecycle_

## What Changed

- Added shared Journal lifecycle contracts:
  - `JournalEntry.archivedAt`
  - `JournalImportCandidate`
  - `JournalExportParams`
  - `JournalExportResult`
  - `window.shell.journal.pickImportFiles()`
  - `window.shell.journal.exportEntries()`
- Added `app-shell/src/shared/journal-markdown.ts` for Journal-specific Markdown/frontmatter parse and serialize.
- Journal state now partitions active and archived entries, hydrates older snapshots without `archivedAt`, and supports create/import/archive/restore/export selection helpers.
- Journal renderer state now calls shell-owned filesystem APIs for import/export and persists imported/archive changes through the existing workspace-scoped settings key.
- Journal nav now has compact new/import/export/archive controls and an inline archived section with restore.
- Browser preview has safe no-op Journal filesystem fallbacks.
- Capture evidence now supports `SHELL_CAPTURE_JOURNAL_LIFECYCLE_SMOKE=1`, deterministic import/export fixtures, archive/restore assertions, filename collision checks, and exact snapshot cleanup.

## Decisions

- Kept Journal persisted in the existing renderer-managed workspace settings snapshot for this slice; no dedicated SQLite journal table yet.
- Kept the frontmatter helper Journal-specific instead of adding a broad YAML dependency or shared full-YAML parser.
- Kept archived UI inline in the Journal nav rather than building a modal archive manager.
- Export writes selected active entries only through the explicit export control; archived export-by-default is out of scope.

## Evidence

- Svelte autofixer clean for `app-shell/src/renderer/src/modules/journal/NavView.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `git diff --check`
- Smoke assertions:
  - `importedCount: 3`
  - `exportedFilesExist: true`
  - `collisionHandled: true`
  - `exportedFrontmatterMatched: true`
  - `exportedBodyMatched: true`
  - `importedBodyStripped: true`
  - `importedTagsMatched: true`
  - `plainImportDefaulted: true`
  - `hiddenAfterArchive: true`
  - `archivedAfterArchive: true`
  - `restored: true`
  - `visibleAfterRestore: true`
  - `archivedAfterRestore: false`
  - `cleanupScheduled: true`
- Smoke cleanup restored the previous Journal snapshot with `restoredEntries: 3`.
- Screenshot evidence: `implementation/screenshots/journal-import-export-archive-restore-after-2026-06-05.png`.

## Next Recommended Action

- If committing the lifecycle work as a sequence, decide whether to commit Plans 33, 34, and 35 separately or together. Screenshot files are under an ignored path and need force-adding if they should be included.
- Good next candidates are Assets lifecycle export/archive or a whole-workspace import/export package plan. Start from live repo status and the newest handoff before choosing.
