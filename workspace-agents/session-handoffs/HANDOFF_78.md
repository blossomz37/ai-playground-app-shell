# Session Handoff 78 - UI/UX First-Class Roadmap: Slice 3 locally proven

_Session: 2026-06-26 - Branch: `codex/uiux-slice1-runtime-proof` - Slice: Plan 68 Slice 3 AI mental-model unification_

## What Changed

Completed Plan 68 Slice 3 without SQLite schema changes, shared contract changes,
new IPC channels, package changes, or new dependencies.

Implemented:
- Per-surface provider/model/temperature settings for AI Chat, Prompt Studio,
  Documents AI, and Workflow.
- Shared AI context tray in Prompt Studio and Documents inspectors, using the
  existing `AiContextPicker`.
- Unified run history across Chat, Prompts, Workflow, and Documents, with source
  filter chips and source labels in `RunHistoryList`.
- Prompt Studio `Save as Proposal` path for any prompt/template when an active
  document exists, using safe `append-note` proposals.
- Workflow proposal checkbox behavior: when checked with an active document it
  creates an `append-note` proposal; otherwise Workflow keeps the existing queued
  job path.
- Workflow queued jobs now forward provider/model/temperature to the main
  workflow runner.
- Surface-local `Save Custom` preset behavior in `AiModelPresetPicker`.
- Provider/model compatibility guard for Prompt Studio template hydration, so a
  mock-model template switches the surface to the mock provider instead of
  trying to run under OpenAI.
- Capture evidence support for opening context disclosures and clicking Prompt
  Studio `Save as Proposal`.

True multi-step chain execution was intentionally not built. It remains deferred
behind the Slice 4/data-model gate.

## Evidence

All screenshots were captured with built Electron against seeded workspace
`ws-uiux-fc-20260626` / `UIUX FC Evidence 2026-06-26`.

- `workspace-agents/implementation/screenshots/uiux-fc-ai-context-tray-before-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-ai-context-tray-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-ai-run-history-unified-before-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-ai-run-history-unified-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-ai-proposal-any-prompt-before-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-fc-ai-proposal-any-prompt-after-2026-06-26.png`

Runtime proposal proof:
- Capture clicked `Save as Proposal` in Prompt Studio.
- Log proof: `[SHELL_CAPTURE_PROMPTSTUDIO_PROPOSAL]`
- Created pending append-note proposal
  `f73e3054-e370-4fdd-8ac2-a46a0c6938f8` for document
  `uiux-fc-doc-orion`.

## Validation

- Svelte autofixer on all touched Svelte components: no issues.
- `cd app-shell && npm run typecheck` - clean.
- `cd app-shell && npm run build` - clean.
- `git diff --check` - clean.
- Built Electron `SHELL_CAPTURE` screenshots: clean after QA evidence fixes.
- Adversarial QA: pass after P1/P2/P3 fixes.

## QA Notes

Adversarial QA initially found:
- P1: unified run history collapsed after new invokes/proposals because run
  refreshes were still module-filtered.
- P1: Workflow queued jobs ignored visible provider/model/temperature.
- P2: Prompt Studio surface-local `Save Custom` saved global settings.
- P2: first evidence set showed placement but not an open context tray or actual
  proposal creation.
- P3: touched select inputs needed visible `:focus-visible` rings.

All findings were fixed and rechecked by QA with no remaining blockers.

## Next

Proceed to Plan 68 Slice 5 (color discipline) or Slice 6 (clutter pass) next.
Slice 4 remains gated: do not start its SQLite/schema/IPC work until Carlo
approves the drafted contract delta in Plan 68.
