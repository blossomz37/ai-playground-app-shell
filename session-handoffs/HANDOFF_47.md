# Session Handoff 47 - Project Import And Lifecycle

_Session: 2026-06-05 - Slice: Plan 32 Project import and lifecycle_

## What Changed

- Added shell-owned workspace lifecycle methods in `app-shell/src/main/core/workspaces.ts`:
  - `list({ includeArchived? })`
  - `importFolder({ root, name?, type? })`
  - `duplicate(id, { name? })`
  - `archive(id)`
  - `restore(id)`
  - `delete(id)`
- Folder import recursively imports `.md`, `.markdown`, and `.txt`, skips unsupported files, creates `folder` documents for directories, creates `chapter` documents for files, stores content in SQLite, records `sourcePath`, and stores SHA-256 `sourceChecksum` for files.
- Duplicate copies documents, document versions, and workspace-scoped module state settings. It intentionally does not copy jobs, AI run history, AI conversations/templates/providers, or transient run data.
- Delete is database-only: it removes workspace-owned app rows and module state keys, never source folders/files. If the active or last non-archived workspace is removed, the service switches to another active workspace or creates a replacement default workspace.
- Exposed the lifecycle methods through shared types, IPC, preload, and the browser fallback shell.
- Updated the renderer store with active/archived workspace list handling plus import/duplicate/archive/restore/delete actions.
- Reworked `WorkspaceSwitcher.svelte` into the project management popover requested by Plan 32.
- Added `SHELL_CAPTURE_WORKSPACE_IMPORT_ROOT` capture smoke support in `app-shell/src/main/capture/evidence.ts`.

## Decisions

- Kept this slice shell-owned, not a module.
- Kept sync/disconnect and unsupported-file routing out of scope.
- Duplicate reuses the original root path as provenance metadata and does not copy files on disk.
- Restore switches to the restored project because the restore action is a deliberate project selection from the archived section.
- The smoke hook self-cleans generated import/duplicate workspaces after validation.

## Evidence

- Svelte autofixer clean for `WorkspaceSwitcher.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- Smoke fixture: `/tmp/app-shell-lifecycle-fixture.phPuXU`
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
- Confirmed no `Lifecycle Smoke%` workspace rows remained afterward.
- Confirmed `shell.activeWorkspaceId` was restored to `ws-default`.
- Confirmed fixture source files still existed after database delete.
- Screenshot evidence: `implementation/screenshots/project-import-lifecycle-after-2026-06-05.png`.

## Cleanup Note

- An earlier smoke run briefly left `Lifecycle Smoke Import Copy` in the real App Shell DB because `HOME=<tmp>` did not isolate Electron `app.getPath('userData')` on macOS. That generated workspace and its rows were removed manually, and `shell.activeWorkspaceId` was restored to `ws-default`. Final smoke runs now self-clean.

## Next Recommended Action

- Commit this slice as one logical unit if desired: Plan 32 implementation, screenshot, plan outcome, orientation updates, and this handoff.
- Next slice is not selected. Start from this handoff, `implementation/plans/32-project-import-and-lifecycle.md`, and live repo status before choosing the next narrow pass.
