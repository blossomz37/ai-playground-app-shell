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
