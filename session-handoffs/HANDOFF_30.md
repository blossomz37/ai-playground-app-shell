# Session Handoff 30 - Document Tree Context Actions

_Session: 2026-06-05 · Slice: Documents tree right-click create/rename/archive_

## What Changed

- Made shell context menu items carry `args`, and `ContextMenu.svelte` now dispatches them through `executeCommand`.
- Added functional renderer-side Documents commands for:
  - `documents.newChapter`
  - `documents.newScene`
  - `documents.newFolder`
  - `documents.rename`
  - `documents.archive`
- Added inline rename in `NavView.svelte` with Enter save, Escape cancel, blank-title rejection, and blur save when changed.
- Extended the shell-owned document API across `ShellApi`, preload, IPC, browser preview shell, renderer module-state registry, `ModuleContext`, and core documents service.
- Added deterministic create placement with sibling sort-order shifting in SQLite.
- Added recursive soft archive through `documents.archive(id, { recursive: true })`; archived rows remain in SQLite and disappear from active lists.
- Forwarded `documents:changed` events from main to renderer so document pipeline changes refresh subscribed renderer state.
- Extended the shared Documents state slice to:
  - create documents with target-aware placement and unique default names;
  - preserve dirty in-memory drafts across document switches;
  - save dirty active content before archiving the active document;
  - repair selection after active archive;
  - remove archived subtrees immediately.

## Evidence

- `npm run audit:contrast`
- `npm run typecheck`
- `npm run build`
- Svelte autofixer clean on `NavView.svelte` and `ContextMenu.svelte`
- Screenshot evidence: `implementation/screenshots/documents-context-actions-after-2026-06-05.png`
- Browser-preview smoke:
  - right-click chapter -> New Scene created a child scene and selected it;
  - right-click scene -> Rename showed inline input and committed the new title;
  - right-click renamed scene -> Archive removed it and selected the chapter;
  - unsaved editor text survived create/select-away/select-back.

## Notes

- Existing Plan 26 edits and `HANDOFF_29.md` were already present in the dirty worktree; they were preserved.
- The screenshot file exists locally under `implementation/screenshots/`; this screenshot path appears ignored by git status in the current checkout.
- The browser-preview smoke uses the renderer's in-memory `browser-shell` API, while the Electron app path uses SQLite through IPC.
- Main-process fallback command handlers now show tree-availability toasts for non-interactive execution; the functional flows are renderer-owned because they need live selection, draft, and tree state.
