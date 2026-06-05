# Document Tree Icons And Nested Document Opening

## Summary

Fix the Documents tree so parent documents remain openable, while the document icon controls child visibility. Add Notion-style document icons: default page icon for normal documents, folder icon for folders, and an optional per-document emoji override stored on the document row.

2026-06-05 follow-up: the separate caret was removed after review. Icons now serve as the expand/collapse control when a document has children; titles remain openable for non-folder documents.

## Key Changes

- Update the document model with nullable `icon TEXT` on `documents`, added through the existing migration helper. Extend `Doc` and `documents.update` so `icon?: string | null` can be saved or cleared.
- Change tree behavior so the document icon expands/collapses children and the document title opens the document. For `kind = folder`, title click can toggle children; for `chapter`, `scene`, `plan`, and future document kinds, title click opens the document even when it has children.
- Replace chapter/scene glyphs with a page-style default icon. Use folder default only for `kind = folder`; if `doc.icon` exists, show that emoji/text instead.
- Add a simple inspector field for custom icon: a small text input labeled `Icon`, accepting an emoji or short text; blank clears the override. Keep this minimal, no full icon picker.
- Remove or disable misleading unfinished context menu actions only if they interfere with this pass; otherwise leave command cleanup for a separate slice.
- Add/update a handoff after implementation, suggested file: `session-handoffs/HANDOFF_29.md`, summarizing the nested-doc tree behavior, `documents.icon` migration, tests, and screenshot evidence.

## Public Interfaces

- `Doc` gains `icon: string | null`.
- `ShellApi.documents.update` patch becomes `{ title?: string; kind?: string; icon?: string | null }`.
- Core `documents.update` must distinguish omitted `icon` from explicit clear:
  - omitted: keep current icon
  - non-empty string: save trimmed value
  - `null` or blank string: save `NULL`

## Test Plan

- Run from `app-shell/`: `npm run audit:contrast`, `npm run typecheck`, `npm run build`.
- Run Svelte autofixer on changed Svelte components.
- Screenshot evidence in Documents view showing:
  - Chapter with children has a caret and remains openable.
  - Scenes use page-style default icons.
  - A document with a custom emoji displays that emoji.
- Keyboard smoke:
  - Icon button expands/collapses when a document has children.
  - Document title opens the document.
  - Active nested document remains visible.
  - Icon field can set and clear an emoji without losing unsaved editor text.

## Handoff Notes

- Storage remains nested documents in SQLite: parent/child relationship is `documents.parentId`.
- Icon control means “has child documents,” not “is a folder.”
- Custom icons are document metadata, not content.
- Scrivener-style continuous chapter view remains future work; this pass only fixes the tree model and icon metadata.
- Existing untracked artifacts should remain untouched unless explicitly selected.
