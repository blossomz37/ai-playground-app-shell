# Plan 62 - AI Run History Detail

## Goal & Scope

Add compact, inspectable run history detail for AI Chat and Prompt Studio so completed, failed, and cancelled runs can be reviewed without digging into SQLite or console logs.

This slice does not add new persistence. It renders fields already present in `AiRun`.

## Anchor

- `workspace-agents/session-handoffs/HANDOFF_71.md` queues run audit detail and run-history restore polish.
- Plans 60 and 61 made `ai_runs.outputText` audit-significant because structured Documents proposals store parsed proposal text while raw run output remains in the run.

## Approach

1. Add a shared `RunHistoryList.svelte` renderer for existing `AiRun[]`.
2. Use it from AI Chat and Prompt Studio inspectors.
3. Let a run expand inline to show provider/model/temperature, origin, created/completed times, run id, output, and error.
4. Keep this read-only; no restore mutation or prompt replay yet.

## Files / Areas Touched

- `app-shell/src/renderer/src/shell/RunHistoryList.svelte`
- `app-shell/src/renderer/src/modules/aichat/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/InspectorView.svelte`
- `workspace-agents/implementation/plans/62-ai-run-history-detail.md`

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
git diff --check
```

Run Svelte autofixer on touched Svelte components.

UI evidence:

```bash
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/ai-run-history-detail-after-2026-06-26.png \
SHELL_CAPTURE_MODULE=shell.promptstudio \
SHELL_CAPTURE_DEMO_MODE=1 \
SHELL_CAPTURE_AI_PROMPT="Summarize this capture context." \
npm run start
```

## Out of Scope

- No prompt replay.
- No restoring model/settings from a run into the active editor.
- No new context-pack detail view.
- No database schema changes.

## Completed 2026-06-26

- Added shared `RunHistoryList.svelte` for compact run history detail.
- Reused it in AI Chat and Prompt Studio inspectors.
- Run rows now expand inline to show status, provider, model, temperature, origin, completed timestamp, run id, and output/error detail.
- Added capture support for `SHELL_CAPTURE_OPEN_RUN_HISTORY=1`.

Validation:

- `svelte_autofixer` clean:
  - `app-shell/src/renderer/src/shell/RunHistoryList.svelte`
  - `app-shell/src/renderer/src/modules/aichat/InspectorView.svelte`
  - `app-shell/src/renderer/src/modules/promptstudio/InspectorView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/ai-run-history-detail-after-2026-06-26.png`
