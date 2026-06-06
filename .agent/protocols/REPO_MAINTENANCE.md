# Repo Maintenance Protocol

Use this mode when Carlo asks for repository cleanup, decluttering, stale-doc repair, archive pruning, or preventative maintenance.

This protocol covers the development workspace around App Shell. Do not touch `app-shell/` unless the request explicitly includes app implementation cleanup.

## First Checks

Run from the repo root:

```bash
git status --short --branch
find . -maxdepth 3 -type d -not -path './app-shell*' -not -path './.git*' | sort
find . -maxdepth 3 -type f -not -path './app-shell/*' -not -path './.git/*' | sort
du -sh ./* ./.agent ./.ideas 2>/dev/null | sort -h
```

Trust live repo evidence over old docs. If guidance conflicts, prefer current code, the newest handoff, and the current directory layout.

## Standard Layout

Keep this shape unless Carlo approves a new convention:

```text
docs/                 shared developer-facing docs
workspace-agents/     plans, screenshots, handoffs, feedback
.agent/               durable agent guidance and compact knowledge
.ideas/               exploratory notes only
archive/              historical material safe to skip during orientation
app-shell/            runnable app, excluded from repo-maintenance cleanup
```

Do not reintroduce root `prd/`, root `modules/`, root `reference/`, root `implementation/`, or root `session-handoffs/`.

## What To Keep Active

- Newest `workspace-agents/session-handoffs/HANDOFF_NN.md`
- Previous one or two handoffs if they clarify current work
- Current and recent plans in `workspace-agents/implementation/plans/`
- Screenshot evidence referenced by current plans/handoffs
- Fixture folders still used by validation hooks
- Concise navigation docs: `AGENTS.md`, `CLAUDE.md`, `docs/README.md`, `.agent/knowledge/WORKSPACE_ORIENTATION.md`

## What To Archive

- Older handoffs
- Completed plans outside the current work horizon
- Older screenshot evidence
- Spent design mockups, audits, and planning material

Use zip archives under:

```text
archive/workspace-agents/implementation/
archive/workspace-agents/session-handoffs/
```

Update `archive/README.md` when adding archives.

## What To Delete

Delete only clear machine noise without approval:

- `.DS_Store`
- unreferenced `.playwright-mcp/` logs/page dumps
- empty directories

For anything else, archive or list exact paths before deleting.

## Stale Reference Check

Run:

```bash
rg -n "prd/|`modules/|`reference/|0-shell-platform-spec|1-shell-spec|2-modules-overview|3-module-contract|workspace-agents/workspace-agents" \
  -g '!app-shell/**' \
  -g '!.git/**'
```

Current paths should point to:

- `docs/architecture/`
- `docs/modules/`
- `docs/reference/`
- `workspace-agents/implementation/`
- `workspace-agents/session-handoffs/`

Historical archives may mention old names. Current navigation docs should not.

## Finish Criteria

Before finishing:

```bash
git status --short --branch
git diff --check
find . -name '.DS_Store' -not -path './app-shell/*' -not -path './.git/*' -print
```

Also verify:

- No `app-shell/` files changed unless explicitly requested.
- Active screenshot references resolve.
- Archive contents are listed in `archive/README.md`.
- The repo still has one obvious reading path for the next human or agent.

Commit the maintenance slice when it is complete and verified.
