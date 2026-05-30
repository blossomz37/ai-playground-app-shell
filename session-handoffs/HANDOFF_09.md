# Session Handoff 09 - Workspace Switching and Jobs Visibility

_Session: 2026-05-30 · Slice: shell workspace lifecycle + jobs progress/history_

## What Changed

Implemented the shell-owned workspace and jobs primitives:

- Added `workspaceService` with persisted active workspace, list/create/switch, `lastOpenedAt`, and `archivedAt` migration support.
- Replaced the empty topbar with a workspace switcher and new-workspace flow using Electron's folder chooser.
- Switching workspaces now refreshes renderer document/job state and rebuilds activated module contexts against the new workspace.
- Reworked `jobs` from event-only to persistent SQLite-backed job snapshots with status, progress, message, timestamps, cancellation, and history.
- Added renderer jobs store, status-bar job indicator, and `JobsPanel.svelte`.
- Routed Workflow Runner's Run Chain action through `ai.chain.mock` via the shared jobs service.

## Evidence

- `npm run typecheck` passed.
- `npm run build` passed.
- Screenshot: `implementation/screenshots/workspace-jobs-after-2026-05-30.png`.

## Carry Forward

- Workspace duplicate/archive UI is still out of scope.
- Job cancellation is cooperative; runners need to check `handle.cancelled` during multi-step work.
- An existing untracked screenshot, `implementation/screenshots/markdown-handling.png`, was present before this slice and was left untouched.
