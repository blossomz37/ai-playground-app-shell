# AGENTS.md - App Shell Project

This is the root operating guide for AI agents working in this workspace. Read this first, then follow the source-of-truth chain below.

## First Read

1. `CLAUDE.md` - durable project orientation and committed architecture.
2. Latest `workspace-agents/session-handoffs/HANDOFF_NN.md` - current session-to-session state. Use the highest number, not the file named in older docs.
3. `.agent/knowledge/WORKSPACE_ORIENTATION.md` - concise current map for agents.
4. `docs/architecture/shell-platform-spec.md` section 12 - resolved platform decisions.
5. `docs/architecture/module-contract.md` - module boundary and API contract.

If these disagree, prefer current code and the newest handoff, then update the stale doc instead of carrying the mismatch forward.

## Current Project Shape

This workspace is a reusable Electron desktop shell with a Svelte 5 renderer and SQLite-backed local persistence. It is a shell/platform project, not a single writing app.

Key directories:

- `app-shell/` - runnable Electron + Svelte app.
- `app-shell/src/main/` - Electron main process, core services, module registry, IPC.
- `app-shell/src/renderer/` - Svelte UI, shell chrome, module views.
- `app-shell/src/shared/` - shared contracts and types.
- `docs/` - product, architecture, module, and reference documentation.
- `docs/modules/` - module design specs.
- `workspace-agents/implementation/plans/` - execution plans for larger slices.
- `workspace-agents/implementation/screenshots/` - UI validation evidence.
- `workspace-agents/session-handoffs/` - numbered handoffs, one per session.
- `.agent/` - agent-facing workspace index, stable knowledge, and notes.
- `.agent/protocols/REPO_MAINTENANCE.md` - standing cleanup and preventative maintenance workflow.
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

- For ambitious slices, write or update a plan in `workspace-agents/implementation/plans/` before implementation.
- For small direct fixes, skip the plan and keep the change focused.
- UI-visible changes need screenshot evidence in `workspace-agents/implementation/screenshots/`.
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
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/<slice>-after-YYYY-MM-DD.png npm run start
```

See `workspace-agents/implementation/AGENTS.md` for screenshot naming and capture details.

## Documentation Expectations

- Durable project orientation belongs in `CLAUDE.md`.
- Agent-facing quick orientation belongs in `.agent/knowledge/WORKSPACE_ORIENTATION.md`.
- Session carry-forward belongs in `workspace-agents/session-handoffs/HANDOFF_NN.md`.
- Plans belong in `workspace-agents/implementation/plans/`.
- Do not duplicate large architecture sections across files; link to the canonical source.

## Code Bloat Quality Gate

Before implementing, inspect the existing code paths and reuse established patterns unless there is a concrete reason not to.

During implementation:
- Keep the change limited to the stated plan. Do not add adjacent features, speculative hooks, new frameworks, or broad refactors.
- Prefer editing existing components/services over creating new ones.
- Add a new file, abstraction, helper, dependency, state slice, IPC channel, or schema field only if it is directly required by the acceptance criteria.
- If adding an abstraction, state what duplication or complexity it removes. If it does not remove real complexity now, inline it.
- Delete or avoid dead scaffolding, placeholder APIs, unused types, and “future-ready” options.
- Keep public interfaces minimal: expose only what the UI or caller actually uses in this slice.
- After implementation, do a bloat pass: list every new file/export/type/helper and remove anything not exercised by the feature or tests.

Final response must include:
1. Files changed.
2. Any new abstractions and why they were necessary.
3. Anything intentionally not built to avoid scope creep.
4. Validation performed.
