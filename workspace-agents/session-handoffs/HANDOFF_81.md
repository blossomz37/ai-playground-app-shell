# Session Handoff 81 - Plan 69 Projects Hub completed

_Session: 2026-06-26 - Branch: `codex/projects-hub`_

## Summary

Implemented Plan 69, First-Class Projects Hub, on a feature branch. This moves
workspace/project management into a shell-owned top-level Projects surface while
leaving the old switcher as a compact quick switcher.

Major changes:
- Added renderer pseudo module `shell.projects` with rail entry, navigation
  filters, main index, and inspector/detail/edit panel.
- Added workspace metadata schema fields: `description`, `status`, and
  `metadataJson`.
- Added `workspace:update` and `workspace:stats` across shared contract, main
  IPC/service, preload, renderer store, and browser fallback.
- Added editable title, type, root, description, and status.
- Added derived project stats for documents, archived documents, words, assets,
  conversations, prompt templates, and jobs.
- Reduced `WorkspaceSwitcher` to fast switching plus Manage Projects.
- Added command-palette entries for opening Projects, new project, and import
  folder.
- Added Projects capture hooks for search/edit/create/update evidence.

## Evidence

- `workspace-agents/implementation/screenshots/uiux-fc-projects-index-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-projects-empty-filter-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-projects-edit-form-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-projects-metadata-updated-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-projects-compact-switcher-after-2026-06-26.png`

## Runtime Proof

- First `SHELL_CAPTURE_MODULE=shell.projects` launch ran the workspace migration
  against the local SQLite DB and captured the populated Projects index.
- Second launch against the same DB completed cleanly, proving the migration is
  a no-op after columns exist.
- Direct `sqlite3` inspection confirmed `workspaces.description`,
  `workspaces.status`, and `workspaces.metadataJson`.
- Direct SQLite counts matched visible stats for seeded workspaces:
  `the-skin-youre-in`, `dead-acre`, and `UIUX FC Evidence 2026-06-26`.
- UI-driven update through the Projects edit form persisted the evidence project
  as `status=paused` with description `Evidence metadata update via Projects
  Hub.`

## Validation

- Svelte autofixer:
  - `app-shell/src/renderer/src/shell/projects/ProjectsMainView.svelte`
  - `app-shell/src/renderer/src/shell/projects/ProjectsInspectorView.svelte`
  - `app-shell/src/renderer/src/shell/projects/ProjectsNavView.svelte`
  - `app-shell/src/renderer/src/shell/WorkspaceSwitcher.svelte`
- `cd app-shell && npm run typecheck`
- `cd app-shell && npm run build`
- `git diff --check`
- Multiple runtime launches via `SHELL_CAPTURE`.

## Notes

- `UIUX FC Evidence 2026-06-26` was intentionally left with `status=paused` and
  the evidence description so persistence remains visible in the local DB.
- Archived projects remain controlled by `archivedAt`; `status` is independent.
- Rich author-specific metadata such as genre, deadline, series, tags, and
  target words remains deferred and should use `metadataJson` only when real
  workflows demand it.

## Next Step

No Plan 69 blocker remains. Before starting any future project taxonomy or rich
metadata expansion, define the contract delta first because it will touch the
workspace schema/API surface again.
