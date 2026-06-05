# Documents Tree Drag-Drop And Sort

## Summary

Add drag-and-drop reordering/moving for every Documents tree node, plus a whole-tree sort menu with `Manual`, `Alphabetical`, and `Date` modes. Manual mode persists per-sibling `sortOrder` in SQLite. Alphabetical and Date are display sorts only. Dragging while in a non-manual mode switches the tree to Manual and persists the resulting order.

## Anchor

- Shell primitive: Documents (`1-shell-spec.md` section 3).
- Module boundary: Documents UI contributes tree behavior, but persistence stays shell-owned through `window.shell.documents` / `ctx.documents`.
- Prior slice: `27-document-tree-context-actions.md` added functional create/rename/archive and dirty draft preservation. Preserve those behaviors.

## Approach

1. Add a shell-owned `documents.move({ id, parentId, sortOrder })` API.
   - Reject missing documents, archived targets, cross-workspace parents, no-op moves, and moving a node into its own descendant.
   - Update `parentId`, normalize `sortOrder` in the source and destination sibling groups, and emit `documents:changed` for affected rows.
2. Extend the shared Documents state slice.
   - Add `sortMode: 'manual' | 'alphabetical' | 'date'`.
   - Persist sort mode in shell settings under a Documents-specific key.
   - Build `docTree` by manual `sortOrder`, natural title order, or `updatedAt` newest-first.
   - Add `moveDoc(sourceId, targetId, placement)` where placement is `before`, `after`, or `inside`.
3. Update `NavView.svelte`.
   - Add a sort icon/menu in the Documents header.
   - Make rows draggable and show before/after/inside indicators.
   - Allow every document kind to receive children.
   - Keep existing icon expand, title open, inline rename, context menu, and dirty draft behavior.
4. Validate with Svelte autofixer, app checks, browser/Electron smoke, and screenshot evidence.

## Validation

- `npm run audit:contrast`
- `npm run typecheck`
- `npm run build`
- Svelte autofixer for `NavView.svelte`
- Browser/Electron smoke:
  - drag scene before/after another scene;
  - drag a node inside another node;
  - reject parent into descendant;
  - switch sort modes;
  - drag from non-manual sort and verify Manual mode;
  - confirm unsaved editor text survives moving active and inactive documents.
- Screenshot evidence: `implementation/screenshots/documents-tree-drag-sort-after-2026-06-05.png`

## Out Of Scope

- Keyboard drag/reorder.
- Multi-select/bulk moves.
- Undo/redo for moves.
- Per-folder sort modes.
- Dragging external filesystem files into the tree.

## Implementation Outcome

Implemented on 2026-06-05.

- Added shell-owned `documents.move({ id, parentId, sortOrder })` through core SQLite documents, IPC, preload, `ModuleContext`, the shared shell contract, the renderer registry, and browser preview shell.
- Extended the shared Documents state with persisted whole-tree sort mode, recursive manual/alphabetical/date tree sorting, and `moveDoc(sourceId, targetId, placement)`.
- Updated the Documents navigation tree with a sort icon/menu, native drag/drop handling, pointer-drag fallback handling, before/after/inside drop indicators, descendant rejection, and active/draft preservation.
- Updated `3-module-contract.md` so the documented `ctx.documents` API includes `move`.

Validation completed:

- Svelte autofixer clean for `NavView.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `git diff --check`
- Browser-preview smoke verified scene reorder, node inside-drop, descendant-drop rejection, Alphabetical/Date/Manual sort display, dragging from Alphabetical back to Manual, and unsaved editor text surviving active/inactive moves.
- Electron screenshot evidence captured at `implementation/screenshots/documents-tree-drag-sort-after-2026-06-05.png`.
