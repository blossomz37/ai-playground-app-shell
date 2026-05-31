# Session Handoff 17 - Webview Height Alignment

_Session: 2026-05-31 · Slice: Electron-aligned Web surface sizing_

## What Changed

- Reverted the failed Web sizing experiments in `Web/MainView.svelte`:
  - removed explicit measured pixel sizing,
  - removed `autosize` and min/max webview attributes,
  - removed absolute positioning/inset sizing from the webview,
  - preserved Electron's default `<webview>` display behavior.
- Applied the Electron-aligned layout:
  - `browser-area` owns the remaining pane height via flex column layout,
  - `.web-surface` fills as a flex item without overriding `display`,
  - `MainPane.svelte` now has `min-height: 0` so grid/flex children can shrink correctly.
- Kept the deterministic Web capture hook:
  - `SHELL_CAPTURE_WEB_URL` can navigate the Web module to a known validation URL,
  - the capture waits for guest-page readiness before taking evidence.

## Evidence

- Svelte autofixer passed on:
  - `app-shell/src/renderer/src/modules/web/MainView.svelte`
  - `app-shell/src/renderer/src/shell/MainPane.svelte`
- `npm run typecheck` passed.
- `npm run build` passed.
- Screenshot with Carlo-requested URL:
  - `implementation/screenshots/web-view-fill-after-2026-05-31.png`
- Source audit:
  - no Web surface `autosize`, `minwidth`, `minheight`, `maxwidth`, `maxheight`, measured `webviewStyle`, or `.web-surface { display: block / position: absolute }` remain.

## Carry Forward

- `implementation/screenshots/web-view-scroll.png` is Carlo's annotated diagnostic screenshot and is intentionally left untracked.
- Lipsum includes ad overlays and internal page scrollbars, but the embedded guest viewport now occupies the browser pane height.
