# App Shell Repository Maintenance Protocol

Goal: reduce repository bloat, eliminate stale working artifacts, consolidate active knowledge, and keep the repository navigable for humans, software developers, and AI agents.

This protocol covers the development repository around the shell. It does not cover app implementation cleanup. Do not inspect, move, archive, delete, or rewrite anything inside `app-shell/` as part of this maintenance pass unless Carlo separately asks for app-code cleanup.

This is not a code refactor. It is repository maintenance and information architecture.

## Operating Principle

Assume the authoritative docs may be stale. Use live repository evidence first:

1. `git status --short --branch`
2. Live directory tree outside `app-shell/`
3. Current highest-numbered file in `workspace-agents/session-handoffs/`
4. Current highest-numbered file in `workspace-agents/implementation/plans/`
5. Current screenshot evidence in `workspace-agents/implementation/screenshots/`
6. Current specs in `docs/architecture/`
7. Existing archive contents

Only after that, compare against `AGENTS.md`, `CLAUDE.md`, `.agent/knowledge/WORKSPACE_ORIENTATION.md`, `docs/README.md`, `archive/README.md`, and any local README files. When docs disagree with the live tree, mark the docs stale and propose the smallest useful refresh.

Folder names should make sense without private project context. Treat unclear names as navigability debt even when the files inside are valuable.

## Current Standard Layout

The intended non-`app-shell/` layout is:

```text
docs/
  README.md
  product/
  architecture/
    shell-platform-spec.md
    shell-spec.md
    modules-overview.md
    module-contract.md
  modules/
    documents.md
  reference/
workspace-agents/
  implementation/
    AGENTS.md
    plans/
    screenshots/
    user_feedback/
  session-handoffs/
.agent/
.ideas/
archive/
```

Avoid reintroducing ambiguous root folders such as:

- `prd/` for mixed product and architecture specs.
- root `modules/` for design documents.
- root `reference/` for documentation references.
- root `implementation/` for agent plans/evidence.
- root `session-handoffs/` for agent handoffs.

## Scope

Included:

- Root-level guidance and navigation docs.
- `docs/` organization and broken references.
- `.agent/` knowledge and notes.
- `.ideas/` exploratory files and generated design assets.
- `.playwright-mcp/` temporary logs and page dumps.
- `archive/` organization and archive index accuracy.
- `sample-assets-import/` and `sample-assets-export/` fixture/evidence status.
- `workspace-agents/` plans, handoffs, screenshots, and user feedback.
- Root clutter such as `.DS_Store`.

Excluded:

- `app-shell/` and all nested code, dependencies, runtime state, screenshots, databases, build output, and generated app artifacts.
- `.git/`, except for status/history checks.
- Destructive cleanup without an explicit path list.

## Safety Rules

- Start from an inventory before moving or deleting.
- Prefer archive over deletion unless the file is machine noise such as `.DS_Store`.
- Do not archive a file referenced by the newest handoff, a current plan, current validation instructions, or a still-used fixture flow.
- Treat folder renames as migrations: use `git mv`, update references in the same change, and validate old paths are gone or intentionally historical.
- Keep all proposed moves reversible.

## Phase 1 - Inventory

Run from the repository root, excluding `app-shell/`:

```bash
git status --short --branch
find . -maxdepth 3 -type f -not -path './app-shell/*' -not -path './.git/*' | sort
find . -maxdepth 3 -type d -not -path './app-shell*' -not -path './.git*' | sort
du -sh ./* ./.agent ./.ideas ./.playwright-mcp 2>/dev/null | sort -h
find . -name '.DS_Store' -not -path './app-shell/*' -not -path './.git/*' -print
```

Report:

- File counts by major directory.
- Largest non-`app-shell/` directories.
- Latest plan number and handoff number.
- Screenshot count and newest screenshot group.
- Existing archives and what they claim to contain.
- Stale docs or references to missing paths.
- Machine-noise candidates.

## Phase 2 - Classify

Classify files into five categories.

### Current Navigation

Files a human or agent should read first:

- `AGENTS.md`
- `CLAUDE.md`
- `.agent/knowledge/WORKSPACE_ORIENTATION.md`
- `docs/README.md`
- Newest `workspace-agents/session-handoffs/HANDOFF_NN.md`
- `workspace-agents/implementation/AGENTS.md`
- `archive/README.md`

### Current Canonical Docs

Files that define product, architecture, and module commitments:

- `docs/architecture/shell-platform-spec.md`
- `docs/architecture/shell-spec.md`
- `docs/architecture/modules-overview.md`
- `docs/architecture/module-contract.md`
- `docs/modules/documents.md`
- Active files under `docs/reference/`

### Active Working Artifacts

Files needed for the next one or two development slices:

- Newest handoff.
- Current and most recent implementation plans.
- Screenshot evidence for current/recent plans.
- Fixture folders still used by capture smoke flows.
- User feedback that has not yet been converted into a plan or decision.

### Historical Provenance

Files worth preserving but not needed for normal orientation:

- Older handoffs.
- Completed plans outside the current work horizon.
- Older screenshot evidence.
- Dev mockups already moved into `archive/dev-mockups/`.
- Pre-spec planning in `archive/pre-spec-planning/`.
- Existing zip archives under `archive/workspace-agents/`.

### Noise

Files that add no project value:

- `.DS_Store`
- Stale `.playwright-mcp/*.log` and page dumps after confirming no current task references them.
- Empty directories.
- Duplicate exported sample output after confirming it is not active validation evidence.

## Phase 3 - Reconcile Stale Authority

Search for stale or ambiguous paths:

```bash
rg -n "prd/|`modules/|`reference/|0-shell-platform-spec|1-shell-spec|2-modules-overview|3-module-contract|implementation/plans|implementation/screenshots|session-handoffs" \
  -g '!app-shell/**' \
  -g '!.git/**'
```

Interpret matches carefully:

- `docs/modules/`, `docs/reference/`, `workspace-agents/implementation/*`, and `workspace-agents/session-handoffs/*` are current.
- Archived historical files may mention old names, but current navigation docs should not point users there.
- If a current doc points to a missing path, fix the doc.

Deliver a concise stale-doc matrix:

| File | Stale claim | Live evidence | Fix |
| --- | --- | --- | --- |

## Phase 4 - Consolidation Plan

Produce an exact path plan before moving or deleting.

### Handoffs

Keep active:

- Newest handoff.
- Previous one or two handoffs if they clarify current work.

Archive:

- Older handoffs superseded by current plans and the latest handoff.

Preferred archive:

```text
archive/workspace-agents/session-handoffs/session-handoffs-YYYYMMDD-through-HANDOFF_NN.zip
```

### Implementation Plans

Keep active:

- Current plan, if one is active.
- Recent completed plans that may shape the next slice.
- `workspace-agents/implementation/plans/README.md`

Archive:

- Completed plans no longer needed for orientation.
- Superseded plans replaced by newer numbered plans.

Preferred archive:

```text
archive/workspace-agents/implementation/plans-NN-through-NN-YYYYMMDD.zip
```

### Screenshot Evidence

Keep active:

- Screenshot evidence tied to current/latest plans.
- Screenshots explicitly referenced by current handoff or validation instructions.
- `workspace-agents/implementation/screenshots/README.md`

Archive:

- Routine completion screenshots for closed plans.
- Redundant before/after images after the plan and handoff no longer need quick access.

Preferred archive:

```text
archive/workspace-agents/implementation/screenshots-YYYYMMDD-through-YYYYMMDD.zip
```

### Ideas

Keep active:

- Current exploratory notes still under discussion.
- This maintenance protocol until it is executed or replaced.

Archive:

- Design experiments already accepted, rejected, or moved into plans/specs.

Delete only with approval:

- Generated images or large exploratory assets with no surviving reference.

### Playwright MCP Dumps

Delete or archive after confirming no current task references them:

- `.playwright-mcp/*.log`
- `.playwright-mcp/*.yml`

Default recommendation: delete as temporary automation artifacts after a dry run.

### Sample Asset Folders

Treat as fixtures until proven otherwise:

- `sample-assets-import/`
- `sample-assets-export/`

Before archiving or deleting, search current plans, handoffs, screenshot README, and app capture hooks for references.

## Phase 5 - Execute

After the path plan is accepted or clearly implied by the maintenance request:

1. Remove machine noise such as `.DS_Store`.
2. Create or update archive zip files.
3. Move only approved historical artifacts.
4. Update `archive/README.md`.
5. Refresh minimal navigation docs.
6. Use `git mv` for tracked path migrations.
7. Leave `app-shell/` untouched.

## Phase 6 - Validation

Run:

```bash
git status --short --branch
find . -name '.DS_Store' -not -path './app-shell/*' -not -path './.git/*' -print
find . -maxdepth 3 -type f -not -path './app-shell/*' -not -path './.git/*' | sort
rg -n "prd/|`modules/|`reference/|0-shell-platform-spec|1-shell-spec|2-modules-overview|3-module-contract" \
  -g '!app-shell/**' \
  -g '!.git/**'
git diff --stat
git diff --check
```

Verify:

- Newest handoff remains easy to find.
- Current plans remain easy to find.
- Current screenshots remain easy to find.
- Archive README matches archive contents.
- Root guidance does not point agents to missing directories.
- `app-shell/` has no changes.

## Deliverables

Report:

- Files changed.
- Folders renamed or intentionally left unchanged.
- Archives created.
- Files moved or removed.
- Docs refreshed.
- Space saved, if measurable.
- Validation performed.
- Confirmation that `app-shell/` was untouched.

## Success Criteria

The repo should let a human or agent answer these quickly:

- What is the current source of truth?
- What changed most recently?
- What plan or handoff matters next?
- Which artifacts are historical?
- Which files are safe to ignore?

The cleanup succeeds when active knowledge is consolidated, historical information is preserved, stale authority is corrected, and the repo is easier to navigate without losing useful development evidence.
