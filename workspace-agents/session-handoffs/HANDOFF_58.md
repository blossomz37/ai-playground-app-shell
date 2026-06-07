# Session Handoff 58 - Documents Annotations, Compare, and Restore

_Session: 2026-06-07 - Slice: Plan 47 Documents close state, sidecar annotations, version restore, split editing, and read-only diff_

## What Changed

- Saved `workspace-agents/implementation/plans/47-documents-annotations-compare-restore.md`.
- Added shell-owned annotation persistence:
  - `document_annotation_sessions`
  - `document_annotations`
- Added shell/preload/shared document APIs for annotation sessions, annotation CRUD/lifecycle, and version restore.
- Added Documents open/close state so closing a document leaves the editor empty until a tree selection opens another document.
- Added selected-text annotation creation with JSON sidecar targets and ProseMirror decorations.
- Added annotation inspector lifecycle controls:
  - Active / Resolved / Orphaned filters
  - Edit
  - Resolve/Reopen
  - Soft delete
  - Jump to anchor when still anchorable
- Added snapshot restore actions:
  - Restore as copy
  - Replace current, with a safety snapshot first
- Added a non-persistent secondary editor in the Documents main pane.
- Added a read-only split diff toggle between the primary and secondary document.
- Added Plan 47 capture support in `app-shell/src/main/capture/evidence.ts` for repeatable UI evidence.
- Updated durable docs:
  - `docs/modules/documents.md`
  - `docs/architecture/modules-overview.md`
  - `CLAUDE.md`
  - `.agent/knowledge/WORKSPACE_ORIENTATION.md`

## Evidence

- `npm run typecheck`
- `npm run build`
- Screenshots:
  - `workspace-agents/implementation/screenshots/documents-close-state-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/documents-annotation-create-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/documents-annotation-inspector-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/documents-version-restore-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/documents-split-editor-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/documents-split-diff-after-2026-06-07.png`

## Capture Notes

- Plan 47 screenshots use `SHELL_CAPTURE_DOCUMENT_PLAN47_STATE`.
- The capture hook creates temporary Plan 47 documents, versions, and annotations, captures the UI state, and cleans up the generated rows afterward.
- Annotation and diff screenshots may show the inspector when prior persisted layout state has the inspector visible; this is acceptable evidence because the target UI state is visible.

## Not Built

- No standalone Annotations module.
- No cross-surface annotation support for Web, PDFs, Assets, or Journal.
- No XML annotation storage.
- No annotation export/import.
- No editable diff/merge/patch workflow.
- No tabbed document UI or shell-wide split-pane primitive.
- No persistence for split editor state across restart.

## Notes for Next Agent

- `app-shell/src/renderer/src/modules/documents/MainView.svelte` now owns primary editor, secondary editor, annotation decoration, and diff UI. If this grows further, extract a focused `DocumentEditorPane` only if it reduces real duplication.
- Annotation records are independent from document versions by design. Version restore does not restore or delete annotations.
- Replace-current version restore creates a `Before version restore` safety snapshot.
- The unrelated untracked file `.ideas/party-mode.md` was present during this work and was not touched.
