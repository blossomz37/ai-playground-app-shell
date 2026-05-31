# Session Handoff 16 - Web Navigation Abort Fix

_Session: 2026-05-31 · Slice: Web module navigation stability_

## What Changed

- Fixed Web module navigation churn that produced Electron `GUEST_VIEW_MANAGER_CALL` / `ERR_ABORTED (-3)` messages during bookmark navigation and redirects.
- Decoupled the address bar draft value from committed tab navigation in `MainView.svelte`.
- Added `requestedUrl` to Web tab state:
  - app/user navigation updates the requested URL that drives `<webview src>`,
  - webview-observed redirects update displayed URL/title/history without rewriting `src` mid-load.
- Kept redirect updates in the current history entry instead of treating them as a second app navigation.

## Evidence

- Svelte autofixer passed on `app-shell/src/renderer/src/modules/web/MainView.svelte`.
- `npm run typecheck` passed.
- `npm run build` passed.
- Screenshot capture completed without the prior abort messages:
  - `implementation/screenshots/web-navigation-abort-fix-after-2026-05-31.png`

## Carry Forward

- The Web module still needs explicit load-error/blocked-embed empty states. Some sites can render blank inside Electron webview even when navigation itself is stable.
