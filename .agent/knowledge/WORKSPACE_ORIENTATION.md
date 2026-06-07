# Workspace Orientation - App Shell Project

Last oriented: 2026-06-07

## One-Line Summary

Reusable local-first Electron desktop shell with Svelte 5 UI, SQLite persistence, and a module contract for building purpose-specific authoring/workflow apps.

## Current Verified Map

- Branch: `main`
- App package: `app-shell/package.json`
- Runtime stack: Electron, Svelte 5, TypeScript, SQLite via `better-sqlite3`, TipTap editor
- Current docs root: `docs/`
- Current agent workspace: `workspace-agents/`
- Current newest handoff: `workspace-agents/session-handoffs/HANDOFF_59.md`
- Current visible plan range includes plans 39-48
- Older plans/handoffs/evidence: archived under `archive/workspace-agents/`

## Canonical Reading Order

1. `AGENTS.md`
2. `CLAUDE.md`
3. Newest `workspace-agents/session-handoffs/HANDOFF_NN.md`
4. `docs/README.md`
5. `docs/architecture/shell-platform-spec.md` section 12
6. `docs/architecture/module-contract.md`
7. `workspace-agents/implementation/AGENTS.md` when implementing or validating UI work

## Architecture Commitments

- Shell owns primitives: workspace, documents, panels, commands, settings, jobs, module registration.
- Modules declare capabilities through manifests and activate through `ModuleContext`.
- Modules should not patch shell internals.
- Core logic belongs in framework-agnostic TypeScript where practical.
- Svelte should stay focused on UI.
- SQLite is the source of truth for live documents and workspace data.
- Files are import provenance and export targets, not the live editing source.
- Local-first is a core constraint.

## Important Project Folders

- `docs/architecture/` - platform, shell, module overview, and module contract specs.
- `docs/modules/` - module-specific design specs.
- `docs/reference/` - prior art and anchor-analysis material.
- `app-shell/src/main/core/` - shell-owned core services.
- `app-shell/src/main/core/workspaces.ts` - workspace lifecycle service.
- `app-shell/src/main/core/jobs.ts` - persistent job run tracking and progress events.
- `app-shell/src/main/ai/` - first-party AI orchestration layer.
- `app-shell/src/shared/state/` - framework-agnostic observable state slices.
- `app-shell/src/main/modules/` - module manifests and activation.
- `app-shell/src/renderer/src/shell/` - shell chrome and shared UI.
- `app-shell/src/renderer/src/modules/` - module views.
- `app-shell/src/shared/module-contract.ts` - code-level contract.
- `workspace-agents/implementation/plans/` - active/recent implementation plans.
- `workspace-agents/implementation/screenshots/` - current visual validation evidence.
- `workspace-agents/session-handoffs/` - active/recent handoffs.
- `archive/` - historical plans, handoffs, screenshots, mockups, and pre-spec material.

## Validation Baseline

From `app-shell/`:

```bash
npm run typecheck
npm run build
```

For UI-visible changes, capture screenshot evidence using the `SHELL_CAPTURE` flow documented in `workspace-agents/implementation/AGENTS.md`.

For repository maintenance:

```bash
git status --short --branch
git diff --check
```
