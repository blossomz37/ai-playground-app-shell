# Plan 03 — Scaffold Slice (Option B)

_Status: DONE — 2026-05-29_
_Anchor: `1-shell-spec.md` §1–3 (stack, layout, persistence); `3-module-contract.md` (the contract the scaffold proves); `0-shell-platform-spec.md` §12 Q1–Q11._

## Goal & scope

Stand up **Electron + Svelte 5 + SQLite** as a thin vertical slice that proves the three-process architecture (main/preload/renderer), the seven-zone fixed layout, the module registry + `ModuleContext`, and the `ctx.documents` IPC pipeline — all in running code, not just specs.

Deliverable: `app-shell/` directory (subdirectory of spec repo). Running `npm install && npm run start` opens a window with the fixed-zone shell layout and a seeded Documents module showing a manuscript tree, placeholder editor, and inspector.

Success test:
- Window opens, no crashes.
- Fixed zones render (rail, sidebar, main, inspector, status bar).
- Documents module is registered, enabled, and activated.
- Manuscript tree loads from SQLite and is visible in the sidebar.
- Selecting a document populates the main pane with its content.
- SQLite schema matches the shell document model from `1-shell-spec.md` §3.
- Module contract types are the ones from `3-module-contract.md` (no drift).

## Stack decisions (already resolved, just executing)

- **Build tool:** `electron-vite` v2 — the modern standard for Electron + Vite. Handles three separate Vite builds (main/preload/renderer) in one config.
- **UI:** Svelte 5 (`svelte@^5`) with `@sveltejs/vite-plugin-svelte@^4`. Runes syntax throughout.
- **SQLite:** `better-sqlite3` — synchronous, runs in main process. `externalizeDepsPlugin()` keeps it unbundled (native module).
- **No native-module rebuild scripts** in this slice — developer runs `npm install` and electron-vite handles the rest in dev. Production packaging deferred.
- **Theming:** CSS custom property stubs (token API). Full token system is a later slice.
- **Icons:** Unicode/text placeholders — icon library deferred.

## Approach (build order)

1. `package.json` + `electron.vite.config.ts` + TS configs
2. `src/shared/module-contract.ts` — TypeScript interfaces from `3-module-contract.md` + `Doc`/`DocVersion` types
3. Main core: `db.ts` (SQLite init + schema + seed) → `events.ts` → `settings.ts` → `documents.ts` → `jobs.ts`
4. Module system: `registry.ts` → `context.ts` (ModuleContext factory)
5. Documents module: `src/main/modules/documents/index.ts` (manifest + `activate()`)
6. `ipc.ts` (all IPC handlers) → `src/main/index.ts` (window creation, startup sequence)
7. `src/preload/index.ts` (contextBridge — `window.shell`)
8. Renderer: `index.html` + `main.ts` + `App.svelte`
9. Renderer store: `src/renderer/src/store/index.ts` (writable stores, `initStore()`)
10. CSS tokens + global styles
11. Shell components: `AppShell` (grid layout) → `ActivityRail` → `Sidebar` → `MainPane` → `Inspector` → `StatusBar`
12. Module view registry: maps module IDs → Svelte view components
13. Documents views: `NavView` (tree) + `MainView` (placeholder editor) + `InspectorView` (metadata)

## Files / areas touched

- **New directory:** `app-shell/` (Electron app; spec repo root)
- **Updated:** `CLAUDE.md` open-design-work (scaffold done), `session-handoffs/HANDOFF_02.md`

## Risks & unknowns

- **better-sqlite3 native rebuild:** In dev, electron-vite loads it from node_modules directly. If the installed Node version and Electron ABI differ, the user will need to run `./node_modules/.bin/electron-rebuild`. Documented in README.
- **Svelte 5 `mount()` API:** Used instead of legacy `new App(...)`. If any dependency assumes Svelte 4 API, it will error. Mitigated by keeping renderer lean.
- **Path aliases (`@shared`):** Configured in electron-vite config AND renderer tsconfig. If one is missing, TS errors appear. Both must be kept in sync.
- **IPC surface area:** Only the document pipeline + workspace + settings + modules list are wired in this slice. Commands, jobs, events bus are main-process-only stubs.

## Validation

Screenshot required: `scaffold-shell-YYYY-MM-DD.png` — the running window showing all five zones populated (rail icon, tree in sidebar, content in main, inspector, status bar).

## Out of scope

- Command palette / keybindings UI (separate shell-primitive slice)
- Theming token system (separate slice)
- Rich-text editor (TipTap/ProseMirror — deferred to editor engine slice F1)
- Production packaging / distribution
- Secrets service
- Remaining modules (Journal, AI Chat, etc.)
- Status bar zone visual design (defined but not polished)
