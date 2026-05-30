---
file: 17-workspace-jobs-shell-slice.md
description: Implement workspace switching/creation plus visible jobs progress/history
version: 0.1.0
created: 2026-05-30
modified: 2026-05-30
author: codex
status: implemented
---

# 17 - Workspace Switching and Jobs Visibility

## Goal & Scope

Deliver two shell-owned primitives that are currently only partially wired:

- Workspace lifecycle: list, create, switch, and keep the renderer/document state aligned with the active workspace.
- Jobs visibility: submit/cancel/list jobs, show active progress and recent history in shell chrome.

This implements the practical subset of placeholder plans `12-workspace-management.md` and `13-jobs-ui.md`.

## Anchor

- `0-shell-platform-spec.md` section 12: shell owns workspace lifecycle and jobs.
- `3-module-contract.md` section 5: modules use `ctx.workspace` and `ctx.jobs`.
- `implementation/plans/12-workspace-management.md`
- `implementation/plans/13-jobs-ui.md`

## Approach

1. Add a core workspace service backed by SQLite and shell settings for the active workspace.
2. Extend the workspace schema with `lastOpenedAt` and `archivedAt`, preserving the existing default workspace.
3. Add IPC/preload/shared API methods for `workspace.list`, `workspace.create`, and `workspace.switch`.
4. Update renderer store initialization and switch handling so documents, selection, versions, AI context, and active workspace metadata refresh together.
5. Replace the empty topbar with a compact workspace switcher and create-workspace form.
6. Upgrade the jobs service from event-only to tracked job snapshots with active/history state.
7. Add IPC/preload/shared API methods for `jobs.list`, `jobs.submit`, `jobs.cancel`, and live job updates.
8. Add a status-bar jobs indicator plus a toggleable jobs panel with progress, cancellation, and recent history.
9. Wire Workflow Runner's Run Chain button through the jobs service so there is a real user-facing long-running task path.

## Files / Areas Touched

- `app-shell/src/main/core/db.ts`
- `app-shell/src/main/core/workspaces.ts`
- `app-shell/src/main/core/jobs.ts`
- `app-shell/src/main/ipc.ts`
- `app-shell/src/main/index.ts`
- `app-shell/src/main/modules/registry.ts`
- `app-shell/src/main/modules/context.ts`
- `app-shell/src/preload/index.ts`
- `app-shell/src/shared/module-contract.ts`
- `app-shell/src/renderer/src/store/index.ts`
- `app-shell/src/renderer/src/store/jobs.ts`
- `app-shell/src/renderer/src/shell/AppShell.svelte`
- `app-shell/src/renderer/src/shell/StatusBar.svelte`
- `app-shell/src/renderer/src/shell/JobsPanel.svelte`
- `app-shell/src/renderer/src/modules/workflow/MainView.svelte`

## Risks & Unknowns

- Module contexts currently capture workspace at activation time. Switching must refresh activated contexts enough that module command handlers use the new workspace.
- Existing user data may lack the new workspace/job columns. Migration must be additive.
- Job cancellation is cooperative; existing runners need to check cancellation if they have multiple steps.

## Validation

- `npm run typecheck` passed.
- `npm run build` passed.
- Screenshot: `implementation/screenshots/workspace-jobs-after-2026-05-30.png`.

## Outcome

Implemented the shell-owned workspace and jobs primitives:

- Topbar workspace switcher lists persisted workspaces and supports creating a new workspace through an Electron folder chooser.
- Active workspace is persisted in shell settings, and switching refreshes renderer document/job state plus module contexts.
- Jobs now persist to SQLite with progress, status, message, timestamps, and error fields.
- Renderer exposes a jobs panel with active progress, cancellation, and recent history.
- Workflow Runner's `Run Chain` path now submits `ai.chain.mock` through the shared jobs service.

## Out of Scope

- Workspace duplication/archive UI.
- Workspace templates.
- Retry/search/filter for job history.
- Streaming AI responses.
