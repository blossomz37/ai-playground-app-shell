# Plan 65 - AI Run History Use Settings

## Goal & Scope

Add narrow run-history restore polish by letting an expanded AI run reapply its provider, model, and temperature to the current AI settings.

## Anchor

- `workspace-agents/session-handoffs/HANDOFF_71.md` queued "run audit detail and run-history restore polish."
- `workspace-agents/implementation/plans/62-ai-run-history-detail.md` made run detail inspectable but explicitly read-only.

## Approach

1. Extend shared `RunHistoryList.svelte` with an optional `onUseSettings` callback.
2. Render a compact "Use Settings" action in expanded run detail only when the callback is supplied.
3. Wire AI Chat and Prompt Studio inspectors to apply the run's `providerId`, `model`, and `temperature` through existing AI store setters.
4. Keep rendered prompt/context-pack restoration deferred because no focused API exists yet and it would widen the slice.

## Files / Areas Touched

- `app-shell/src/renderer/src/shell/RunHistoryList.svelte`
- `app-shell/src/renderer/src/modules/aichat/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/InspectorView.svelte`
- `workspace-agents/implementation/screenshots/`

## Risks & Unknowns

- Applying a run from a provider with a missing secret still leaves provider readiness to the existing status UI.
- This does not replay a prompt or mutate editor content.

## Validation

- `svelte_autofixer` on edited Svelte files.
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/ai-run-history-use-settings-after-2026-06-26.png`

Completed 2026-06-26:

- `svelte_autofixer` clean:
  - `app-shell/src/renderer/src/shell/RunHistoryList.svelte`
  - `app-shell/src/renderer/src/modules/aichat/InspectorView.svelte`
  - `app-shell/src/renderer/src/modules/promptstudio/InspectorView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot captured and visually verified:
  - `workspace-agents/implementation/screenshots/ai-run-history-use-settings-after-2026-06-26.png`

## Out of Scope

- Restoring rendered prompts from context packs.
- Restoring selected context into the picker.
- Re-running historical prompts.
