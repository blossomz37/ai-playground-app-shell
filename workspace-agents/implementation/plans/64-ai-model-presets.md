# Plan 64 - AI Model Presets

## Goal & Scope

Add task-oriented AI model presets for drafting, revision, analysis, summary, and custom without adding a new provider-profile persistence layer. Presets apply the existing provider/model/temperature settings used by AI actions.

## Anchor

- `workspace-agents/implementation/plans/50-ai-writing-workflow-upgrades-from-cappy.md` Upgrade 7.
- Existing provider/model/temperature stores in `app-shell/src/renderer/src/store/ai.ts`.
- Existing settings persistence through `window.shell.settings`.

## Approach

1. Define default renderer-side presets for drafting, revision, analysis, and summary, plus a user-saved custom preset.
2. Persist only the custom preset through the existing settings API; do not store API keys or add SQLite schema.
3. Add a shared `AiModelPresetPicker.svelte` that applies a preset through existing `selectAiProvider`, `selectAiModel`, and `selectAiTemperature` helpers.
4. Surface the picker in Prompt Studio and global AI provider settings. These two surfaces justify the shared picker without crowding the Documents or Workflow inspectors.
5. Keep one-off overrides intact: the existing provider/model/temperature fields remain editable after applying a preset.

## Files / Areas Touched

- `app-shell/src/renderer/src/store/ai.ts`
- `app-shell/src/renderer/src/shell/AiModelPresetPicker.svelte`
- `app-shell/src/renderer/src/shell/AiProviderSettings.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/InspectorView.svelte`
- `workspace-agents/implementation/screenshots/`

## Risks & Unknowns

- Presets should not imply a secret exists. Existing provider status remains the source of truth for missing keys.
- The current provider invocation path does not expose max output or advanced provider settings, so this slice should not add unused options.
- Applying an OpenAI preset in mock/demo mode may select an OpenAI provider that still requires a key; users can switch back or save a mock custom preset.

## Validation

- `svelte_autofixer` on edited Svelte files.
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/ai-model-presets-after-2026-06-26.png`

Completed 2026-06-26:

- `svelte_autofixer` clean:
  - `app-shell/src/renderer/src/shell/AiModelPresetPicker.svelte`
  - `app-shell/src/renderer/src/modules/promptstudio/InspectorView.svelte`
  - `app-shell/src/renderer/src/shell/AiProviderSettings.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot captured and visually verified:
  - `workspace-agents/implementation/screenshots/ai-model-presets-after-2026-06-26.png`

## Out of Scope

- Max-output and advanced provider options not yet used by providers.
- Per-action preset overrides beyond the global AI setting stores.
- Documents, AI Chat, and Workflow inspector preset controls.
- New SQLite tables or IPC channels for provider profiles.
