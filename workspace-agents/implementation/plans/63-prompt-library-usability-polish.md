# Plan 63 - Prompt Library Usability Polish

## Goal & Scope

Make Prompt Studio's template library more usable without introducing a new provider-profile schema. This slice delivers editable tags/category filtering, dynamic variable inputs and reference chips, local JSON import/export, and per-template remembered model/temperature using existing template fields.

## Anchor

- `workspace-agents/implementation/plans/50-ai-writing-workflow-upgrades-from-cappy.md` Upgrade 6.
- Existing `AiPromptTemplate` contract in `app-shell/src/shared/ai.ts`.
- Prompt Studio renderer surfaces in `app-shell/src/renderer/src/modules/promptstudio/`.

## Approach

1. Reuse the existing `AiPromptTemplate.tags`, `defaultModel`, and `defaultTemperature` fields. Do not add SQLite columns.
2. Add store helpers for:
   - extracting `{{variables}}` from a template body,
   - updating template details through the existing `saveTemplate` IPC path,
   - exporting visible custom templates as JSON,
   - importing templates from JSON as new workspace-local templates.
3. Update Prompt Studio main view to:
   - edit comma-separated tags alongside the prompt body,
   - render inputs for all variables found in the prompt,
   - show a reference row of common writing/context variables,
   - remember the model and temperature used by a template after preview/run.
4. Update Prompt Studio nav to:
   - filter templates by tag category,
   - expose local JSON import/export actions,
   - keep duplicate/archive/delete behavior unchanged.
5. Add capture-only helpers so evidence can force the sidebar visible, hide the inspector, create a temporary custom prompt template, and clean it up after capture.

## Files / Areas Touched

- `app-shell/src/renderer/src/store/ai.ts`
- `app-shell/src/renderer/src/modules/promptstudio/MainView.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/NavView.svelte`
- `app-shell/src/main/capture/evidence.ts`
- `workspace-agents/implementation/screenshots/`

## Risks & Unknowns

- Browser-file import/export is sufficient for local Prompt Studio JSON and avoids adding Electron dialog IPC for this slice.
- Template defaults currently store model and temperature, not provider. Provider-level profiles remain a separate queued goal.
- Imported template JSON should never overwrite existing templates; imports get fresh ids in the active workspace.

## Validation

- `svelte_autofixer` on edited Svelte files.
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/prompt-library-usability-after-2026-06-26.png`

Completed 2026-06-26:

- `svelte_autofixer` clean:
  - `app-shell/src/renderer/src/modules/promptstudio/MainView.svelte`
  - `app-shell/src/renderer/src/modules/promptstudio/NavView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot captured and visually verified:
  - `workspace-agents/implementation/screenshots/prompt-library-usability-after-2026-06-26.png`
- Capture cleanup logged deletion of the temporary prompt template used for screenshot evidence.

## Out of Scope

- Model/provider preset profiles.
- Template folders or a new category schema.
- Main-process file dialogs for import/export.
- Restoring a run's full prompt/output/settings into the editor.
