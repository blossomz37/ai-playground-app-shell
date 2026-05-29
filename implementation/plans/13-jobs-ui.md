---
file: 13-jobs-ui.md
description: Add renderer-side jobs UI — queue, progress, history
version: 0.1.0
created: 2026-05-29
modified: 2026-05-29
author: antigravity
status: placeholder
---

# 13 — Jobs UI

## Problem

`0-shell-platform-spec.md` §9 says "Jobs always visible through a common progress model." The job runner exists in main (`src/main/core/jobs.ts` — `defineRunner`, `submit`, `JobHandle` with `progress()` and `cancel()`), but there is no renderer-side panel showing the queue, progress, or history. Jobs are invisible to the user.

## Spec References

- `0-shell-platform-spec.md` §3 Jobs primitive ("Shell owns: job queue, status, logs, cancellation, retries")
- `0-shell-platform-spec.md` §9 ("Jobs always visible through a common progress model")
- `3-module-contract.md` §5 (`ctx.jobs.defineRunner`, `ctx.jobs.submit`)

## Scope

### Must

- **Jobs panel** in the shell chrome — a toggleable drawer or status-bar popover showing:
  - Active jobs with progress bar and cancel button
  - Completed / failed jobs with timestamps
- Forward job progress events from main → renderer via IPC (`jobs:progress`, `jobs:completed`, `jobs:failed`)
- Preload bridge + renderer store (`store/jobs.ts`)
- Shell command to toggle the jobs panel (`shell.jobs.toggle`)

### Should

- Status bar indicator showing active job count (click to open panel)
- Toast on job completion or failure (integrate with existing toast service)
- Job log / output viewer (expandable per-job)

### Could

- Retry failed jobs
- Job history persistence (currently in-memory only)
- Filter/search in job history

## Files Likely Affected

- `src/main/core/jobs.ts` — emit progress/completion/failure events via `events`
- `src/main/index.ts` — forward job events to renderer (like `shell:notify`)
- `src/preload/index.ts` — `jobs` bridge
- `src/shared/module-contract.ts` — extend `ShellApi` with `jobs` section
- `src/renderer/src/store/jobs.ts` — new store for job state
- `src/renderer/src/shell/JobsPanel.svelte` — new component
- `src/renderer/src/shell/StatusBar.svelte` — active job count indicator
- `src/renderer/src/shell/AppShell.svelte` — mount JobsPanel
