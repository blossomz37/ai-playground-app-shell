# CLAUDE.md

Durable project orientation for agents and developers working in this repository.

## Project Status

App Shell is a reusable local-first Electron desktop shell with a Svelte 5 renderer, SQLite persistence, and a module contract for building purpose-specific authoring/workflow apps.

The runnable application lives in `app-shell/`. This repository also contains shared documentation, agent planning artifacts, validation evidence, and historical archives.

As of 2026-06-06:

- The foundational architecture decisions are resolved in `docs/architecture/shell-platform-spec.md` §12.
- The app defaults to no demo manuscript content and no mock AI fallback unless Demo Mode is explicitly enabled.
- The active handoff chain is under `workspace-agents/session-handoffs/`.
- Recent active plans are under `workspace-agents/implementation/plans/`.
- Older plans, handoffs, screenshots, mockups, and pre-spec material are archived under `archive/`.

## What This Is

This is a reusable desktop shell, not a single writing app. The shell owns universal primitives and lets modules contribute purpose-specific views, commands, document types, settings, jobs, and state.

The mental model is closer to Obsidian or VS Code than to a bespoke single-purpose tool: the shell is the host; apps are assembled from modules.

## Architecture Commitments

- Shell owns primitives: workspace, documents, panels, commands, settings, jobs, and module registration.
- Modules declare capabilities through manifests and activate through `ModuleContext`.
- Modules must not patch shell internals or redefine the workspace contract.
- Core logic belongs in framework-agnostic TypeScript where practical.
- Svelte components should stay focused on UI.
- SQLite is the source of truth for live documents and workspace data.
- Files are import provenance and export targets, not the live editing source.
- Local-first is a core constraint; no cloud dependency belongs in the shell core.

## Core Docs

- `docs/README.md` - developer-facing documentation map.
- `docs/architecture/shell-platform-spec.md` - platform decisions and primitives.
- `docs/architecture/shell-spec.md` - shell implementation/spec detail.
- `docs/architecture/module-contract.md` - module boundary and API contract.
- `docs/architecture/modules-overview.md` - first-party module map.
- `docs/modules/documents.md` - Documents module design spec.
- `docs/reference/` - prior art and anchor analysis.

## Current Workspace Layout

```text
app-shell-project/
├── AGENTS.md
├── CLAUDE.md
├── docs/
│   ├── README.md
│   ├── architecture/
│   ├── modules/
│   ├── product/
│   └── reference/
├── workspace-agents/
│   ├── implementation/
│   │   ├── AGENTS.md
│   │   ├── plans/
│   │   ├── screenshots/
│   │   └── user_feedback/
│   └── session-handoffs/
├── app-shell/
├── .agent/
├── .ideas/
└── archive/
```

## Active Agent Artifacts

Read the newest numbered handoff first:

- `workspace-agents/session-handoffs/HANDOFF_56.md` is the latest handoff at the time of this cleanup.
- `workspace-agents/session-handoffs/HANDOFF_54.md` and `HANDOFF_55.md` are retained for immediate recent context.
- Older handoffs are archived in `archive/workspace-agents/session-handoffs/`.

Visible recent plans:

- `workspace-agents/implementation/plans/39-core-and-custom-modules.md`
- `workspace-agents/implementation/plans/40-enhanced-table-view-filters.md`
- `workspace-agents/implementation/plans/41-assets-project-document-links.md`

Older plans are archived in `archive/workspace-agents/implementation/`.

## Validation Baseline

Run from `app-shell/` for app implementation work:

```bash
npm run typecheck
npm run build
```

For UI-visible changes, capture screenshot evidence with the hook documented in `workspace-agents/implementation/AGENTS.md`, usually:

```bash
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/<slice>-after-YYYY-MM-DD.png npm run start
```

Repository maintenance work should also run:

```bash
git status --short --branch
git diff --check
```

## Fresh Session Reading Order

1. `AGENTS.md`
2. `CLAUDE.md`
3. `.agent/knowledge/WORKSPACE_ORIENTATION.md`
4. Newest `workspace-agents/session-handoffs/HANDOFF_NN.md`
5. `docs/architecture/shell-platform-spec.md` §12
6. `docs/architecture/module-contract.md`
7. `workspace-agents/implementation/AGENTS.md` when planning or validating implementation work

If docs disagree, prefer live code and the newest handoff, then update the stale doc instead of carrying the mismatch forward.
