# Plan 35 - Journal Import Export And Archive Restore

## Summary

Add the next lifecycle slice for Journal entries: import/export entries as Markdown with frontmatter, and support archive/restore from the Journal UI. This is the cleanest follow-up after Plans 33-34 because journal entries are already content objects with metadata fields and map naturally to Obsidian-style Markdown files.

## Anchor

- Current Journal data lives in `app-shell/src/shared/state/journal-state.ts` and persists through workspace-scoped `shell_settings` keys via `app-shell/src/renderer/src/modules/journal/state.ts`.
- Current entry shape:
  - `id`
  - `date`
  - `fullDate`
  - `title`
  - `preview`
  - `content`
  - `created`
  - `modified`
  - `mood`
  - `tags`
- Current UI supports selecting, renaming, and editing entries, but not creating/importing/exporting/archive/restore.
- Plans 33-34 already establish the right lifecycle rules:
  - use Markdown frontmatter for portable metadata;
  - keep app content as the editable source of truth;
  - use native filesystem APIs through Electron main/preload;
  - validate with capture smoke plus screenshot evidence.

## Goal

From the Journal module, a user can:

1. Export one or more journal entries to Markdown files with frontmatter.
2. Import Markdown files containing journal frontmatter into the current workspace journal.
3. Archive journal entries without deleting them.
4. View and restore archived journal entries.

## Key Changes

1. Extend the Journal state model.
   - Add `archivedAt?: string | null` to `JournalEntry`.
   - Add `archivedEntries` or derive active/archived lists from one entry collection.
   - Keep the persisted snapshot backward-compatible with existing entries that do not have `archivedAt`.
   - Add state methods:
     - `createEntry(params?)`
     - `archiveEntry(id)`
     - `restoreEntry(id)`
     - `importEntries(entries)`
     - `exportEntry(id)` / `exportEntries(ids)`
   - Update `selectedEntryId` if the selected entry is archived or restored.

2. Add a small journal Markdown/frontmatter helper.
   - Add `app-shell/src/shared/journal-markdown.ts` or `app-shell/src/shared/state/journal-markdown.ts` if the helper can stay framework-agnostic.
   - Serialize entries as:

```markdown
---
title: Morning thoughts
date: 2026-05-29
fullDate: Friday, May 29, 2026
created: 2026-05-29 08:15
modified: 2026-05-29 15:22
mood: Productive
tags:
  - daily
  - reflection
  - project
---

## Morning Thoughts

...
```

   - Parse the same format on import.
   - Reuse or adapt the existing frontmatter parsing approach from Plan 33 where practical, but keep Journal-specific normalization local to the Journal slice.
   - Preserve unknown frontmatter keys in a `metadata`/`raw` field only if that is directly useful; otherwise keep v1 focused on known journal fields.

3. Add filesystem bridge for Journal import/export.
   - Add `window.shell.journal` IPC/preload methods rather than forcing renderer-only file handling:
     - `journal.pickImportFiles()`
     - `journal.exportEntries(entries, { targetDir? })`
   - Import picker should accept `.md`, `.markdown`, and `.txt` if Markdown files are enough for v1.
   - Export should write one Markdown file per entry using filesystem-safe titles and deterministic collision suffixes.
   - Export should return `{ targetDir, filesWritten }`.
   - Keep source files/export files separate from the live app state.

4. Update Journal renderer state.
   - Wire `journal-state.ts` to the filesystem bridge through `app-shell/src/renderer/src/modules/journal/state.ts`.
   - Keep persistence through `modules.journal.<workspaceId>.state` for this slice.
   - Ensure imported entries are saved in the workspace-specific snapshot.
   - Duplicate workspace behavior should continue copying Journal state automatically through existing `modules.%.<workspaceId>.state` copying.

5. Update Journal UI.
   - Add compact nav actions:
     - New entry
     - Import
     - Export selected
   - Add row actions or context actions:
     - Rename
     - Archive
     - Export
   - Add an archived section below active journal entries, mirroring the lightweight Documents archive pattern.
   - Add restore action for archived entries.
   - Do not build a full archive manager modal.

6. Update browser fallback.
   - Add safe no-op/in-memory `window.shell.journal` behavior in `app-shell/src/renderer/src/browser-shell.ts` so browser preview keeps working.

7. Extend capture smoke validation.
   - Add `SHELL_CAPTURE_JOURNAL_LIFECYCLE_SMOKE=1`.
   - Use a deterministic temporary import/export directory outside the repo.
   - During smoke:
     - create/import at least two entries from Markdown files with frontmatter;
     - export a selected entry;
     - confirm exported Markdown contains expected frontmatter and body;
     - archive an entry;
     - confirm it leaves the active list and appears in archived list;
     - restore it;
     - confirm it returns to active list;
     - clean up generated smoke entries from the workspace journal snapshot if feasible, or restore the pre-smoke snapshot exactly.

## Files / Areas Likely Touched

- `app-shell/src/shared/state/journal-state.ts`
- `app-shell/src/shared/journal-markdown.ts` or nearby helper if justified.
- `app-shell/src/renderer/src/modules/journal/state.ts`
- `app-shell/src/renderer/src/modules/journal/NavView.svelte`
- `app-shell/src/renderer/src/modules/journal/MainView.svelte` if entry creation/export controls touch the header.
- `app-shell/src/renderer/src/modules/journal/InspectorView.svelte` if archived/import metadata should be visible.
- `app-shell/src/main/ipc.ts`
- `app-shell/src/preload/index.ts`
- `app-shell/src/shared/module-contract.ts`
- `app-shell/src/renderer/src/browser-shell.ts`
- `app-shell/src/main/capture/evidence.ts`
- `implementation/screenshots/journal-import-export-archive-restore-after-2026-06-05.png`
- `implementation/plans/35-journal-import-export-archive-restore.md`
- New `session-handoffs/HANDOFF_50.md` after implementation.

## Acceptance Criteria

- Journal entries can be exported to Markdown with frontmatter.
- Exported frontmatter includes title/date/fullDate/created/modified/mood/tags when present.
- Exported body matches `entry.content`.
- Filename collisions are handled deterministically.
- Markdown files with compatible frontmatter can be imported as journal entries.
- Imported entries preserve title, body, mood, tags, and created/modified fields where present.
- Files without full frontmatter can still import with sensible defaults.
- Archived entries are hidden from the active journal list.
- Archived entries appear in a Journal archived section.
- Archived entries can be restored.
- Existing persisted Journal snapshots hydrate without migration failures.
- Workspace duplicate continues to copy Journal state through existing workspace-scoped module settings.

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
npm run audit:contrast
```

Additional validation:

- Run Svelte autofixer on any edited Journal Svelte components.
- Run `git diff --check`.
- Use deterministic temporary import/export folders outside the repo.
- Confirm by smoke log and filesystem checks:
  - imported entries count;
  - imported fields match expected frontmatter;
  - imported body excludes frontmatter;
  - exported files exist;
  - exported frontmatter contains expected title/date/tags/mood;
  - exported body matches the app entry body;
  - filename collisions are handled;
  - archive hides entries from active list;
  - restore returns entries to active list;
  - pre-smoke journal state is restored or generated entries are removed.
- Capture screenshot evidence:

```bash
SHELL_CAPTURE_JOURNAL_LIFECYCLE_SMOKE=1 \
SHELL_CAPTURE_MODULE=shell.journal \
SHELL_CAPTURE=../implementation/screenshots/journal-import-export-archive-restore-after-2026-06-05.png \
npm run start
```

## Risks / Unknowns

- Journal currently persists as renderer-managed JSON in `shell_settings`, not a first-class SQLite table. This is acceptable for a narrow lifecycle slice, but a future database migration may be warranted if Journal becomes a major primitive.
- Dates in current seed data are human-readable strings, not normalized ISO dates. Import/export should tolerate both rather than enforcing a migration in this slice.
- Frontmatter parsing should be conservative; full YAML compatibility can wait unless real Journal files require it.
- Restoring a pre-smoke Journal snapshot from settings is safer than trying to delete individual generated entries if import collisions or generated IDs vary.

## Out Of Scope

- Moving Journal entries into dedicated SQLite tables.
- Full YAML dependency or broad Obsidian plugin compatibility.
- Whole-workspace import/export package.
- Journal search/indexing.
- Calendar view, daily-entry automation, reminders, or mood analytics.
- Exporting archived entries by default unless explicitly selected.
- Syncing exported files back into the app after external edits.

## Outcome - 2026-06-05

Implemented. Journal now has shell-bridged Markdown import/export plus archive/restore in the module nav.

- Added `JournalEntry` shared contract fields and `window.shell.journal.pickImportFiles()` / `window.shell.journal.exportEntries()` IPC-preload APIs.
- Added `app-shell/src/shared/journal-markdown.ts` for focused Journal frontmatter serialization/parsing.
- Extended framework-agnostic Journal state with active/archived partitioning, backward-compatible hydration, create/import/archive/restore/export selection helpers, and persistence through the existing workspace-scoped settings key.
- Updated Journal renderer state and nav UI with new/import/export/archive/restore controls plus an inline archived section.
- Added browser-preview fallbacks and capture-only lifecycle smoke hooks.
- Added `SHELL_CAPTURE_JOURNAL_LIFECYCLE_SMOKE=1`, deterministic temp import/export fixtures, filesystem export checks, archive/restore assertions, and snapshot cleanup.

Smoke evidence:

```text
[SHELL_CAPTURE_JOURNAL_LIFECYCLE_SMOKE] importedCount=3 exportedFilesExist=true collisionHandled=true exportedFrontmatterMatched=true exportedBodyMatched=true importedBodyStripped=true importedTagsMatched=true plainImportDefaulted=true hiddenAfterArchive=true archivedAfterArchive=true restored=true visibleAfterRestore=true archivedAfterRestore=false cleanupScheduled=true
[SHELL_CAPTURE_JOURNAL_LIFECYCLE_CLEANUP] restoredEntries=3
```

Screenshot evidence:

- `implementation/screenshots/journal-import-export-archive-restore-after-2026-06-05.png`

Validation:

- Svelte autofixer clean for `app-shell/src/renderer/src/modules/journal/NavView.svelte`
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `git diff --check`
