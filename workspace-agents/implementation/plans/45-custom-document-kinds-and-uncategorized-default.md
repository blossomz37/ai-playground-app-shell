# Custom Document Kinds And Uncategorized Default

## Summary

Rework document classification so folder behavior is structural and file kind is optional user taxonomy. The final model should support true uncategorized documents, workspace-editable kind options, and stable Table View bulk actions without forcing every file into `chapter`, `scene`, or `plan`.

This should land as a multi-slice implementation under a new plan artifact:

`workspace-agents/implementation/plans/45-custom-document-kinds-and-uncategorized-default.md`

## Slice 1 — Schema And Model Split

- Add a structural document field:
  - `nodeType: "folder" | "document"`
  - `kind: string | null`
- Rebuild/migrate the SQLite `documents` table so `kind` is nullable.
  - Existing `kind = "folder"` becomes `nodeType = "folder"`, `kind = null`.
  - Existing non-folder rows become `nodeType = "document"`, preserving their current `kind`.
  - Since current DB data is not important, validation may wipe/rebuild the local dev DB, but committed code should still include a safe migration path.
- Update shared types and document API params:
  - `Doc.kind` becomes `string | null`.
  - Add `DocumentNodeType`.
  - Add `DocumentKindOption`.
  - `documents.update(..., { kind: null })` clears a file kind.
  - `documents.create(...)` supports `nodeType` plus optional nullable `kind`.
- Replace behavior checks that currently rely on `kind === "folder"` with `nodeType === "folder"`.
  - Archive, duplicate, delete, export, tree expansion, and drag behavior must use `nodeType`.
  - File-only metadata actions must use `nodeType === "document"`.

## Slice 2 — Kind Settings State

- Store workspace-scoped custom file kinds in `shell_settings`.
  - Recommended key: `documents.<workspaceId>.kindOptions`.
  - Value shape: `DocumentKindOption[]`, where each option has `{ id, label }`.
- Default configured kinds for a fresh workspace:
  - `chapter`, `scene`, `plan`, `note`, `research`, `character`, `setting`, `outline`.
- Treat `null` kind as a reserved virtual option:
  - Internal value: `null`.
  - UI label: `Uncategorized`.
  - It is always available and cannot be deleted.
- Add renderer store helpers:
  - load kind options for the active workspace
  - add kind
  - rename kind label
  - remove kind option
- Removing a custom kind only removes it from settings.
  - Existing documents using that kind keep the raw value and continue to appear as an observed kind until changed.
  - This avoids hidden data mutation and keeps deletion safe.
- Workspace duplicate/delete should copy/delete the workspace kind settings alongside existing workspace-scoped state.

## Slice 3 — Document Creation And Import Defaults

- Change default new file creation to uncategorized:
  - Add or surface `New Document` as the default file action.
  - `New Document` creates `nodeType = "document"`, `kind = null`.
  - `New Folder` creates `nodeType = "folder"`, `kind = null`.
- Keep `New Chapter` and `New Scene` as convenience commands only if they explicitly set that kind.
- Update imported markdown/text files:
  - directories import as folders
  - files import as documents with `kind = null`
- Update default titles:
  - folder: `Untitled Folder`
  - uncategorized document: `Untitled Document`
  - explicitly kinded documents may use the configured kind label, e.g. `Untitled Chapter`.

## Slice 4 — Settings UI

- Add a compact `Document Kinds` section to the existing Settings modal.
- UI requirements:
  - Show `Uncategorized` as locked/default.
  - Show configured workspace kind options with editable labels.
  - Add a new kind from a text input.
  - Remove a configured kind option with a non-destructive action.
  - Prevent blank labels and duplicate IDs.
- Slug behavior:
  - Adding `Research Note` creates id `research-note`.
  - If the id exists, append a numeric suffix.
  - Renaming changes only the label, not the id.
- Keep the UI restrained and consistent with existing settings sections.

## Slice 5 — Documents Inspector And Table View

- Documents Inspector:
  - Folders show structural type `Folder`; file kind controls are disabled or hidden for folders.
  - Documents show a kind select with `Uncategorized` plus configured and observed kinds.
  - Selecting `Uncategorized` writes `kind = null`.
- Table View:
  - Kind column displays `Uncategorized` for `null`.
  - Kind filter includes `Uncategorized`, configured kinds, and observed legacy/custom values.
  - Bulk kind select includes `Uncategorized` plus configured/observed file kinds.
  - Applying `Uncategorized` in bulk clears `kind` to `null`.
  - Folder rows remain skipped for file-kind metadata actions.
- Sorting by kind should place `Uncategorized` consistently, then sort labels alphabetically.

## Slice 6 — Test And Evidence Pass

- Add or extend a capture smoke for document kinds:
  - create uncategorized document
  - create folder
  - set kind to a configured value
  - clear kind back to `null`
  - verify folder behavior still uses `nodeType`
  - verify imported files default to `kind = null`
- Required commands from `app-shell/`:
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`
  - Svelte autofixer on touched `.svelte` files
- Required screenshots:
  - `workspace-agents/implementation/screenshots/document-kinds-settings-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/document-kind-uncategorized-inspector-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/table-kind-uncategorized-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/table-bulk-kind-uncategorized-after-2026-06-06.png`
- Validation scenarios:
  - Fresh/rebuilt DB starts cleanly.
  - Existing migrated DB starts cleanly.
  - New document defaults to uncategorized.
  - Imported files default to uncategorized.
  - Folder archive/duplicate/delete/export still works recursively.
  - Bulk kind can set a configured kind and clear to uncategorized.
  - Table filters include uncategorized and custom observed kinds.
  - Workspace duplicate preserves kind settings.
  - Workspace delete removes copied workspace kind settings.
  - Existing Pass 1/2 bulk actions still work.

## Assumptions And Defaults

- `folder` is no longer a document kind; it is a structural `nodeType`.
- The database may be rebuilt during development validation, but committed code should still migrate safely.
- `Uncategorized` is the UI label for `kind = null`.
- Custom kind settings are workspace-scoped, not global.
- Kind option deletion is non-destructive and does not rewrite existing documents.
- No advanced taxonomy features in this pass: no colors, icons, nesting, presets, per-module taxonomies, or source-file inference.
- Final implementation should commit after each passing slice or at minimum leave each slice independently testable before the final commit.
