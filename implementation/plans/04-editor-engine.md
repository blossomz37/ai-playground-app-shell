# Plan 04 — Editor Engine Slice (TipTap, F1)

_Status: DONE — 2026-05-29_
_Anchor: `modules/documents.md` (F1 — "Editor engine"; `views.main` editor-agnostic); `3-module-contract.md` (`views.main` contribution); `1-shell-spec.md` §3 (`content`/`contentFormat = markdown`)._

## Goal & scope

Replace the `<textarea>` stub in the Documents module's `MainView.svelte` with a real **TipTap 3 WYSIWYG editor** in a thin Svelte 5 wrapper. The editor reads/writes the active document's content as **markdown** (the storage format), keeping the existing save pipeline, version history, and word count working unchanged.

Deliverable: selecting a document renders its markdown as formatted prose; editing marks the doc dirty; Cmd+S saves and creates a version; switching documents swaps content without bleeding edits across docs.

## Engine decision (resolved 2026-05-29)

- **Engine: TipTap 3** (`@tiptap/core` + `@tiptap/pm` + `@tiptap/starter-kit`, all `^3.23`). Chosen over Carta because the reference app **draftwell uses TipTap** for its Write room (`reference/draftwell-anchor-analysis.md` line 45) and the spec names it as the likely engine. WYSIWYG matches the authoring use case.
- **Markdown round-trip: `tiptap-markdown@^0.9`** — peer `@tiptap/core@^3.0.1` (TipTap 3-compatible, verified). Parses markdown → ProseMirror on load, serializes ProseMirror → markdown via `editor.storage.markdown.getMarkdown()`. This keeps the DB `contentFormat = 'markdown'` invariant intact. If round-trip fidelity ever bites, the serializer can be swapped for a custom `prosemirror-markdown` setup behind the same view — the contract is editor-agnostic.
- **Svelte integration:** instantiate `@tiptap/core` `Editor` directly in `onMount`/`onDestroy` (thin wrapper). No `svelte-tiptap` dependency needed for a single-pane editor with no bubble/floating menus yet.

## Approach (build order)

1. `npm install` the four deps into `app-shell` (`@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `tiptap-markdown`).
2. Add a `--font-serif` token to `tokens.css` (editor default is `serif` per `modules/documents.md` §settings).
3. Rewrite `MainView.svelte`:
   - `onMount`: create `Editor` with `StarterKit` + `Markdown` extensions, initial content = current `editorContent` (markdown).
   - `onUpdate`: `editorContent.set(editor.storage.markdown.getMarkdown())`; `isDirty.set(true)`.
   - `$effect` on `$activeDocId`: when the doc switches, `setContent(markdown, false)` (no emit) so edits don't leak between docs and the switch doesn't mark dirty.
   - Keep Cmd+S → `saveDoc()` (now a ProseMirror keymap-friendly handler on the wrapper).
   - `onDestroy`: `editor.destroy()`.
4. Style `.ProseMirror` prose (serif, headings, paragraphs) within the existing `.editor-area` chrome; keep the doc header.
5. `npm run typecheck`, then `npm run start` and validate.

## Files / areas touched

- `app-shell/package.json` (deps) + `package-lock.json`
- `app-shell/src/renderer/src/styles/tokens.css` (serif token)
- `app-shell/src/renderer/src/modules/documents/MainView.svelte` (the rewrite)

No changes to: store, IPC, main process, schema, contract. `editorContent` stays markdown — word count (`countWords($editorContent)`) and `saveDoc()` are untouched.

## Risks & unknowns

- **Feedback loop** between the store and `onUpdate`. Mitigation: only push store→editor on `activeDocId` change with `emitUpdate=false`; editor→store flows one way via `onUpdate`.
- **Markdown round-trip drift** (e.g. `# ` heading normalization, list markers). Acceptable for the slice; StarterKit + tiptap-markdown handles common CommonMark. Note any surprises in the handoff.
- **Native/ESM bundling** — these are pure-JS renderer deps bundled by Vite; no `electron-rebuild` interaction.

## Validation

- Typecheck passes.
- App launches; selecting Chapter 1 renders `# Chapter 1 …` as a real `<h1>` + paragraph (not raw `#`).
- Typing marks the doc dirty (status reflects); Cmd+S saves and a version appears in the inspector History.
- Switching to a sibling scene swaps content cleanly; switching back shows the saved edit.
- **Screenshots (required):** `editor-engine-before-2026-05-29.png` (textarea — from prior scaffold shot if available) and `editor-engine-after-2026-05-29.png` (TipTap rendering a chapter).

## Outcome (2026-05-29)

Built and validated live in the running Electron app. All checks passed:
- Typecheck + production build clean (renderer bundle 1.1 MB with TipTap/ProseMirror).
- Markdown `# Chapter 1 …` renders as a real serif `<h1>` + prose paragraph — WYSIWYG, no raw `#`.
- Typing live-updates the word count (19 → 23) and flips status to `● unsaved`.
- Cmd+S saves and creates a version — inspector History gained the `02:25 PM` entry; status returned to `✓ saved`.
- Switching to Chapter 2 swapped content cleanly (own H1/word count, empty History) **without** marking dirty — the `emitUpdate: false` reconciliation works, no edit bleed.
- Switching back to Chapter 1 showed the persisted edit (23 words + version) — full DB round-trip (save → reopen → markdown re-parse → render) confirmed.

Evidence: `implementation/screenshots/editor-engine-after-2026-05-29.png` (captured via `webContents.capturePage()` — the sandbox shell lacks macOS screen-recording permission and computer-use's saved images aren't exposed to the repo filesystem; this was first done with a temporary hook during the slice, then crystallized into the permanent `SHELL_CAPTURE` dev hook — see `implementation/AGENTS.md`). Incidental finding: on a cold launch the Act folders render **collapsed**, so handoff-03 item 4's auto-expand observation does not reproduce from a fresh start.

No changes to store, IPC, main process, schema, or contract — `editorContent` stays markdown end to end.

## Out of scope

- Toolbar / bubble menu / slash commands (later).
- Command palette + keybindings (separate slice — handoff item 3).
- Auto-save / debounced save (manual Cmd+S only, as today).
- Settings-driven font/size wiring (`editor.fontFamily` etc.) beyond the serif default.
- The NavView auto-expand bug (handoff item 4).
