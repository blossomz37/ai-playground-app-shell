# AGENTS.md - App Shell Project

This is the root operating guide for AI agents working in this workspace. Read this first, then follow the source-of-truth chain below.

## First Read

1. `CLAUDE.md` - durable project orientation and committed architecture.
2. Latest `session-handoffs/HANDOFF_NN.md` - current session-to-session state. Use the highest number, not the file named in older docs.
3. `.agent/knowledge/WORKSPACE_ORIENTATION.md` - concise current map for agents.
4. `0-shell-platform-spec.md` section 12 - resolved platform decisions.
5. `3-module-contract.md` - module boundary and API contract.

If these disagree, prefer current code and the newest handoff, then update the stale doc instead of carrying the mismatch forward.

## Current Project Shape

This workspace is a reusable Electron desktop shell with a Svelte 5 renderer and SQLite-backed local persistence. It is a shell/platform project, not a single writing app.

Key directories:

- `app-shell/` - runnable Electron + Svelte app.
- `app-shell/src/main/` - Electron main process, core services, module registry, IPC.
- `app-shell/src/renderer/` - Svelte UI, shell chrome, module views.
- `app-shell/src/shared/` - shared contracts and types.
- `modules/` - module design specs.
- `implementation/plans/` - execution plans for larger slices.
- `implementation/screenshots/` - UI validation evidence.
- `session-handoffs/` - numbered handoffs, one per session.
- `.agent/` - agent-facing workspace index, stable knowledge, and notes.
- `archive/` - spent decision material; read only when needed.

## Shared Workspace Rules

Other agents may be working in the same tree.

- Check `git status --short --branch` before edits.
- Do not revert or rewrite changes you did not make.
- Keep work scoped to the requested slice.
- Before meaningful UI changes, note the intended files and validation path.
- For risky or destructive actions, ask Carlo first.
- Commit after each logical unit when asked or when a slice is complete and verified.

## Implementation Rules

- For ambitious slices, write or update a plan in `implementation/plans/` before implementation.
- For small direct fixes, skip the plan and keep the change focused.
- UI-visible changes need screenshot evidence in `implementation/screenshots/`.
- Preserve the architecture boundary: shell owns primitives; modules contribute through the module contract.
- Keep core logic framework-agnostic TypeScript outside Svelte components when practical.
- Module logic should use `ModuleContext`; modules must not patch shell internals.
- SQLite is the local source of truth for documents and workspace data.

## Commands

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
npm run start
```

For screenshot evidence:

```bash
SHELL_CAPTURE=../implementation/screenshots/<slice>-after-YYYY-MM-DD.png npm run start
```

See `implementation/AGENTS.md` for screenshot naming and capture details.

## Documentation Expectations

- Durable project orientation belongs in `CLAUDE.md`.
- Agent-facing quick orientation belongs in `.agent/knowledge/WORKSPACE_ORIENTATION.md`.
- Session carry-forward belongs in `session-handoffs/HANDOFF_NN.md`.
- Plans belong in `implementation/plans/`.
- Do not duplicate large architecture sections across files; link to the canonical source.
