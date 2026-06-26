# Session Handoff 70 - Import Folder Dialog Focus Fix

_Session: 2026-06-26 - Slice: Workspace import folder dialog reliability_

## What Changed

- Updated `app-shell/src/main/ipc.ts` so `workspace:importFolder` restores, shows, and focuses the sender `BrowserWindow` before opening the native folder picker.
- Calls `app.focus({ steal: true })` immediately before `dialog.showOpenDialog(...)`.

## Why

- Carlo reported that clicking `Import folder` did not open the folder selection dialog.
- Automated probing showed the UI moved into `Importing...`, meaning the renderer reached the IPC path and was waiting on the native folder picker.
- This points to the native dialog being created but not reliably visible/focused from the dev-launched Electron app.

## Evidence

- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Electron Playwright harness with `dialog.showOpenDialog` stubbed in the main process:
  - Clicked the visible `Import folder` button.
  - Confirmed one dialog call.
  - Confirmed the call received a `BrowserWindow` parent.
  - Confirmed dialog properties included `openDirectory`.

## Not Built

- No new IPC API.
- No renderer redesign.
- No browser-mode folder import fallback.
