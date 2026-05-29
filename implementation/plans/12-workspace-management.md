---
file: 12-workspace-management.md
description: Implement workspace management UI (list, open, create, duplicate, archive)
version: 0.1.0
created: 2026-05-29
modified: 2026-05-29
author: antigravity
status: placeholder
---

# 12 — Workspace Management UI

## Problem

`2-modules-overview.md` §2 maps draftwell's Library room to "shell **Workspace** mgmt — project list/open/duplicate/archive — folds into shell, not a module." Currently there is one hardcoded workspace (`ws-default`) seeded in `db.ts`, no UI to create/switch/duplicate/archive workspaces, and the topbar is an empty drag zone.

The `workspaces` table exists and `ctx.workspace` is wired — but it's always the same workspace.

## Spec References

- `0-shell-platform-spec.md` §3 Workspace primitive ("Shell owns: open/close workspace, recent workspaces, metadata, file root, lifecycle events")
- `2-modules-overview.md` §2 (Library → shell Workspace mgmt)
- `2-modules-overview.md` §3 ("top-bar workspace switcher" listed as shell-owned chrome)
- `0-shell-platform-spec.md` §8 (shell data: "recent workspaces")

## Scope

### Must

- **Workspace switcher** in the topbar (dropdown showing all workspaces, click to switch)
- **Create workspace** flow (name, type, root directory via Electron dialog)
- **Recent workspaces** list persisted as shell-level data
- Switch workspace at runtime: reload module state, re-query documents for new `workspaceId`
- IPC handlers: `workspace:list`, `workspace:create`, `workspace:switch`

### Should

- **Duplicate workspace** (clone documents + settings into a new workspace)
- **Archive workspace** (soft-delete, remove from recent list, keep data)
- Workspace type selector (authoring, research, etc. — modules can filter by type via `ActivationRule`)

### Could

- Workspace templates (pre-populated document trees for different use cases)
- Welcome screen when no workspace is open

## Files Likely Affected

- `src/main/core/db.ts` — multi-workspace queries, recent-workspace tracking
- `src/main/ipc.ts` — new workspace IPC handlers
- `src/shared/module-contract.ts` — extend `ShellApi.workspace`
- `src/preload/index.ts` — bridge new workspace calls
- `src/renderer/src/shell/AppShell.svelte` — topbar workspace switcher component
- `src/renderer/src/store/index.ts` — active workspace state, workspace switch logic
