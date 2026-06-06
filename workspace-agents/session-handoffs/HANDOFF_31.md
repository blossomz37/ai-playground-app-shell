# Session Handoff 31 - Documents Tree Drag-Drop And Sort

_Session: 2026-06-05 · Slice: Documents tree drag/drop, manual order, and sort modes_

## What Changed

- Added shell-owned document movement with `documents.move({ id, parentId, sortOrder })`.
- Wired movement through the full shell pipeline: core SQLite documents service, IPC, preload, renderer registry, `ModuleContext`, shared shell contracts, and browser preview shell.
- The core move path now rejects missing/archived documents, cross-workspace parents, no-op moves, and parent-into-descendant moves.
- Moving a document normalizes source and destination sibling `sortOrder` values and emits `documents:changed` for affected rows.
- Extended `DocumentsStateSlice` with whole-tree `sortMode` persisted in shell settings:
  - `manual` uses SQLite `sortOrder`;
  - `alphabetical` uses natural title order;
  - `date` uses `updatedAt` newest-first.
- Added `moveDoc(sourceId, targetId, placement)` for `before`, `after`, and `inside` moves.
- Dragging while sorted Alphabetical or Date switches back to Manual and persists the visible order before applying the requested move.
- Updated `NavView.svelte` with:
  - a Documents header sort icon/menu;
  - draggable tree rows;
  - pointer-drag fallback for the app/browser gesture path;
  - before/after/inside drop indicators;
  - descendant-drop rejection toasts.
- Preserved the prior context-menu, inline rename, title-click open, icon-click expand, and dirty editor draft behavior.
- Updated `3-module-contract.md` so the documented `ctx.documents` API includes `move`.

## Evidence

- Svelte autofixer clean on `NavView.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `git diff --check`
- Browser-preview smoke:
  - dragged `Untitled Scene 2` before `Untitled Scene`;
  - dragged `Untitled Folder` inside the chapter and confirmed its tree level changed;
  - tried moving a parent into its descendant and got `Cannot move a document inside itself.` without tree corruption;
  - switched Manual, Alphabetical, and Date sorts and confirmed display order changed without losing Manual order;
  - dragged while in Alphabetical and confirmed the sort button returned to Manual with the new order;
  - confirmed unsaved editor text survived moving the active document and a different inactive document.
- Screenshot evidence: `implementation/screenshots/documents-tree-drag-sort-after-2026-06-05.png`

## Notes

- The browser-preview smoke uses the renderer's in-memory preview shell. The Electron app path uses SQLite through IPC and the same shared Documents state.
- The screenshot file exists locally under `implementation/screenshots/`; screenshot files appear ignored by git status in this checkout.
- No keyboard-based drag/reorder was added.
