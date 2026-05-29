# Session Handoff 02 — App Shell Project

_Last session: 2026-05-29 · Status: pre-implementation. **Module contract designed.**_

Read this, then `CLAUDE.md`, then `3-module-contract.md`. Lean by design (HANDOFF_01 is the heavier founding brief).

## What happened this session
Resolved the open §4 question from HANDOFF_01 — Carlo chose **(A) design the module contract** over (B) scaffold-first. Delivered it.

- Wrote the keystone: **`3-module-contract.md`** — the rules for how a plugin plugs into the core shell.
- Plan + rationale: **`implementation/plans/01-module-contract.md`**.
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

## Next action (recommended)
**Plan 02 — the Documents module.** First real module, specced against `3-module-contract.md` §7 (the Write-room mapping is already the skeleton). Start `implementation/plans/02-documents-module.md`. This was in progress at session end.

## Carlo's working style (carry-over)
Explain before doing; keep it simple, avoid decision overwhelm; offer options on real forks, decide the obvious ones; confirm before destructive/source-of-truth changes. He confirmed the "plugin/module/extension are synonyms; spec keeps 'module'" call — rename is cosmetic if ever wanted.
