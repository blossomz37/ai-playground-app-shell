# Session Handoff 48 - Import Frontmatter Inspector

_Session: 2026-06-05 - Slice: Plan 33 import frontmatter inspector_

## What Changed

- Added `documents.metadataJson` and shared document/source metadata typing.
- Added `app-shell/src/main/core/frontmatter.ts`, a conservative shell-owned parser for first-line `---` frontmatter blocks.
- Folder import now strips supported frontmatter from saved document body content and stores normalized metadata JSON while keeping `sourcePath` and checksum provenance behavior from Plan 32.
- Workspace duplicate now copies `metadataJson`.
- Documents inspector now shows `Source Metadata` only when imported metadata exists, keeping source timestamps separate from app created/updated timestamps.
- Capture smoke now validates metadata persistence, duplicate metadata, frontmatter stripping, related-list parsing, word-count parsing, no-frontmatter unchanged behavior, unsupported skips, archive/restore, and cleanup.

## Decisions

- Kept metadata in one generic JSON column instead of adding per-key columns.
- Kept parsing intentionally small and tolerant instead of adding a YAML dependency.
- Kept source metadata read-only in this slice.
- Kept database-only delete behavior unchanged: source files are never deleted.

## Evidence

- Svelte autofixer clean for `InspectorView.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `git diff --check`
- Smoke fixture: `/tmp/app-shell-frontmatter-fixture.qVNGd4`
- Final smoke log:
  - `importedDocCount: 8`
  - `duplicateDocCount: 8`
  - `metadataPersisted: true`
  - `duplicateMetadataPersisted: true`
  - `frontmatterStripped: true`
  - `relatedCount: 4`
  - `importedWordCount: 3208`
  - `sourceStatus: revised draft`
  - `sourceDescription: Chapter 3 - She Should Have Been Left Outside`
  - `noFrontmatterUnchanged: true`
  - `unsupportedSkipped: true`
  - `sourcePathCount: 8`
  - `checksumCount: 5`
  - `archivedAfterArchive: true`
  - `cleanupScheduled: true`
- Confirmed no `Lifecycle Smoke%` workspace rows remained afterward.
- Confirmed fixture source files still existed after database-only cleanup.
- Screenshot evidence: `implementation/screenshots/import-frontmatter-inspector-after-2026-06-05.png`.

## Real Project Validation

- Tested `/Users/carlo/Github/eaw-novel-builder/projects/dead-acre` through `SHELL_CAPTURE_WORKSPACE_IMPORT_ROOT`.
- Imported `519` document rows: `416` file rows with checksums plus folder rows.
- Duplicate also produced `519` document rows.
- Metadata persisted, duplicate metadata persisted, and frontmatter was stripped from the selected imported body.
- Selected metadata document for screenshot: `chapter-01-plan`.
- Inspector showed source file, description, version, source created/modified dates, author, current word count, and `6` related paths.
- Generated smoke workspaces were cleaned up, active workspace was restored to `ws-76771f4f-6de9-4313-97fe-aa310ec7f8ed`, and source files remained in place.
- Screenshot evidence: `implementation/screenshots/dead-acre-import-frontmatter-after-2026-06-05.png`.
- `contentMatched` and `noFrontmatterUnchanged` were false only because those smoke fields are fixture-specific checks for `alpha`, `scene-note`, and `plain-note`.
- Carlo also tested import manually after the automated run. A persistent `dead-acre` workspace with `519` documents may remain active in the App Shell database; it is manual test state, not smoke cleanup leakage.

## Next Recommended Action

- Commit Plan 33 as one logical unit if desired. The screenshot file is under an ignored screenshots path and will need force-adding if it should be included.
- Next slice is not selected. Start from this handoff, `implementation/plans/33-import-frontmatter-inspector.md`, and live repo status before choosing another pass.
