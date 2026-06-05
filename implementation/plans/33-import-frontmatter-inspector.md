# Plan 33 - Import Frontmatter Inspector

## Summary

Add a narrow follow-up to Plan 32: when imported Markdown/text files contain Obsidian-style frontmatter, preserve that metadata as document source metadata and show the useful fields in the Documents inspector. SQLite remains the editing source of truth, and source files remain provenance only.

## Anchor

- Workspace primitive: Plan 32 folder import already owns file import, `sourcePath`, `sourceChecksum`, duplicate, archive/restore, and database-only delete.
- Document primitive: `documents.content` is live editable content; imported frontmatter is metadata, not editor body text.
- UI surface: `app-shell/src/renderer/src/modules/documents/InspectorView.svelte` already owns document metadata display.

## Goal

On import, turn frontmatter like this:

```yaml
---
file: chapter-03.md
description:
"Chapter 3 - She Should Have Been Left Outside"
version: 2.0.0
created: 2026-05-13
modified: 2026-05-13
author: novel-production-loop / session-14
status: revised draft
related:
  chapter-plans/chapter-03-plan.md
  chapter-plans/chapter-03-planning-packet.md
  manuscript/chapter-02.md
  chapter-summaries/chapter-02-summary.md
word_count: 3208
---
```

into inspector-visible source metadata while importing the body content without the frontmatter block.

## Key Changes

1. Extend the document schema.
   - Add `documents.metadataJson TEXT` through `CREATE TABLE` and `ensureColumn`.
   - Add `metadataJson: string | null` to the shared `Doc` type.
   - Keep this generic and document-scoped; do not add separate columns for every frontmatter key in v1.

2. Add a conservative parser in shell core.
   - Add a small helper near import code, likely `app-shell/src/main/core/frontmatter.ts` if it keeps `workspaces.ts` from growing further.
   - Detect frontmatter only when file content starts with `---` on the first line and has a closing `---`.
   - Return `{ body, metadata }`.
   - Strip the frontmatter block before saving `documents.content`.
   - Preserve unknown keys inside `metadata.raw` or equivalent so future UI can surface more without reimporting.

3. Normalize only the fields that are useful now.
   - `file` -> source filename/path label.
   - `description` -> description.
   - `version` -> source version.
   - `created` -> source created date.
   - `modified` -> source modified date.
   - `author` -> source author/generator.
   - `status` -> source status.
   - `related` -> string array.
   - `word_count` -> imported word count number.

4. Handle the author-workspace YAML-ish shape without adding a dependency.
   - Support `key: value`.
   - Support `key:` followed by a quoted value on the next line.
   - Support `related:` followed by indented bare lines or `- item` lines.
   - Trim surrounding single/double quotes.
   - If parsing is uncertain, preserve raw metadata text and do not block import.

5. Update duplicate/delete behavior.
   - Duplicate copies `metadataJson` along with the document row.
   - Database-only delete naturally removes it with documents.

6. Update the Documents inspector.
   - Add a `Source Metadata` section below the current `Document` section and above `Snapshots`.
   - Show only present fields; omit empty rows.
   - Show:
     - Source file
     - Description
     - Status
     - Version
     - Source created
     - Source modified
     - Author
     - Imported words
     - Current words
     - Related paths
   - Keep app `Created` / `Updated` separate from source `created` / `modified`.
   - Long paths should truncate cleanly, with full path in `title`.

7. Extend capture smoke validation.
   - Add frontmatter to the Plan 32 import smoke fixture path or create a new fixture during validation.
   - Log metadata extraction proof from `SHELL_CAPTURE_WORKSPACE_IMPORT_ROOT`, including frontmatter stripped from content and metadata keys present.
   - Capture inspector evidence with:

```bash
SHELL_CAPTURE_WORKSPACE_IMPORT_ROOT=<fixture> \
SHELL_CAPTURE_MODULE=shell.documents \
SHELL_CAPTURE_SHOW_INSPECTOR=1 \
SHELL_CAPTURE=../implementation/screenshots/import-frontmatter-inspector-after-2026-06-05.png \
npm run start
```

## Files / Areas Touched

- `app-shell/src/main/core/db.ts`
- `app-shell/src/main/core/workspaces.ts`
- `app-shell/src/main/core/frontmatter.ts` if a helper file is justified by keeping import logic readable.
- `app-shell/src/shared/module-contract.ts`
- `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`
- `app-shell/src/renderer/src/browser-shell.ts`
- `app-shell/src/main/capture/evidence.ts`
- `implementation/screenshots/import-frontmatter-inspector-after-2026-06-05.png`
- `implementation/plans/33-import-frontmatter-inspector.md`
- New `session-handoffs/HANDOFF_48.md` after implementation.

## Acceptance Criteria

- Importing a frontmatter-bearing `.md` file stores metadata in SQLite and imports only the body into `documents.content`.
- Files without frontmatter import exactly as before.
- Unsupported files are still skipped.
- `sourcePath` and `sourceChecksum` behavior from Plan 32 remains unchanged.
- Inspector shows source metadata for imported files and does not show an empty metadata section for documents without metadata.
- App timestamps and source timestamps are visually distinct.
- Duplicate preserves source metadata.
- Delete remains database-only and never deletes source files.

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
npm run audit:contrast
```

Additional validation:

- Run Svelte autofixer on `InspectorView.svelte`.
- Use a deterministic fixture outside app source with:
  - one `.md` file with the sample frontmatter shape;
  - one `.markdown` file with simple `key: value` frontmatter;
  - one `.txt` file with no frontmatter;
  - one unsupported `.json` file.
- Confirm via smoke log or SQLite query:
  - metadata fields persisted;
  - body content no longer includes the frontmatter delimiter;
  - `related` parsed into an array;
  - `word_count` parsed as a number;
  - no-frontmatter file content is unchanged;
  - unsupported file is skipped;
  - duplicate copies `metadataJson`;
  - generated smoke workspaces self-clean.
- Capture screenshot evidence:
  - `implementation/screenshots/import-frontmatter-inspector-after-2026-06-05.png`

## Risks / Unknowns

- The sample is Obsidian-style but not strict YAML because `related:` uses indented bare lines rather than `-` list items. Keep parsing conservative and tolerant.
- Full YAML support can be deferred. Adding a YAML dependency is not necessary unless real files prove the simple parser insufficient.
- If future search/filter needs metadata fields, JSON-in-one-column may not be enough. For this slice, inspector display is the only target.
- Stripping frontmatter is correct for clean editing, but users may later want a raw-source preview. That is out of scope.

## Out Of Scope

- Syncing metadata changes back to source files.
- Editing frontmatter metadata in the inspector.
- Using metadata to drive document kind, icons, status filters, or AI context rules.
- Importing non-text formats into Documents.
- Building a full YAML parser or frontmatter compatibility layer for every Obsidian plugin convention.
- Reworking the document model beyond one generic metadata JSON field.

## Outcome - 2026-06-05

Implemented.

- Added `documents.metadataJson` with migration support and shared `Doc` typing.
- Added `app-shell/src/main/core/frontmatter.ts` as a small shell-owned parser for first-line `---` blocks.
- Folder import now strips supported frontmatter from imported document body text, persists normalized metadata JSON, keeps source checksum based on the original file bytes, and leaves files without frontmatter unchanged.
- Workspace duplicate now copies document metadata JSON.
- The Documents inspector now shows a `Source Metadata` section only when metadata exists, with source fields kept separate from app-created/app-updated timestamps.
- Capture smoke now validates metadata persistence, duplicate metadata persistence, body stripping, related-list parsing, word-count parsing, no-frontmatter unchanged behavior, unsupported-file skipping, archive/restore, and smoke workspace cleanup.

Final smoke log:

```json
{
  "initialWorkspaceId": "ws-76771f4f-6de9-4313-97fe-aa310ec7f8ed",
  "importedWorkspaceId": "ws-19ec9670-9ce3-41c8-8a01-84d9aa6bf09c",
  "duplicateWorkspaceId": "ws-57ab6925-c109-42cd-8723-2dc5e2f380a8",
  "metadataDocumentId": "85433242-2b56-42b9-8d46-51374ec4ffc4",
  "importedDocCount": 8,
  "duplicateDocCount": 8,
  "folderTitles": ["Act One", "Research", "Scenes"],
  "fileTitles": ["alpha", "beta", "note", "plain-note", "scene-note"],
  "contentMatched": true,
  "unsupportedSkipped": true,
  "metadataPersisted": true,
  "duplicateMetadataPersisted": true,
  "frontmatterStripped": true,
  "relatedCount": 4,
  "importedWordCount": 3208,
  "sourceStatus": "revised draft",
  "sourceDescription": "Chapter 3 - She Should Have Been Left Outside",
  "noFrontmatterUnchanged": true,
  "sourcePathCount": 8,
  "checksumCount": 5,
  "archivedAfterArchive": true,
  "cleanupScheduled": true
}
```

Cleanup log:

```json
{
  "deletedWorkspaceIds": [
    "ws-19ec9670-9ce3-41c8-8a01-84d9aa6bf09c",
    "ws-57ab6925-c109-42cd-8723-2dc5e2f380a8"
  ],
  "restoredActiveWorkspaceId": "ws-76771f4f-6de9-4313-97fe-aa310ec7f8ed"
}
```

Validation:

- Svelte autofixer clean for `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `git diff --check`
- Confirmed no generated `Lifecycle Smoke%` workspace rows remained.
- Confirmed fixture source files remained after database-only cleanup.
- Screenshot evidence: `implementation/screenshots/import-frontmatter-inspector-after-2026-06-05.png`.

## Real Project Validation - 2026-06-05

Tested folder import with `/Users/carlo/Github/eaw-novel-builder/projects/dead-acre`.

- Imported document rows: `519`
- Duplicate document rows: `519`
- Imported file checksum rows: `416`
- Imported source path rows, including folders: `519`
- Metadata persisted: `true`
- Duplicate metadata persisted: `true`
- Frontmatter stripped from selected metadata document body: `true`
- Related paths parsed for selected metadata document: `6`
- Unsupported files skipped by import filter: `true`
- Archive/restore lifecycle still passed: `true`
- Generated smoke workspaces cleaned up afterward: `true`
- Active workspace restored afterward: `ws-76771f4f-6de9-4313-97fe-aa310ec7f8ed`
- Source files retained after database-only cleanup: `true`
- Screenshot evidence: `implementation/screenshots/dead-acre-import-frontmatter-after-2026-06-05.png`

Notes:

- The selected metadata document was `chapter-01-plan`.
- The inspector showed source file, description, version, source created/modified dates, author, current word count, and related paths.
- `contentMatched` and `noFrontmatterUnchanged` were `false` in this run because those smoke fields are fixture-specific checks for `alpha`, `scene-note`, and `plain-note`, not general real-project assertions.
- After the automated smoke cleanup, Carlo also tested import manually. That left a real `dead-acre` workspace in the App Shell database with `519` documents and made it the active workspace. This is expected manual state, not leaked smoke data.
