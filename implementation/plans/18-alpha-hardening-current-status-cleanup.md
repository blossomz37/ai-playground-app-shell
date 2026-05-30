---
file: 18-alpha-hardening-current-status-cleanup.md
description: Verify mock/live AI acceptance and reconcile current project status docs
version: 0.1.0
created: 2026-05-30
modified: 2026-05-30
author: codex
status: implemented
---

# 18 - Alpha Hardening and Current Status Cleanup

## Goal & Scope

Run a real app acceptance pass for mock and live AI, fix any provider/model/status issue found by evidence, and update current status docs so the next agent does not chase completed work.

## Anchor

- `implementation/plans/15-ai-orchestration-and-context.md`
- `implementation/plans/16-openai-live-provider.md`
- `implementation/plans/17-workspace-jobs-shell-slice.md`
- Latest numbered handoff convention in `CLAUDE.md`

## Outcome

- Ran fresh acceptance captures through the built Electron app, not just static checks.
- Verified the app database has a correctly named `OPENAI_API_KEY` secret.
- Confirmed both mock and live AI runs completed and wrote context packs:
  - `mock-local` / `mock-durable-context-v1` / `completed`
  - `openai-responses` / `gpt-4.1-mini` / `completed`
- Fixed the capture-only provider/model override so validation screenshots show the same provider/model used by the invoked AI run.
- Updated stale current-status docs and added `session-handoffs/HANDOFF_10.md` because `HANDOFF_09.md` already belongs to the workspace/jobs slice.

## Files / Areas Touched

- `app-shell/src/main/index.ts`
- `CLAUDE.md`
- `.agent/knowledge/WORKSPACE_ORIENTATION.md`
- `2-modules-overview.md`
- `implementation/plans/11-prompt-studio.md`
- `implementation/plans/16-openai-live-provider.md`
- `implementation/screenshots/alpha-hardening-mock-ai-after-2026-05-30.png`
- `implementation/screenshots/alpha-hardening-live-ai-after-2026-05-30.png`
- `session-handoffs/HANDOFF_10.md`

## Validation

- `npm run typecheck` passed.
- `npm run build` passed.
- Mock AI capture: `implementation/screenshots/alpha-hardening-mock-ai-after-2026-05-30.png`
- Live AI capture: `implementation/screenshots/alpha-hardening-live-ai-after-2026-05-30.png`
- SQLite acceptance check confirmed the two newest acceptance rows completed with non-empty output and context packs.

## Out of Scope

- Streaming responses.
- Proposal accept/reject.
- Batch prompt runs.
- Workspace duplicate/archive UI.
