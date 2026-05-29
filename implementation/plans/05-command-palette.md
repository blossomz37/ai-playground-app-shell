# Plan 05 — Command palette + keybindings

_Slice: shell UI/runtime for the **Commands** primitive (Cmd+K palette + keybinding dispatch). HANDOFF_04 "what's next" item 1._

## Goal & scope

Give the shell the two built-ins draftwell lacks and the contract requires: a **command palette** (Cmd+K) that lists every declared command and runs it, and a **keybinding runtime** that dispatches declared chords (e.g. `CmdOrCtrl+S`) through the command system. Modules already register handlers in `activate()`; this slice builds the missing *UI/runtime side*.

## Anchor

- `0-shell-platform-spec.md` Primitive 4 (Commands).
- `3-module-contract.md` §5 (`ctx.commands`) and §6 — "shell reads manifest … lists commands in the palette" (declared, pre-activation) and §11 — "command palette, keybindings, context menus … are the UI/runtime of the Commands primitive."

## Approach (build order)

1. **Command catalog, main → renderer.**
   - `moduleRegistry.commands()` walks every registered module's `manifest.contributes.commands` → `CommandCatalogEntry[]` (`{ id, title, keybinding?, moduleId }`). Declared, not gated on activation — matches the contract (palette lists commands before a module's code runs).
   - `commands:list` IPC handler → `window.shell.commands.list()`. Add `CommandCatalogEntry` + `commands.list` to the `ShellApi` type in `shared/module-contract.ts`.

2. **Renderer command layer** — new `renderer/src/store/commands.ts`:
   - `commandCatalog` writable + `loadCommands()` (called from `initStore`).
   - **Renderer handler registry**: `registerCommand(id, fn): Disposable`. Lets a view own the interactive handler for a command whose effect lives in the renderer (the open editor).
   - `executeCommand(id, ...args)`: renderer handler first, else fall through to `window.shell.commands.execute(id, ...args)` (main). Two coherent homes: **main handler = programmatic** (explicit args, callable by other modules); **renderer handler = interactive** (uses live editor/UI state).
   - `paletteOpen` writable boolean.
   - **Keybinding runtime**: normalize event + declared binding to a canonical chord string (`meta+s`), build a `chord → id` map (derived from catalog), and `handleGlobalKeydown(e)` — Cmd+K toggles the palette (built-in shell binding); otherwise look up the chord and execute. No-op while the palette is open (it owns its keys).

3. **`CommandPalette.svelte`** (shell chrome): centered modal over a backdrop, filter input (autofocused), case-insensitive substring filter, ↑/↓ to move selection, Enter to run + close, Esc / backdrop-click to close. Shows each command's title + keybinding hint. Stops propagation on its own keydowns so the global handler stays out of the way.

4. **Wire into `AppShell.svelte`**: `<svelte:window onkeydown={handleGlobalKeydown} />` + render `<CommandPalette />`.

5. **Route Cmd+S through the system**: `MainView.svelte` registers `documents.save` as a renderer handler (calls existing `saveDoc()`) in `onMount`, disposes in `onDestroy`; remove the ad-hoc `handleKeydown`. Cmd+S now flows keybinding → `executeCommand('documents.save')` → renderer handler → `saveDoc()`. The main-process `documents.save` handler stays as the programmatic API.

## Files / areas touched

- `main/modules/registry.ts` — `commands()`.
- `main/ipc.ts` — `commands:list`.
- `preload/index.ts` + `shared/module-contract.ts` — `commands.list` + `CommandCatalogEntry`.
- `renderer/src/store/commands.ts` — **new**, the command layer.
- `renderer/src/store/index.ts` — `loadCommands()` in `initStore`.
- `renderer/src/shell/CommandPalette.svelte` — **new**.
- `renderer/src/shell/AppShell.svelte` — mount palette + global keydown.
- `renderer/src/modules/documents/MainView.svelte` — register `documents.save`, drop ad-hoc keydown.

## Risks & unknowns

- **Editor key interception.** Cmd+S and Cmd+K aren't ProseMirror/StarterKit bindings, so a `svelte:window` handler with `preventDefault` wins. Verify Cmd+S still saves with focus inside the editor.
- **Palette-invoked `notify` commands** (newChapter/newScene) emit `shell:notify` in main, which has no renderer toast sink yet → no visible feedback. Out of scope (notification service is separate future work); validate the wiring via `documents.save` instead, which is visibly observable (version added, dirty cleared).
- **Non-activated modules.** Only Documents exists and it auto-activates at startup, so every listed command has a handler. Command-rule activation (`{on:'command'}`) is a later concern.

## Validation

- Build + typecheck clean (`npm run build`).
- Live: Cmd+K opens palette, filter narrows the list, Enter on "Save Document" saves (History gains a version, status bar flips to ✓ saved); Esc closes. Cmd+S still saves from inside the editor (now via the command path).
- Screenshot: `implementation/screenshots/command-palette-after-2026-05-29.png` (palette open over the editor) via the `SHELL_CAPTURE` hook.

## Outcome (2026-05-29 — DONE)

Built as planned. Catalog flows main→renderer; `store/commands.ts` owns the renderer registry, `executeCommand` (renderer-handler-first, else IPC), `paletteOpen`, and the keybinding runtime; `CommandPalette.svelte` is wired into `AppShell` with a `<svelte:window>` global keydown. `documents.save` now dispatches through the command path (editor registers the renderer handler; ad-hoc keydown removed). Build + typecheck clean. Evidence: `implementation/screenshots/command-palette-after-2026-05-29.png` (palette open over the editor, all six Documents commands listed with the ⌘S hint). Live-interaction states (Cmd+K toggle, Cmd+S save) can't be captured to file in this sandbox; render validated via the cold-launch shot with `paletteOpen` temporarily defaulted true (reverted).

## Out of scope

- Toast/notification service (renderer sink for `shell:notify`).
- Right-click context menus (the third draftwell-lacks built-in) — separate slice.
- User-customizable / persisted keybindings, chord sequences, `when`-clause enablement evaluation.
- Command-rule lazy activation.
