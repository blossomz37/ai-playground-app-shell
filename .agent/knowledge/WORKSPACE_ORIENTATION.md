# Workspace Orientation - App Shell Project

Last oriented: 2026-05-30

## One-Line Summary

A reusable local-first Electron desktop shell with Svelte 5 UI, SQLite persistence, and a module contract for building purpose-specific authoring/workflow apps.

## Current Verified State

- Git branch: `main`
- Worktree at orientation time: clean
- App package: `app-shell/package.json`
- Runtime stack: Electron, Svelte 5, TypeScript, SQLite via `better-sqlite3`, TipTap editor
- Current implementation includes AI orchestration Phase 1: shared AI contracts, SQLite run/context/template tables, mock provider, and module wiring across AI Chat, Prompt Studio, and Workflow Runner.

`session-handoffs/HANDOFF_05.md` is stale relative to the code. It says notification, settings, context menus, and remaining modules are next, but the workspace now includes modules and plans/screenshots for later slices such as core services, theme modes, prompt studio, secrets, and zone interactivity. Start from `HANDOFF_06.md` or newer.

## Canonical Reading Order

1. `AGENTS.md`
2. Newest `session-handoffs/HANDOFF_NN.md`
3. `CLAUDE.md`
4. `0-shell-platform-spec.md` section 12
5. `3-module-contract.md`
6. `implementation/AGENTS.md` when implementing or validating UI work

## Architecture Commitments

- Shell owns primitives: workspace, documents, panels, commands, settings, jobs, module registration.
- Modules declare capabilities through manifests and activate through `ModuleContext`.
- Modules should not patch shell internals.
- Core logic belongs in framework-agnostic TypeScript where practical; Svelte should stay focused on UI.
- SQLite is the source of truth for live documents and workspace data.
- Files are import provenance and export targets, not the live editing source.
- Local-first is a core constraint; no cloud dependency in the shell.

## Validation Baseline

From `app-shell/`:

```bash
npm run typecheck
npm run build
```

For UI-visible changes, also capture screenshot evidence using the `SHELL_CAPTURE` flow documented in `implementation/AGENTS.md`.

## Important Project Folders

- `app-shell/src/main/core/` - shell-owned core services.
- `app-shell/src/main/ai/` - first-party AI orchestration layer; AI-specific behavior lives here, not shell core.
- `app-shell/src/main/modules/` - module manifests and activation.
- `app-shell/src/renderer/src/shell/` - shell chrome and shared UI.
- `app-shell/src/renderer/src/modules/` - module views.
- `app-shell/src/shared/module-contract.ts` - code-level contract.
- `implementation/plans/` - plan/status record for larger slices.
- `implementation/screenshots/` - visual validation artifacts.
