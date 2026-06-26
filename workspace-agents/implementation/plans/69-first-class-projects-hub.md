# Plan 69 - First-Class Projects Hub

## Summary

Build a shell-owned Projects Hub so workspace/project management moves out of
the cramped switcher and into a dedicated top-level surface. The first version
adds a Projects rail item, searchable project list, derived stats, edit support
for project metadata, and a compact fast-switcher handoff to the hub.

## Key Changes

- Add shell-owned `shell.projects` UI, not a writing module.
- Extend workspace metadata with `description`, `status`, and `metadataJson`.
- Add workspace update and stats APIs.
- Keep `WorkspaceSwitcher` as a lightweight fast switcher with a "Manage
  projects" entry point.
- Validate with Svelte autofixer, typecheck, build, SQLite migration checks,
  runtime launch, and screenshots.

## Slices

1. Projects route/index: rail item, searchable/sortable list, existing actions.
2. Derived stats: documents, words, assets, chats, prompts, jobs.
3. Edit existing fields: name, type, root.
4. Metadata: description, status, metadata JSON migration and edit UI.
5. UX consolidation: switcher becomes fast switcher, commands/openers route to
   Projects Hub.

## Acceptance

- Projects Hub can browse, search, switch, duplicate, archive, restore, delete,
  create, and import projects.
- Project type is editable after creation.
- Description/status persist across restart.
- Stats match SQLite counts for seeded workspaces.
- Existing compact switcher still works for quick switching.
- No author-specific rich metadata is added beyond `metadataJson`.

## Outcome Log

### 2026-06-26 - Completed

Implemented on branch `codex/projects-hub`.

Delivered:
- Shell-owned `shell.projects` pseudo-surface with Projects rail entry,
  navigation filters, main index, and inspector/detail edit panel.
- Workspace metadata migration for `description`, `status`, and `metadataJson`.
- `workspace:update` and `workspace:stats` APIs across main, preload, shared
  contract, renderer store, and browser fallback.
- Editable project title, type, root, description, and status.
- Derived stats for docs, archived docs, words, assets, chats, prompts, and jobs.
- Compact `WorkspaceSwitcher` reduced to current project, quick switching, and
  Manage Projects handoff.
- Command palette entries for `Projects: Open Hub`, `Projects: New Project`, and
  `Projects: Import Folder`.
- Capture hooks for Projects search/edit/create/update evidence.

Evidence:
- `workspace-agents/implementation/screenshots/uiux-fc-projects-index-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-projects-empty-filter-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-projects-edit-form-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-projects-metadata-updated-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-projects-compact-switcher-after-2026-06-26.png`

Validation:
- Svelte autofixer clean for:
  - `app-shell/src/renderer/src/shell/projects/ProjectsMainView.svelte`
  - `app-shell/src/renderer/src/shell/projects/ProjectsInspectorView.svelte`
  - `app-shell/src/renderer/src/shell/projects/ProjectsNavView.svelte`
  - `app-shell/src/renderer/src/shell/WorkspaceSwitcher.svelte`
- `cd app-shell && npm run typecheck`
- `cd app-shell && npm run build`
- `git diff --check`
- Runtime launches through `SHELL_CAPTURE` against local SQLite DB.
- Migration verified by repeated launch and direct `sqlite3` inspection of
  `description`, `status`, and `metadataJson` columns.
- Direct SQLite stats counts verified for seeded workspaces; UI-driven metadata
  update persisted `UIUX FC Evidence 2026-06-26` as `status=paused` with saved
  description.
