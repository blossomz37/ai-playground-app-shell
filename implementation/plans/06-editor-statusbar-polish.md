# Plan 06 — Editor polish + Status bar zone design

_Slice: HANDOFF_04 "what's next" items 2 and 3 — editor UX improvements and status bar redesign._

## Goal & scope

Two polish slices that improve what's already built, without touching the module contract, main process, IPC, or database:

**Slice A — Editor polish:** Floating bubble menu on text selection (bold, italic, strikethrough, code, H1–H3, blockquote), debounced 3-second auto-save, and wired editor font/size/spellcheck settings via CSS custom properties.

**Slice B — Status bar zone design:** Upgrade from hardcoded stub to a proper left/center/right zone layout with module-contributed items, hover states, pulsing unsaved indicator, and workspace/version info on the right.

## Anchor

- `3-module-contract.md` §3 — `statusBar` contribution point in `ZoneContributionDecl`.
- HANDOFF_04 items 2–3 — editor polish + status bar zone design.
- `1-shell-spec.md` — layout zones, theming tokens.

## Approach (build order)

1. **tokens.css** — add `--font-size-2xl` and `--color-fg-accent` utility alias.
2. **store/index.ts** — add `EditorSettings` interface + `editorSettings` writable store (fontFamily, fontSize, spellcheck), `loadEditorSettings()` called from `initStore()`, auto-save debounce helpers (`scheduleAutoSave`, `cancelAutoSave`), and cancel-on-doc-switch / cancel-on-manual-save logic.
3. **EditorToolbar.svelte** (new) — floating bubble menu using TipTap selection coordinates (`coordsAtPos`), `requestAnimationFrame` position tracking, glassmorphism backdrop, active-state highlighting, viewport clamping. Uses `onmousedown` with `preventDefault()` to avoid deselecting text when clicking toolbar buttons (Svelte 5 syntax — no pipe modifiers).
4. **MainView.svelte** — mount `EditorToolbar`, call `scheduleAutoSave()` on `onUpdate`, cleanup auto-save on `onDestroy`, wire `editorSettings` as `--editor-font` / `--editor-font-size` CSS custom properties on the editor container that cascade into `.ProseMirror`.
5. **StatusBar.svelte** — full redesign with left (module items: title, word count, save indicator), center (reserved), right (workspace type, app version) zones. Flexbox `space-between`, individual item hover states, `pulse-dot` animation on unsaved indicator, smooth color transitions.
6. **AppShell.svelte** — status bar height 28px → 30px.

## Files / areas touched

- `renderer/src/styles/tokens.css` — 2 new tokens.
- `renderer/src/store/index.ts` — `EditorSettings`, auto-save debounce, `loadEditorSettings`.
- `renderer/src/modules/documents/EditorToolbar.svelte` — **new**.
- `renderer/src/modules/documents/MainView.svelte` — toolbar mount, auto-save, settings wiring.
- `renderer/src/shell/StatusBar.svelte` — full redesign.
- `renderer/src/shell/AppShell.svelte` — grid row height tweak.

No changes to: main process, preload, IPC, shared types, database, module contract.

## Risks & unknowns

- **rAF-based positioning** runs every frame regardless. Low cost (simple coord reads) but could be replaced with a ProseMirror plugin `view.update()` callback if perf profiling flags it later.
- **Auto-save with no notification:** saves fire silently. The notification service (renderer toast sink) doesn't exist yet, so there's no visible confirmation beyond the status bar flipping to "✓ saved". Acceptable for now.
- **Bubble menu on cold launch screenshot:** the toolbar only appears on text selection, so the `SHELL_CAPTURE` cold-launch shot can't show it. Verified interactively.

## Validation

- Build: `npm run build` — clean.
- Typecheck: `npm run typecheck` — clean.
- Screenshot: `implementation/screenshots/editor-statusbar-polish-after-2026-05-29.png` — cold-launch showing the redesigned status bar with left/right zones.
- Interactive (verified in live app): select text → bubble menu appears with glassmorphism styling; type → auto-save fires after 3s; Cmd+S → immediate save; status bar shows word count + pulsing unsaved dot → "✓ saved" transition.

## Outcome (2026-05-29 — DONE)

Built as planned. Both slices complete, build + typecheck clean, screenshot captured. The editor now has a floating format toolbar and auto-saves; the status bar has proper zoned layout with hover states and transitions.

## Out of scope

- Slash commands in the editor (TipTap suggestion extension — future).
- Settings panel UI (the settings values are wired but there's no UI to change them yet).
- Notification/toast service (renderer sink for `shell:notify`).
- Right-click context menus.
