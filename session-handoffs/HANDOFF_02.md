# Session Handoff 02 — App Shell Project

_Last session: 2026-05-29 · Status: pre-implementation. **Module contract + first module (Documents) + document schema designed.**_

Read this, then `CLAUDE.md`, then `3-module-contract.md`, then `modules/documents.md`. Lean by design (HANDOFF_01 is the heavier founding brief).

## What happened this session
Resolved the open §4 question from HANDOFF_01 — Carlo chose **(A) design the module contract** over (B) scaffold-first. Delivered the contract, then the first module against it, then the document schema.

- Wrote the keystone: **`3-module-contract.md`** — the rules for how a plugin plugs into the core shell.
- Specced the first real module: **`modules/documents.md`** (Write + Plan) — validated the contract end-to-end with **no contract change needed**. Per-module specs now live in a new top-level **`modules/`** dir.
- Designed the **document schema** (shell-owned, app-neutral) in **`1-shell-spec.md` §3** — with the shell-universal vs. module-extension split (`manuscriptId`/`wordCount` stay module-level).
- Plans + rationale: **`implementation/plans/01-module-contract.md`** and **`02-documents-module.md`**.
- Added two primitives Carlo flagged (Obsidian parity): **Secrets** (core) and **Web browser** (module). Recorded as §12 **Q12** / **Q13**.
- Fixed a stale line in `0-shell-platform-spec.md` §8 (said files-as-truth; corrected to DB-as-truth per Q6 — HANDOFF_01 had warned about this).

## The contract in one screen (so you don't have to re-derive it)
A module is defined by three faces:
1. **Declares** — `ModuleManifest`: id/version, activation rules, the *shape* of contributions (which zones, which commands/doc-types/jobs), permissions. Inert data; readable without running module code (so the shell can draw the rail icon pre-activation).
2. **Provides** — `ModuleContributions` + `activate(ctx)`/`deactivate()`: Svelte view components per zone, command handlers, job runners, a **core-side state slice**.
3. **Receives** — `ModuleContext`: the *only* door to shell services (`commands`, `settings`, `secrets`, `jobs`, `events`, `documents`, `notify`, `theme`, `workspace`). No other way to touch the shell ⇒ can't patch internals.

Validated by §7: draftwell's Write room mapped piece-by-piece (tree, editor, ~40 hooks, version history, every command, even cross-cutting "Run AI Review") with no leftover bucket.

## Decisions locked this session (don't relitigate)
- **Contract shape:** declarative manifest + imperative `activate(ctx)` (VS Code model, not Obsidian's single-class). Carlo confirmed.
- **Off by default, enabled-state persists** (§6 lifecycle). `onUserEnable` is primary; lazy activation = no `activate()` until first use, so startup stays cheap.
- **Logic internal for v1, clean boundary** (D2): logic is plain TS reached only via `ctx` + the slice's subscribe interface — never tangled into Svelte. Externalizing for LAN/iPad (Q10) later = moving code, not rewriting. **No reactivity-bridge spike needed.**
- **Secrets → core** (Q12): OS-keychain via Electron `safeStorage`, never plaintext SQLite; `ctx.secrets` gated by `secrets.read` capability; manage-UI in shell Settings.
- **Web → module** (Q13): bundled, default-on (mirrors Obsidian's Web viewer = a core *plugin*). Its one shell hook — a managed persistent web-session/partition — is deferred until the module is built.
- **Documents: Plan folds in** (F2) as `kind: "plan"` + an inspector section. **Editor stays agnostic** (F1): main view reads/writes via the slice + `ctx.documents`; concrete engine (likely TipTap/ProseMirror in a Svelte wrapper — TipTap's core is *not* React-bound) chosen at scaffold after an ecosystem check.
- **Document schema app-neutral** (F3): shell `documents`/`document_versions` carry no authoring assumptions; `manuscriptId`/`wordCount`/`importId` are module-level or derived, not shell columns.

## Next action (recommended)
**The scaffolding slice (Option B).** Contract + first module + schema are designed on paper; the natural next move is to stand up Electron + Svelte + SQLite as a thin vertical slice and build Documents against the contract — this is where the editor engine (F1) gets locked (run a fresh ecosystem check first). Alternative: spec a second module (e.g. Journal) to further stress the contract before scaffolding. Carlo's call.

## Carlo's working style (carry-over)
Explain before doing; keep it simple, avoid decision overwhelm; offer options on real forks, decide the obvious ones; confirm before destructive/source-of-truth changes. He confirmed the "plugin/module/extension are synonyms; spec keeps 'module'" call — rename is cosmetic if ever wanted.
