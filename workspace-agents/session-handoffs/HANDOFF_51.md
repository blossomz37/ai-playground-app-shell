# Session Handoff 51 - Assets Database Library Foundation

_Session: 2026-06-05 - Slice: Plan 36 Assets database library foundation_

## What Changed

- Added SQLite asset tables:
  - `assets`
  - `asset_tags`
  - `asset_workspace_links`
  - `asset_document_links`
- Added `app-shell/src/main/core/assets.ts` for DB-backed asset import/list/open/update/archive/restore/delete/export.
- Extended `window.shell.assets` through shared types, IPC, preload, and browser fallback.
- Replaced settings-backed Assets persistence with a DB-backed shared state slice.
- Updated Assets nav/main/inspector for import, export, archive, restore, database-only remove, comments, tags, and archived records.
- Workspace duplicate now copies asset workspace links; workspace delete removes only links.
- Added `SHELL_CAPTURE_ASSETS_DB_SMOKE=1` evidence using:
  - `/Users/carlo/Github/app-shell-project/sample-assets-import`
  - `/Users/carlo/Github/app-shell-project/sample-assets-export`

## Decisions

- Assets are global app records with workspace/document links.
- Original files remain external source/provenance files.
- Asset delete removes database records only and never deletes source files.
- Audio and EPUB deep parsing remains a future slice.
- Export writes selected source files plus `assets-manifest.json`; it does not mutate source files.

## Evidence

- Svelte autofixer clean for Assets `NavView.svelte`, `MainView.svelte`, and `InspectorView.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `git diff --check`
- Smoke assertions:
  - `importedCount: 7`
  - `workspaceLinked: true`
  - `metadataPersisted: true`
  - `checksumPersisted: true`
  - `fileStatsPersisted: true`
  - `commentsPersisted: true`
  - `tagsPersisted: true`
  - `persistedAfterRelist: true`
  - `exportedFilesExist: true`
  - `manifestExists: true`
  - `manifestAssetCount: 2`
  - `hiddenAfterArchive: true`
  - `archivedAfterArchive: true`
  - `restored: true`
  - `visibleAfterRestore: true`
  - `dbDeleted: true`
  - `sourceExistsAfterDatabaseDelete: true`
  - `cleanupScheduled: true`
- Capture cleanup deleted generated DB asset rows and sample export artifacts.
- Screenshot evidence: `implementation/screenshots/assets-db-library-foundation-after-2026-06-05.png`.

## Next Recommended Action

- Commit Plan 36 as its own logical unit if preserving the feature sequence cleanly.
- Strong follow-up candidates are audio metadata parsing, EPUB metadata/cover extraction, asset-document linking UI, or asset search/filtering.
