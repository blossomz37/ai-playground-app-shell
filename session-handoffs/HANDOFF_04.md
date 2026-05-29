# Session Handoff 04 — App Shell Project

_Session: 2026-05-29 · Slice: Editor engine (F1) — DONE_

---

## What happened this session

Replaced the `<textarea>` stub in the Documents module's main pane with a real **TipTap 3 WYSIWYG editor**. The editor reads/writes markdown (the storage format), so the save pipeline, version history, and word count keep working unchanged.

Plan: `implementation/plans/04-editor-engine.md`. Evidence: `implementation/screenshots/editor-engine-after-2026-05-29.png`.

## Decisions made

- **Engine: TipTap 3** (`@tiptap/core` + `@tiptap/pm` + `@tiptap/starter-kit` `^3.23`), chosen over Carta because the anchor app **draftwell uses TipTap** and the spec named it. Thin Svelte 5 wrapper — `Editor` instantiated directly in `onMount`/`onDestroy`, no `svelte-tiptap` dependency needed yet.
- **Markdown round-trip: `tiptap-markdown@^0.9`** (peer `@tiptap/core@^3.0.1`, verified). `editor.storage.markdown.getMarkdown()` keeps `contentFormat = 'markdown'` intact. Swappable for a custom `prosemirror-markdown` serializer later if fidelity bites — the view stays editor-agnostic per the contract.
- **Store↔editor sync:** one `$effect` watches `$editorContent` and calls `setContent(md, { emitUpdate: false })` only when the incoming value differs from the editor's current markdown. Editor-originated edits already match, so typing is a no-op there — no feedback loop, and doc-switches don't false-trigger dirty.

## Files touched

- `app-shell/package.json` + lockfile — 4 new deps
- `app-shell/src/renderer/src/modules/documents/MainView.svelte` — the rewrite (the only logic change)
- `app-shell/src/renderer/src/styles/tokens.css` — added `--font-serif`

No changes to store, IPC, main process, SQL schema, or the module contract.

## Validated (live, in the running app)

WYSIWYG render (markdown → serif H1 + prose) · live word count + dirty flag on edit · Cmd+S → save + new version in History · clean content-swap between docs with no edit bleed · persisted edit survives a round-trip through the DB. Build + typecheck clean.

## Notes / carry-forward

- **Screenshot capture in this sandbox:** `screencapture` is TCC-blocked and computer-use's saved images aren't on the repo filesystem. Now solved permanently: the **`SHELL_CAPTURE=<path>` dev hook** in `main/index.ts` (`maybeCaptureForEvidence`) — app self-captures via `webContents.capturePage()`, writes the PNG, self-quits. Documented in `implementation/AGENTS.md` › "Capturing UI evidence". Use it for every future UI slice.
- **Handoff-03 item 4 (auto-expand):** does **not** reproduce on a cold launch — folders render collapsed. Likely was state from a prior in-session interaction, not a bug. Lower priority than thought.

## What's next (recommended order)

1. **Command palette + keybindings** — shell UI/runtime for the Commands primitive (Cmd+K). Modules already register command handlers; this is the missing UI side and a built-in draftwell lacks. Highest-value next slice.
2. **Editor polish (optional, when needed):** toolbar / bubble menu / slash commands; wire `editor.fontFamily`/`fontSize`/`spellcheck` settings (currently only the serif default is applied); debounced auto-save.
3. **Status bar zone design** — visual/layout polish (renders, but stub).
4. **Remaining modules** — Journal, Assets, Export/Workflow Runner, Table View, AI Chat/Prompt Studio, Web.
