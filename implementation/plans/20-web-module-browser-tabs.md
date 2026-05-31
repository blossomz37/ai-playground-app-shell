---
file: 20-web-module-browser-tabs.md
description: Add richer Web module browser behavior with tabs and fuller history
version: 1.0.0
created: 2026-05-31
modified: 2026-05-31
author: codex
status: complete
---

# 20 — Web Module Browser Tabs

## Goal & Scope

Make the Web module behave like a small persistent browser surface instead of a single-page placeholder: tab state, per-tab navigation history, richer global history, and UI affordances for opening, switching, closing, and revisiting pages.

## Anchor

- `0-shell-platform-spec.md` §12 Q13 — Web is a first-party bundled module; shell-level web-surface API remains deferred until a second consumer warrants it.
- `3-module-contract.md` §8 — managed persistent web-surface is deferred; current Web module owns its browser product behavior.
- `implementation/plans/14-state-architecture.md` — module state belongs in plain TypeScript slices with Svelte as a thin adapter.

## Approach

1. Expand `WebStateSlice` from a single URL/history model into a tabbed model:
   - each tab has id, title, current URL, loading state, history stack, history index, and last visited time,
   - the slice exposes active tab derivations for URL, title, back/forward, bookmark state, and visible history,
   - persistence migrates old single-page snapshots into the new tab model.
2. Update the Web renderer adapter to expose tab actions and history actions without Svelte-owned module logic.
3. Update `MainView.svelte`:
   - tab strip with new/close/switch controls,
   - active tab URL bar,
   - one active Electron `<webview>` bound to the active tab,
   - webview events update the active tab and global history.
4. Update `NavView.svelte` and `InspectorView.svelte`:
   - history entries are clickable,
   - inspector shows active tab/session/history details.
5. Treat browser-surface contract as deferred for this slice unless a second module starts consuming the web surface. Document that explicitly instead of adding a speculative `ModuleContext.web` API.

## Files / Areas Touched

- `app-shell/src/shared/state/web-state.ts`
- `app-shell/src/renderer/src/modules/web/state.ts`
- `app-shell/src/renderer/src/modules/web/MainView.svelte`
- `app-shell/src/renderer/src/modules/web/NavView.svelte`
- `app-shell/src/renderer/src/modules/web/InspectorView.svelte`
- `implementation/screenshots/`
- `session-handoffs/`

## Risks & Unknowns

- Electron `<webview>` maintains its own internal navigation stack; the module slice should treat app-level history as the user-visible source of truth while leaving the embedded web contents to load the active URL.
- Some remote sites may block embedding or load slowly during screenshot capture. Validation should prove the Web UI shell state, not depend on an external page rendering fully.
- Closing the last tab should create a replacement tab rather than leaving the module without an active surface.

## Validation

From `app-shell/`:

```bash
npm run typecheck
npm run build
SHELL_CAPTURE_MODULE=shell.web SHELL_CAPTURE=../implementation/screenshots/web-tabs-after-2026-05-31.png npm run start
```

Also run the Svelte autofixer on edited Web components until it returns no required fixes.

## Out of Scope

- Full Chrome-level browser features: bookmarks manager, downloads, password management, devtools UI, tab dragging, or cross-window browsing.
- A shell-level `ModuleContext.web` contract. Per Q13, that should wait until another module needs a managed web surface.

## Completed — 2026-05-31

- Reworked `WebStateSlice` into a tabbed browser state model:
  - open/switch/close tab actions,
  - per-tab history stack and current index,
  - global visit history,
  - legacy single-page persistence migration,
  - persisted tab/session snapshot under the existing workspace-scoped Web settings key.
- Updated the Web Svelte adapter to expose tab, bookmark, history, and navigation actions without moving module logic into components.
- Updated the Web UI:
  - tab strip with new and close controls,
  - clickable bookmarks and global history,
  - active tab history in the inspector,
  - icon buttons from the existing Phosphor icon library.
- Updated the Web module command declarations and renderer command handlers for tab, bookmark, back/forward, and reload actions.
- Confirmed only the Web module consumes the Electron `<webview>` surface, so the shell-level `ModuleContext.web` contract remains deferred per `0-shell-platform-spec.md` §12 Q13 and `3-module-contract.md` §8.

## Validation Results

- Svelte autofixer passed on:
  - `app-shell/src/renderer/src/modules/web/MainView.svelte`
  - `app-shell/src/renderer/src/modules/web/NavView.svelte`
  - `app-shell/src/renderer/src/modules/web/InspectorView.svelte`
  - `app-shell/src/renderer/src/shell/AppShell.svelte`
- `npm run typecheck` passed.
- `npm run build` passed.
- Screenshot evidence:
  - `implementation/screenshots/web-tabs-after-2026-05-31.png`
- Static web-surface check:
  - only the Web module owns `<webview class="web-surface">`,
  - existing docs already defer a shared web-surface contract until a second consumer exists.
