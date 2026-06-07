# Documents Search And Replace

## Summary

Add a Documents-room find/replace panel for the active editor, plus project-wide search and guarded project-wide replace. The feature supports literal whole-word search and regex search, active-document or whole-project scope, replace current match, replace next match, and replace all. Escape closes the panel without clearing the last search state.

## Key Changes

- Add Documents commands:
  - `documents.find` with `CmdOrCtrl+F`.
  - `documents.replace` with `CmdOrCtrl+H`.
  - `documents.findNext`, invoked from the panel input with Enter and from an explicit Next button.
- Add a compact Documents search/replace panel in the Documents main view.
  - Controls: search input, replace input, `Document` / `Project` scope, `Word` / `Regex` mode, previous/next, replace, replace next, replace all.
  - Escape closes the panel, persists the last search state, and returns focus to the editor.
- Add framework-agnostic search helpers.
  - Word mode is escaped literal whole-word matching.
  - Regex mode validates the expression before matching.
  - Helpers return stable match ranges and counts for editor highlighting and project preview.
- Use TipTap/ProseMirror for active-document behavior.
  - Highlight all active-document matches.
  - Track the active match and scroll/select it.
  - Replacement updates the editor through existing document state so dirty/autosave behavior remains intact.
- Add project-wide search/replace over live SQLite document content.
  - Project results show affected document titles and match counts.
  - Selecting a project result opens that document and focuses the first match.
  - Project-wide replace all uses a preview-first confirmation before writing.
  - Confirmed project replace all saves the active dirty document first, updates affected documents through `documents.save`, and relies on existing document versions for recovery.
- Persist last search state per workspace using `documents.<workspaceId>.lastSearch`.

## Test Plan

- Run from `app-shell/`:
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`
  - Svelte autofixer on touched `.svelte` files.
- Validate scenarios:
  - Open with `CmdOrCtrl+F`, close with Escape, and reopen with prior search restored.
  - Word mode matches whole words and treats regex metacharacters literally.
  - Regex mode handles valid expressions and reports invalid regex without changing content.
  - Next/previous cycles active-document matches and scrolls/selects the active result.
  - Replace current changes one match and leaves the panel open.
  - Replace next changes the active match and advances.
  - Replace all in active document changes all current matches.
  - Project search lists affected documents and match counts.
  - Project-wide replace all requires preview confirmation and creates document versions through existing save behavior.
  - Active dirty document is saved before project-wide replace so DB content and editor state do not diverge.
- Required screenshot evidence:
  - `workspace-agents/implementation/screenshots/documents-search-panel-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/documents-regex-search-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/documents-project-replace-preview-after-2026-06-06.png`
  - `workspace-agents/implementation/screenshots/documents-search-restored-after-2026-06-06.png`

## Assumptions

- Project-wide replace uses preview-first confirmation.
- Last search state persists per workspace across app restarts.
- Word search means whole-word literal matching, not FTS ranking.
- Replacement is limited to live SQLite document content; imported/source files on disk are not modified.
- Archived documents are excluded.
- No saved search library, batch undo UI, cross-workspace search, source-file rewrite, or Command Palette redesign in this slice.

## Implementation Results

Completed on 2026-06-06.

- Added shared deterministic word/regex matching helpers with stable ranges, regex validation, and replacement support.
- Added Documents find/replace commands and keybindings for Find and Replace.
- Added a Documents search/replace panel with active-document mode, project mode, word/regex toggles, replace, replace next, replace all, Escape close, and per-workspace persisted search state.
- Added ProseMirror decorations for active-document match highlighting and active-match selection.
- Added preview-first project replace all over live document content using existing document save/version behavior.
- Added capture hooks for Documents search evidence states.

## Evidence

- `workspace-agents/implementation/screenshots/documents-search-panel-after-2026-06-06.png`
- `workspace-agents/implementation/screenshots/documents-regex-search-after-2026-06-06.png`
- `workspace-agents/implementation/screenshots/documents-project-replace-preview-after-2026-06-06.png`
- `workspace-agents/implementation/screenshots/documents-search-restored-after-2026-06-06.png`

Validation run from `app-shell/`:

```bash
npm run typecheck
npm run build
git diff --check
```

Svelte autofixer:

- `DocumentSearchPanel.svelte`: no issues, no suggestions after fixes.
- `MainView.svelte`: no issues, no suggestions after fixes.
