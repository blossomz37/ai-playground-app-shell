# Assets Project/Document Links V1

## Goal
Add editable asset associations for Project and Document targets in the Assets inspector while keeping source and technical metadata read-only.

## Anchor
- Assets module database foundation from `workspace-agents/implementation/plans/36-assets-database-library-foundation.md`.
- Existing SQLite tables: `asset_workspace_links` and `asset_document_links`.
- Module boundary stays intact: the shell API exposes asset link operations; the Assets inspector owns only the UI interaction.

## Implemented
- Added minimal asset link methods to the shared `ShellApi`, preload bridge, IPC handlers, and main-process asset service:
  - `addWorkspaceLink`, `updateWorkspaceLink`, `removeWorkspaceLink`
  - `addDocumentLink`, `updateDocumentLink`, `removeDocumentLink`
- Added validation for V1 controlled relationship values:
  - Project roles: `reference`, `cover`, `research`, `marketing`, `moodboard`, `other`
  - Document relations: `reference`, `illustrates`, `source`, `cover`, `research`, `other`
- Extended `AssetsStateSlice` so link mutations refresh the selected `AssetRecord`.
- Replaced passive Assets inspector link counts with editable Project and Document rows.
- Added an Obsidian-style document typeahead that searches the current workspace document store by title/kind and supports Arrow keys, Enter, and Escape.
- Kept asset source/technical metadata read-only; label, tags, and comments remain editable as before.
- Added capture-only setup for deterministic screenshot evidence with temporary asset/document rows and cleanup.

## Files / Areas Touched
- `app-shell/src/shared/module-contract.ts`
- `app-shell/src/main/core/assets.ts`
- `app-shell/src/main/ipc.ts`
- `app-shell/src/preload/index.ts`
- `app-shell/src/shared/state/assets-state.ts`
- `app-shell/src/renderer/src/modules/module-state-registry.ts`
- `app-shell/src/renderer/src/modules/assets/state.ts`
- `app-shell/src/renderer/src/modules/assets/InspectorView.svelte`
- `app-shell/src/renderer/src/browser-shell.ts`
- `app-shell/src/main/capture/evidence.ts`

## Evidence
- `workspace-agents/implementation/screenshots/asset-links-project-after-2026-06-06.png`
- `workspace-agents/implementation/screenshots/asset-links-document-typeahead-after-2026-06-06.png`
- `workspace-agents/implementation/screenshots/asset-links-linked-document-after-2026-06-06.png`

Capture smoke confirmed:
- Project role persisted as `cover`.
- Typeahead narrowed to `Chapter - Capture Research Note`.
- Linked document row persisted with relation `illustrates`.
- Temporary asset/document rows were cleaned up after capture.

## Validation
- Svelte autofixer clean for `InspectorView.svelte`.
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot capture smoke with `SHELL_CAPTURE_ASSET_LINKS_STATE=project|typeahead|linked`.
- Post-capture SQLite cleanup check returned zero temp capture documents and zero temp capture assets.

## Out of Scope
- No new database schema.
- No character/location/series/campaign/custom entity associations.
- No long document dropdowns.
- No source file write-back or source metadata editing.
- No saved asset-link presets or multi-workspace link management UI beyond the current project row.
