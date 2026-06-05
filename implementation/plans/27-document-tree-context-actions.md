# Document Tree Context Actions

## Summary

Make the Documents tree context menu functional for New Chapter, New Scene, New Folder, Rename, and Archive. These actions should operate on the document that was right-clicked, update SQLite through the shell-owned document pipeline, refresh the tree immediately, and preserve unsaved editor content.

## Anchor

- Shell primitive: Documents (`1-shell-spec.md` §3)
- Module boundary: Documents module contributes document kinds and UI, but persistence remains shell-owned through `ctx.documents` / `window.shell.documents`.
- Prior slice: `26-document-tree-icons-and-nested-documents.md` established nested document behavior and icon metadata. Preserve that no-caret icon-control model.

## Current State

- `NavView.svelte` shows the context menu on document icon/title right-click.
- `ContextMenu.svelte` executes only `item.id`; it does not pass target document context.
- `documents.newChapter` and `documents.newScene` exist as declared commands but main handlers only show placeholder toasts.
- `documents.newFolder`, `documents.rename`, and `documents.archive` are declared but have no functional path.
- Core documents already supports `list`, `open`, `save`, `update`, `create`, and `versions`.
- Core documents does not yet expose archive/unarchive or recursive archive behavior.

## Scope

Deliver these working actions from the right-click tree menu:

- **New Chapter**: create a chapter under the right-clicked folder, or as a sibling after a right-clicked non-folder document.
- **New Scene**: create a scene under the right-clicked chapter/plan/folder, or as a sibling after a right-clicked scene.
- **New Folder**: create a folder under the right-clicked folder, or as a sibling after a right-clicked non-folder document.
- **Rename**: edit the right-clicked document title.
- **Archive**: soft-archive the right-clicked document. If it has children, archive the whole subtree.

## Non-Goals

- Drag/drop reorder.
- Move document between parents.
- Undo/archive restore UI.
- Bulk archive management.
- Full modal system redesign.
- Full icon picker.
- Continuous Scrivener-style chapter view.

## Proposed Behavior

### Target Rules

- Right-click target is always the node whose icon/title was clicked.
- Context-menu actions receive the target document id.
- Command-palette execution without a target should use the active document when reasonable:
  - new chapter/new scene/new folder use active doc as target, or create at root if no active doc;
  - rename/archive require an active document and are disabled or show a clear toast if none.

### Create Placement

- Folder target:
  - new chapter/scene/folder becomes a child of the folder.
- Chapter or plan target:
  - new scene becomes a child of that document.
  - new chapter/folder becomes a sibling after the target.
- Scene target:
  - new scene becomes a sibling after the target.
  - new chapter/folder becomes a sibling after the target.
- Root/no target:
  - new chapter/folder creates at root.
  - new scene creates at root only if no better target exists; prefer active doc target when called from commands.

### Naming Defaults

- New chapter: `Untitled Chapter`
- New scene: `Untitled Scene`
- New folder: `Untitled Folder`
- If a sibling already uses that name, append ` 2`, ` 3`, etc.
- Rename should reject blank titles and preserve the old title.

### Selection And Expansion

- After create, select the new document.
- If the new document has a parent, expand the parent path so the new document is visible.
- After rename, keep the same document selected and preserve editor dirty state.
- After archiving the active document, select the nearest visible sibling if possible; otherwise select the parent; otherwise clear the editor.
- After archiving a non-active document, keep current active editor state intact.

## Implementation Plan

1. Extend context menu item payloads.
   - Add optional `args?: unknown[]` or `payload?: unknown` to `ContextMenuItem`.
   - Update `ContextMenu.svelte` so `executeCommand(item.id, ...item.args)` is supported.
   - In `NavView.svelte`, pass `{ targetDocumentId: node.id }` or the document id directly for each item.

2. Add renderer-level Documents actions.
   - Prefer renderer handlers for interactive actions because they need current tree state, active doc, dirty state, and selection.
   - Register `documents.newChapter`, `documents.newScene`, `documents.newFolder`, `documents.rename`, and `documents.archive` from the Documents nav/main state layer or a dedicated renderer action module.
   - Keep existing main-process placeholder handlers only as non-interactive fallback, or replace them with real non-UI-safe handlers if the needed API is available.

3. Extend the shared documents state slice.
   - Add `createDoc(params)` that calls `port.create`, inserts/reloads the returned doc, selects it, and emits.
   - Add `archiveDoc(id)` that calls `port.archive`, removes archived rows from state, repairs active selection, and emits.
   - Keep `updateDoc` as the rename path.
   - Add small pure helpers for target placement, next sort order, unique title, descendant detection, and nearest visible selection.

4. Extend the shell document API.
   - Add `documents.archive(id, options?: { recursive?: boolean })`.
   - Update `ShellApi`, preload, IPC, browser shell, `DocumentsPort`, and module-state registry.
   - Consider extending `create` with explicit `sortOrder` in the public API so sibling placement can be deterministic.

5. Implement core persistence.
   - `documents.create` should return the inserted row with `icon` included.
   - Add `documents.archive(id, { recursive })`:
     - set `archivedAt` and `updatedAt`;
     - recursively archive descendants when requested;
     - emit `documents:changed` for affected IDs or a workspace-level refresh event.
   - Keep archive as soft-delete only; no row deletion.

6. Add rename UI.
   - Minimal acceptable path: use a small inline rename input in the tree row for the target document.
   - Alternative acceptable path: a compact shell prompt/modal if one already exists by implementation time.
   - Avoid `window.prompt` if a lightweight in-app input can be implemented without broad modal work.
   - Escape cancels; Enter saves; blur can save only if the value changed and is nonblank.

7. Add menu state rules.
   - Disable Archive for already archived docs, though they should not appear in the active list.
   - Disable Rename during inline rename for another doc.
   - Keep context-menu labels simple; no explanatory in-app text.

8. Preserve icon/tree behavior from Plan 26.
   - No separate caret.
   - Icon controls expansion when children exist.
   - Title opens non-folder parent documents.
   - Custom document icons remain metadata and survive rename/archive/create flows.

## Files / Areas Touched

- `app-shell/src/renderer/src/store/contextmenu.ts`
- `app-shell/src/renderer/src/shell/ContextMenu.svelte`
- `app-shell/src/renderer/src/modules/documents/NavView.svelte`
- `app-shell/src/renderer/src/store/index.ts`
- `app-shell/src/shared/state/documents-state.ts`
- `app-shell/src/shared/module-contract.ts`
- `app-shell/src/preload/index.ts`
- `app-shell/src/main/ipc.ts`
- `app-shell/src/main/core/documents.ts`
- `app-shell/src/main/modules/documents/index.ts`
- `app-shell/src/renderer/src/browser-shell.ts`
- `session-handoffs/HANDOFF_30.md` after implementation

## Validation

Run from `app-shell/`:

```bash
npm run audit:contrast
npm run typecheck
npm run build
```

Run Svelte autofixer on changed Svelte files:

- `NavView.svelte`
- `ContextMenu.svelte`
- any new inline rename/modal component

Capture screenshot evidence:

- `implementation/screenshots/documents-context-actions-after-2026-06-05.png`

Manual/browser smoke:

- Right-click a folder and create a chapter, scene, and folder under it.
- Right-click a chapter with scenes and create a scene under it.
- Right-click a scene and create a sibling scene.
- Rename a folder, chapter, and scene; blank rename is rejected.
- Archive an inactive scene; active editor remains unchanged.
- Archive the active scene; next visible document selection is reasonable.
- Archive a parent with children; descendants disappear from the tree and no orphaned active selection remains.
- Create/rename/archive do not erase unsaved editor text in the active document.
- Created documents show the correct default page/folder icons and can accept the existing custom icon override later.

## Risks / Decisions

- **Command target transport**: context menu currently carries no args. This is the primary enabling change.
- **Archive refresh granularity**: current change events are document-id based. Recursive archive may be cleaner with a workspace/list refresh event, but keep the smallest change that avoids stale tree rows.
- **Sort order**: existing create defaults to `0`. This slice should make new item placement deterministic enough that repeated creates do not appear randomly.
- **Rename UX**: inline rename is preferable for a tree, but it must not destabilize row height or tree layout.

## Implementation Outcome - 2026-06-05

- Context menu items now carry command arguments, so right-click actions receive the clicked document id.
- Renderer-side Documents command handlers now create chapters/scenes/folders, start inline rename, and archive through the shell document API.
- `window.shell.documents` / `ctx.documents` now expose deterministic create placement and recursive soft archive.
- The shared Documents state slice now preserves in-memory dirty drafts across document switches and repairs selection after archive.
- Document change events are forwarded from main to renderer so shell-owned document pipeline updates can refresh the tree.
- Screenshot evidence: `implementation/screenshots/documents-context-actions-after-2026-06-05.png`.
- Validation passed: `npm run audit:contrast`, `npm run typecheck`, `npm run build`, Svelte autofixer for `NavView.svelte` and `ContextMenu.svelte`, browser-preview smoke for create -> rename -> archive and dirty draft restoration.
