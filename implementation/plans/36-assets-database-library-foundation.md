# Plan 36 - Assets Database Library Foundation

## Summary

Move Assets from workspace-scoped settings snapshots into SQLite so it can grow into a durable multi-format library. Assets are global app records linked to workspaces/documents, while original files remain external source files.

## Goal

The Assets module can import files into a database-backed catalog, preserve file metadata, edit comments/tags, archive/restore records, delete database records without deleting source files, and export selected assets plus a manifest.

## Key Changes

- Add SQLite tables:
  - `assets`
  - `asset_tags`
  - `asset_workspace_links`
  - `asset_document_links`
- Add `app-shell/src/main/core/assets.ts` as the main-process asset repository/service.
- Extend `window.shell.assets` through shared types, IPC, preload, and browser fallback.
- Replace settings-backed Assets persistence with DB-backed `AssetsStateSlice` loading per workspace.
- Add active/archived Assets nav sections and restore controls.
- Add comments/tags editing in the Assets inspector.
- Export selected source files into a folder with `assets-manifest.json`.
- Copy workspace links when duplicating a workspace; remove workspace links during database-only workspace delete.

## Validation Targets

- Sample import folder: `/Users/carlo/Github/app-shell-project/sample-assets-import`
- Sample export folder: `/Users/carlo/Github/app-shell-project/sample-assets-export`
- Screenshot evidence: `implementation/screenshots/assets-db-library-foundation-after-2026-06-05.png`

## Out Of Scope

- Managed app-owned asset storage.
- Audio/EPUB deep metadata parsing.
- Asset FTS/search.
- File watcher sync or broken-link repair.
- Duplicate-resolution UI.
- Deleting source files.

## Outcome - 2026-06-05

Implemented.

- Assets now persist in SQLite with global asset records plus workspace/document link tables.
- Import records extension, MIME/media type, size, created/modified timestamps, checksum, thumbnails/metadata where available, source path, comments, and tags.
- Assets list is scoped to the active workspace through `asset_workspace_links`.
- Workspace duplicate copies asset workspace links to the duplicated workspace without copying source files.
- Workspace database-only delete removes asset links without deleting global assets or source files.
- Assets UI now has DB-backed import/export/archive/restore/delete-record actions, inline archived section, and editable inspector comments/tags.
- Export writes copied source files plus `assets-manifest.json`.

Smoke evidence:

```text
[SHELL_CAPTURE_ASSETS_DB_SMOKE] importedCount=7 workspaceLinked=true metadataPersisted=true checksumPersisted=true fileStatsPersisted=true commentsPersisted=true tagsPersisted=true persistedAfterRelist=true exportedFilesExist=true manifestExists=true manifestAssetCount=2 hiddenAfterArchive=true archivedAfterArchive=true restored=true visibleAfterRestore=true dbDeleted=true sourceExistsAfterDatabaseDelete=true cleanupScheduled=true
[SHELL_CAPTURE_ASSETS_DB_CLEANUP] deletedAssetIds=7
[SHELL_CAPTURE_ASSETS_EXPORT_CLEANUP] deleted exported sample files and manifest
```

Validation:

- Svelte autofixer clean for Assets `NavView.svelte`, `MainView.svelte`, and `InspectorView.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `git diff --check`
