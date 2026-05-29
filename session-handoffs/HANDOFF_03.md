# Session Handoff 03 — App Shell Project

_Session: 2026-05-29 · Slice: Scaffold (Option B) — DONE_

---

## What happened this session

Executed the scaffold slice — standing up the full `app-shell/` Electron + Svelte 5 + SQLite application proving the architecture in running code.

**Validation:** app launched, window opened, all five zones rendered from SQLite seed data. Screenshot confirmed live. See `implementation/plans/03-scaffold.md`.

## What was built

New directory `app-shell/` at project root. The architecture is now running, not just specced:

- **Tooling:** `electron-vite` v2 + Svelte 5 + `better-sqlite3`
- **Main process core:** `db.ts` (SQLite init + schema + seed), `documents.ts`, `settings.ts`, `events.ts`, `jobs.ts`
- **Module system:** `registry.ts`, `context.ts` (ModuleContext factory), `documents/index.ts` (the three-face contract in running code)
- **IPC bridge:** `ipc.ts` (all handlers) → `preload/index.ts` (contextBridge `window.shell`) 
- **Renderer:** CSS token stubs, writable stores, AppShell grid layout, 5 zone components, Documents NavView/MainView/InspectorView
- **Shared types:** `src/shared/module-contract.ts` — single source of truth matching `3-module-contract.md` exactly

## One setup step required for a new machine

After `npm install`, run:
```
cd app-shell && npm run rebuild
```
This rebuilds `better-sqlite3` against Electron's Node ABI. Without it, the app crashes on `initDb()`.

## Architecture validated by this slice

- ✅ Main process owns all core logic; renderer only via contextBridge
- ✅ Module three-face contract (`ModuleManifest` / `activate(ctx)` / `ModuleContext`) works in running code
- ✅ SQL schema matches `1-shell-spec.md` §3 exactly
- ✅ `electron-vite` + Svelte 5 runes + `better-sqlite3` stack is confirmed working

## What's next (recommended order)

1. **`postinstall` hook** — add `"postinstall": "electron-rebuild -f -w better-sqlite3"` to `app-shell/package.json` so `npm install` is a single command for new contributors. Quick win.

2. **Editor engine (F1)** — replace the `<textarea>` stub in `MainView.svelte` with TipTap/ProseMirror in a thin Svelte wrapper. Do an ecosystem check first (`svelte-tiptap`, `@tiptap/core` + manual binding, or the lighter `Carta` for markdown). This is the highest-value next slice for the authoring use case. Module contract is editor-agnostic — no contract changes needed.

3. **Command palette + keybindings** — shell UI/runtime for the Commands primitive (Cmd+K palette). Modules already register command handlers; this is the missing UI side.

4. **NavView auto-expand bug** — investigate: on first load, both Act I and Act II folders render as expanded (▼ with children visible) even though `expanded = $state(new Set())` initializes empty. Likely Svelte 5 `$state` + recursive snippet context OR it's actually the right UX behavior (auto-expand to active doc) and should just be made explicit. Doesn't block anything.

5. **Status bar zone design** — zone renders, visual/layout polish deferred to its own slice.
