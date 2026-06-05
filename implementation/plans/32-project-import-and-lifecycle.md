# Plan 32 — Project Import And Lifecycle

## Summary

Add a shell-owned project management slice for folder import, duplicate, archive/restore, and database-only delete. Current audit: the app is clean on `main`, `npm run typecheck` and `npm run build` pass, and the backend already has `workspaces.archivedAt` plus document provenance columns, but only `list/create/switch` are exposed through IPC/preload/UI.

## Key Changes

- Read `implementation/plans/32-project-import-and-lifecycle.md` before implementation, anchored to the Workspace primitive and Plan 12’s unfinished duplicate/archive scope.
- Extend `workspaceService` with:
  - `importFolder({ root, name?, type? })`: choose a folder, create a workspace, recursively import `.md`, `.markdown`, and `.txt` files into SQLite documents, and represent directories as `folder` documents.
  - `duplicate(id, { name? })`: copy documents plus workspace-scoped module settings; exclude jobs, AI runs/history, and transient run data.
  - `archive(id)`, `restore(id)`, `delete(id)`, and `list({ includeArchived? })`.
- Add shared/preload/IPC methods under `window.shell.workspace`: `importFolder`, `duplicate`, `archive`, `restore`, `delete`, and optional archived listing.
- Update the project menu UI in `WorkspaceSwitcher.svelte` into a compact management popover:
  - active project summary;
  - switchable active projects;
  - `New project`;
  - `Import folder`;
  - current-project actions: duplicate, archive, delete;
  - archived section with restore/delete.
- Keep delete database-only: remove workspace-owned app rows and shell settings for that workspace, but never delete the selected root folder or source files.
- On import, store `sourcePath` and SHA-256 `sourceChecksum`; copy file contents into `documents.content` because SQLite remains the editing source of truth. Future sync/disconnect is out of scope.

## Interface Details

- Import mapping:
  - directories become `kind: "folder"` documents;
  - markdown/text files become `kind: "chapter"` at import time;
  - unsupported files are skipped for v1 and can later route to Assets/import plugins.
- Sort order follows filesystem alphabetical order with folders before files.
- If the active project is archived or deleted, switch to the most recently opened non-archived project, or create the default workspace if none remains.
- Duplicate names default to `<original name> Copy`; duplicate roots can reuse the original root as provenance metadata but do not copy files on disk.
- Hard delete must require a confirmation UI and must be blocked for the last non-archived project unless the service can immediately create/switch to a replacement.

## Test Plan

- Run from `app-shell/`: `npm run typecheck`, `npm run build`, and `npm run audit:contrast`.
- Add a deterministic smoke import fixture outside app source during validation: nested folders, `.md`, `.markdown`, `.txt`, and unsupported files.
- Verify import creates the expected workspace, document tree, content, `sourcePath`, and `sourceChecksum`.
- Verify duplicate copies documents and workspace-scoped module settings but not jobs/AI run history.
- Verify archive hides a project from normal switching, restore returns it, and delete removes only database/app rows.
- Capture UI evidence with `SHELL_CAPTURE_OPEN_WORKSPACE_MENU=1 SHELL_CAPTURE=../implementation/screenshots/project-import-lifecycle-after-2026-06-05.png npm run start`.

## Assumptions

- “Project” maps to shell `Workspace`.
- V1 imports Markdown/text only.
- Delete is database-only and never removes files/folders from disk.
- Sync/disconnect is explicitly deferred to a later slice or plugin.

## Outcome - 2026-06-05

Implemented.

- Added shell-owned workspace lifecycle service methods for folder import, duplicate, archive, restore, database-only delete, and archived-aware listing.
- Folder import maps directories to `folder` documents, imports `.md`, `.markdown`, and `.txt` files as `chapter` documents, stores file content in SQLite, records `sourcePath`, and stores SHA-256 checksums for imported files.
- Duplicate copies workspace documents, document versions, and workspace-scoped module state keys; it intentionally does not copy jobs, AI runs/conversations/templates/providers, or other run history.
- Delete removes workspace-owned SQLite/app rows and module state keys only. It does not delete root folders or source files. If the active or last non-archived workspace is removed, the service switches to another active workspace or creates a replacement default workspace.
- Extended `window.shell.workspace` through shared types, preload, IPC, and the browser fallback.
- Reworked `WorkspaceSwitcher.svelte` into a compact project management popover with active summary, active project switching, new/import actions, duplicate/archive/database-delete actions, and archived restore/delete controls.
- Added capture-time workspace lifecycle smoke support via `SHELL_CAPTURE_WORKSPACE_IMPORT_ROOT`; the hook uses the public preload API and cleans up generated smoke workspaces after validation.

Validation:

- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- Svelte autofixer clean for `WorkspaceSwitcher.svelte`.
- Smoke fixture at `/tmp/app-shell-lifecycle-fixture.phPuXU` with nested folders, `.md`, `.markdown`, `.txt`, and unsupported `.json`.
- Final smoke log:
  - `importedDocCount: 7`
  - `duplicateDocCount: 7`
  - `folderTitles: ["Act One","Research","Scenes"]`
  - `fileTitles: ["alpha","beta","note","scene-note"]`
  - `contentMatched: true`
  - `unsupportedSkipped: true`
  - `sourcePathCount: 7`
  - `checksumCount: 4`
  - `archivedAfterArchive: true`
  - `deletedAfterDelete: true`
  - `duplicateDeletedAfterSmoke: true`
- Confirmed no `Lifecycle Smoke%` workspace rows remained afterward and `shell.activeWorkspaceId` was restored to `ws-default`.
- Confirmed fixture source files still existed after database delete.
- Screenshot evidence: `implementation/screenshots/project-import-lifecycle-after-2026-06-05.png`.
