---
file: 14-state-architecture.md
description: Migrate module state to framework-agnostic TS slices (contract D2 boundary)
version: 0.3.0
created: 2026-05-29
modified: 2026-05-31
author: antigravity
status: phase-2-advanced
---

# 14 — State Architecture (D2 Boundary)

## Problem

`3-module-contract.md` §4 specifies the "internal/external boundary (D2)":

> "The state slice and all module logic are plain framework-agnostic TypeScript. The Svelte views are thin subscribers that reach that logic **only** through `ctx` and the slice's subscribe interface — never by importing logic into a component. Held that way, the logic runs in-process today and can move behind the local API for a LAN/iPad client later (Q10) by relocating it, not rewriting it."

Currently, module state lives directly in Svelte `$state` runes and `writable` stores inside renderer components and `store/index.ts`. Views import logic directly. This couples all state management to the Svelte runtime, making Q10 (LAN/iPad client) require a rewrite rather than a relocation.

## Spec References

- `3-module-contract.md` §4 (D2 internal/external boundary)
- `0-shell-platform-spec.md` §12 Q5 ("Core logic lives in framework-agnostic TypeScript outside the renderer")
- `0-shell-platform-spec.md` §12 Q10 ("future iPad/LAN HTML client can reach core features")

## Scope

### Must

- Define the **state slice pattern**: a plain-TS class/object per module that owns all module state, exposes a subscribe interface, and has no Svelte dependency
- Migrate the **Documents module** first (largest, most complex):
  - Document tree, selected doc, dirty state, editor content → plain-TS slice
  - `NavView.svelte`, `MainView.svelte`, `InspectorView.svelte` become thin subscribers
- State slices are created in `activate(ctx)` and accessible via `ctx` — not via direct imports

### Should

- Migrate all 7 modules to the pattern
- Migrate shell-level state (`activeModuleId`, editor settings, toast queue) to plain-TS where it crosses the main/renderer boundary
- Define a standard subscribe interface (observable / callback pattern) that Svelte components can `$derive` from

### Could

- Extract state slices into a `src/core/` directory (outside `renderer/`) to physically enforce the boundary
- Add a lint rule or architecture test that prevents `*.svelte` files from importing from `src/core/` directly (must go through `ctx`)

## Design Considerations

- Svelte 5's `$state` rune is compiler-scoped — it can't be used in plain `.ts` files outside the Svelte compiler. The slice must use a vanilla pattern (class with callbacks, or a minimal observable).
- The subscribe interface should be thin enough that a future React or vanilla client can consume it without Svelte.
- This is a refactor, not a feature — existing behavior should be preserved exactly.

## Files Likely Affected

- `src/renderer/src/store/index.ts` — refactor to thin adapter over plain-TS slices
- `src/main/modules/documents/index.ts` — create state slice in `activate()`
- `src/renderer/src/modules/documents/*.svelte` — subscribe to slice via `ctx`
- All other module views — same pattern migration
- Possibly new `src/core/` or `src/shared/slices/` directory

## Phase 2 Unit Completed - 2026-05-31

This session established the first concrete state-slice pattern and completed one persistence hardening item from plan 19.

### Completed

- Added a framework-agnostic observable slice base in `app-shell/src/shared/state/observable.ts`.
- Added `DocumentsStateSlice` in `app-shell/src/shared/state/documents-state.ts`.
- Moved Documents-owned state into the slice:
  - document list,
  - selected document id,
  - active document derivation,
  - editor markdown content,
  - dirty state,
  - version list,
  - tree derivation,
  - auto-save debounce.
- Kept `app-shell/src/renderer/src/store/index.ts` as a Svelte adapter over the plain-TS slice so existing shell and module views can keep consuming Svelte stores while the logic boundary moves out of Svelte.
- Updated `Documents/MainView.svelte` so editor writes go through the slice adapter instead of directly mutating Svelte stores.
- Added AI Chat conversation/message persistence through the existing SQLite `ai_conversations` and `ai_messages` tables:
  - repository methods,
  - orchestrator methods,
  - IPC handlers,
  - preload API,
  - browser-shell fallback API,
  - renderer AI Chat state loading/creation/message append.

### Validation

- `npm run typecheck` passed.
- `npm run build` passed.
- Svelte autofixer returned no issues for the edited AI Chat components.
- Svelte autofixer returned no issues for `Documents/MainView.svelte`; it retained pre-existing suggestions around TipTap `bind:this`/effect calls.
- UI capture:
  - `implementation/screenshots/ai-chat-persistence-after-2026-05-31.png`
- SQLite evidence after capture:
  - `ai_conversations` count: `1`
  - `ai_messages` count: `1`

### Still Open

- Move the remaining scaffold modules' local Svelte store files to plain-TS slices.
- Add durable Assets metadata/file-path persistence before enabling Finder, Copy Path, or Remove.
- Add Web bookmark/history persistence and real Electron webview/session integration before claiming full browsing.
- Decide whether the renderer adapter is sufficient for the current build, or whether a future slice should expose renderer-side state through a formal module-state registry that mirrors `ModuleContext` more literally.

## Phase 2 Unit Completed - 2026-05-31 Follow-up

This session finished the remaining scaffold state-slice migration and added workspace-scoped persistence for the scaffold module state that is user-adjustable in the alpha UI.

### Completed

- Added plain TypeScript slices under `app-shell/src/shared/state/` for:
  - AI Chat,
  - Journal,
  - Assets,
  - Web,
  - Table View,
  - Workflow Runner.
- Converted each module-local renderer `state.ts` file into a Svelte adapter over its plain-TS slice.
- Added workspace-scoped `shell_settings` persistence for:
  - Journal entries/selection,
  - Assets metadata/selection, including a durable `filePath` field,
  - Web bookmarks/history/current page,
  - Table View filter/sort/selection,
  - Workflow Runner selected profile/options.
- Added persisted Assets metadata support sufficient to enable metadata removal and path copy only when a file path exists. Finder/copy remain disabled for fixture records with no path.
- Replaced the Web placeholder with an Electron `<webview>` using `partition="persist:app-shell-web"` and enabled `webviewTag` in the BrowserWindow.

### Validation

- `npm run typecheck` passed.
- `npm run build` passed.
- Svelte autofixer passed on edited Assets and Web components.
- UI captures:
  - `implementation/screenshots/phase2-state-slices-assets-after-2026-05-31.png`
  - `implementation/screenshots/phase2-state-slices-web-after-2026-05-31.png`
- SQLite evidence after captures:
  - `shell_settings` module-state rows matching `shell.modules.%`: `10`

### Still Open

- The current implementation still uses renderer adapters rather than slices being created directly in `activate(ctx)`. That is the remaining architectural mismatch with the original ideal in this plan.
- Assets still needs a real import flow that records actual local file paths before Finder/open-file behavior can be fully enabled.
- Web has a real persistent Electron webview surface, but browser behavior remains minimal: no tab model, no full in-page navigation history integration, and no web-surface abstraction on `ModuleContext`.
