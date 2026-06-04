# Workspace Orientation - App Shell Project

Last oriented: 2026-06-04

## One-Line Summary

A reusable local-first Electron desktop shell with Svelte 5 UI, SQLite persistence, and a module contract for building purpose-specific authoring/workflow apps.

## Current Verified State

- Git branch: `main`
- App package: `app-shell/package.json`
- Runtime stack: Electron, Svelte 5, TypeScript, SQLite via `better-sqlite3`, TipTap editor
- Current implementation includes AI orchestration Phase 1 plus the OpenAI live-provider adapter: shared AI contracts, SQLite run/context/template tables, `mock-local`, `openai-responses`, provider selection, and module wiring across AI Chat, Prompt Studio, and Workflow Runner.
- The shell now has real workspace management and visible jobs: active workspace persistence, topbar workspace switch/create flow, module-context refresh on switch, persistent job history, status-bar job indicator, jobs panel, and Workflow Runner job submission.
- Alpha hardening on 2026-05-30 verified fresh mock and live AI acceptance passes against the real app database. Evidence lives in `implementation/screenshots/alpha-hardening-mock-ai-after-2026-05-30.png`, `implementation/screenshots/alpha-hardening-live-ai-after-2026-05-30.png`, and completed `ai_runs`/`ai_context_packs` rows.
- Phase 2 state architecture advanced on 2026-05-31: Documents plus AI Chat, Journal, Assets, Web, Table View, and Workflow now have framework-agnostic slices under `app-shell/src/shared/state/`, with renderer `state.ts` files acting as Svelte adapters. AI Chat conversations/messages persist through dedicated AI tables; scaffold module UI state persists through workspace-scoped `shell_settings` keys.
- Web now uses an Electron `<webview>` with `partition="persist:app-shell-web"` plus module-owned tabs, bookmarks, and visible history. A shared shell-level `ModuleContext.web` contract remains deferred until another module needs the web surface.
- Phase 2 finalization added `app-shell/src/renderer/src/modules/module-state-registry.ts`; renderer adapters now resolve module slices by module id instead of constructing them locally. Assets import now uses native file selection, records durable `filePath`, can reveal imported files in Finder, stores image dimensions/thumbnails, and stores PDF page/title/author/thumbnail metadata.
- Plan 21 landed on 2026-06-04: the shell has a persistent shell-owned context strip, full-width status bar, shared titlebar/context/body/status column tracks, and fresh-layout inspector default closed while preserving existing saved layout state.
- App identity work landed on 2026-06-04: runtime/product/window name is `App Shell`, icon assets live in `app-shell/resources/`, and macOS dev runs generate `app-shell/.electron-dev/App Shell.app` through `app-shell/scripts/start-dev.mjs`.
- Next planned implementation slice: `implementation/plans/22-jewel-box-css-pass.md`. Treat it as a CSS/theme pass over the Plan 21 layout; do not reopen layout structure or module contracts.

Older handoffs contain historical "what's next" sections that are stale relative to the current code. Start from the newest numbered handoff, then use this orientation and the numbered implementation plans as the current map.

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
- `app-shell/src/main/core/workspaces.ts` - active workspace/list/create/switch service.
- `app-shell/src/main/core/jobs.ts` - persistent job run tracking and progress events.
- `app-shell/src/main/ai/` - first-party AI orchestration layer; AI-specific behavior lives here, not shell core.
- `app-shell/src/shared/state/` - framework-agnostic observable state slices; first concrete slice is Documents.
- `app-shell/src/main/modules/` - module manifests and activation.
- `app-shell/src/renderer/src/shell/` - shell chrome and shared UI.
- `app-shell/src/renderer/src/modules/` - module views.
- `app-shell/src/shared/module-contract.ts` - code-level contract.
- `implementation/plans/` - plan/status record for larger slices.
- `implementation/screenshots/` - visual validation artifacts.
