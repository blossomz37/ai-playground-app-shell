# AGENTS.md — Implementation Workspace

This folder is where implementation work is **planned and validated**. Two jobs:

1. **`plans/`** — detailed plans written *before* execution.
2. **`screenshots/`** — screenshot evidence captured *during* validation.

For project orientation and committed decisions, see `../../CLAUDE.md` and `../../docs/architecture/shell-platform-spec.md` §12. This file governs only how work gets planned and validated here.

```
workspace-agents/implementation/
├── AGENTS.md          ← this file
├── plans/             ← one plan per slice, before you build it
└── screenshots/       ← UI validation evidence
```

---

## Plans (`plans/`)

**Write a plan when** the work is an ambitious, detailed slice — something big enough to warrant its own execution cycle and a real git commit. **Skip the plan** for small changes that don't warrant a full commit; just make those directly.

**A plan is a thinking artifact, not a status report.** It should let a fresh agent execute the slice without re-deriving the approach. Include:
- **Goal & scope** — what this slice delivers, in one or two lines.
- **Anchor** — which spec section / primitive / module it implements (e.g. `docs/architecture/shell-spec.md` §2 layout, or the Documents module).
- **Approach** — the step-by-step build order, with the key design choices made explicit.
- **Files / areas touched** — where the work lands.
- **Risks & unknowns** — what might break or needs a decision mid-flight.
- **Validation** — how you'll prove it works, including **which screenshots are required** (any change that should show in the UI needs them — see below).
- **Out of scope** — what this slice deliberately does *not* do.

**Naming:** `NN-short-slug.md`, numbered in execution order — e.g. `01-module-contract.md`, `02-documents-module.md`. The number gives a fresh agent the sequence at a glance.

**Lifecycle:** draft the plan → align with Carlo before building (don't execute an ambitious plan unprompted) → execute → validate with screenshots → record the outcome. Keep the plan as the durable record of *why* the slice was built the way it was; the session handoff (`../session-handoffs/`) is the lean summary that points back to it.

---

## Screenshots (`screenshots/`)

**Always capture screenshot evidence when validating a change that should reflect in the UI.** This is a standing expectation, not a per-task ask — a UI change isn't validated until there's a screenshot showing it.

**Store** the evidence here, and **reference it** from the plan's Validation section and the session handoff.

**Naming:** `<slice-or-feature>-<state>-<YYYY-MM-DD>.png` — and capture **before/after pairs** when the change alters existing UI, so the diff is visible. Examples:
- `module-contract-sidebar-after-2026-05-30.png`
- `theme-tokens-dark-before-2026-05-30.png` / `theme-tokens-dark-after-2026-05-30.png`

Keep the latest validating shot for a feature; prune superseded ones so the folder stays evidence, not clutter.

### Capturing UI evidence (`SHELL_CAPTURE`)

The app captures its own window — the reliable way to land a real PNG in this folder from an agent sandbox where `screencapture` is TCC-blocked and the computer-use MCP saves images off-repo. The hook lives in `app-shell/src/main/index.ts` (`maybeCaptureForEvidence`).

```bash
cd app-shell
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/<slice>-after-<YYYY-MM-DD>.png npm run start
```

The app launches, waits for async IPC data to render, writes the PNG via `webContents.capturePage()`, logs `[SHELL_CAPTURE] wrote <path>`, and **quits on its own** (no `timeout` needed). Output is full Retina resolution.

- `SHELL_CAPTURE` — absolute or relative output path (relative resolves from `app-shell/`). Parent dirs are created. Required to activate the hook; unset = normal launch.
- `SHELL_CAPTURE_DELAY` — ms to wait after `ready-to-show` before capturing (default `3500`). Bump it if a slice loads data slowly or you need to see a later state.
- `SHELL_CAPTURE_MODULE` — optional module id to select before capture, e.g. `shell.aichat`.
- `SHELL_CAPTURE_DOCUMENT` — optional document id to select before capture, e.g. `doc-chapter-1`.
- `SHELL_CAPTURE_AI_PROMPT` — optional mock prompt to invoke before capture; useful when a screenshot should show persisted AI run evidence.
- The capture reflects whatever the app renders on a cold launch (seeded/persisted SQLite state). For a *specific* interaction state (mid-edit, a panel open), you still need computer-use to drive the UI — but that path can't write the file, so use it to verify and `SHELL_CAPTURE` for the saved cold-launch shot.
