# Session Handoff 71 - Documents AI Inspector Workflow

_Session: 2026-06-26 - Slice: Plan 58 Documents AI inspector workflow_

## What Changed

- Pushed the three previously local commits to `ai-playground/main`:
  - `f95c519` - `Fix Documents AI direct actions`
  - `644e609` - `Fix App Shell hot reload launch`
  - `a04258b` - `Fix import folder dialog focus`
- Implemented `workspace-agents/implementation/plans/58-documents-ai-inspector-workflow.md`.
- Moved Documents AI controls, provider-free preview, and pending proposal review from the main editor body into the Documents inspector.
- Added shared Documents AI panel state for instruction text, captured writing context, preview result, and busy flags.
- Kept editor-dependent AI logic in `MainView.svelte`; the inspector dispatches `documents:ai-panel-action` events for preview, live run, send preview, close preview, apply, and reject.
- Removed the large main-pane AI panel so the document remains visible while the writer reviews AI output.

## Commit

- `f54dbfd` - `Move Documents AI workflow to inspector`

## Evidence

- `svelte_autofixer` clean:
  - `app-shell/src/renderer/src/modules/documents/MainView.svelte`
  - `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot:
  - `workspace-agents/implementation/screenshots/documents-ai-inspector-workflow-after-2026-06-26.png`

## Version History Diff Answer

- Carlo was not missing a hidden version-history diff.
- Current Version History supports `Copy` and `Replace`.
- The existing diff feature is the main-pane split-editor document-vs-document diff toggle, not a snapshot-vs-current version-history diff.

## Not Built

- No direct version-history diff.
- No streaming or cancel support.
- No structured output/parser contract.
- No new proposal schema fields.
- No fuzzy matching, diff-assisted proposal apply, or append-note apply.
- No Prompt Library redesign.
- No model presets/provider profiles.

## Approved / Queued Next Tasks

1. Add direct version-history diff against current document content.
2. Add structured proposal output if live model output violates the runtime prompt contract.
3. Add streaming and cancel support through the shared AI/provider layer.
4. Add run audit detail and run-history restore polish.
5. Keep Prompt Library usability polish queued: categories/tags, import/export, variable reference, and last-run settings.
6. Keep model presets/provider profiles queued for drafting, revision, analysis, and summary.

## Notes for Next Agent

- `Plan 58` records the follow-up queue and the version-history diff gap.
- The inspector now owns the visible AI workflow, but `MainView.svelte` still owns TipTap selection/cursor capture and document mutation because it has the editor instance.
- If implementing version-history diff next, start in `InspectorView.svelte` and `documentsState.restoreDocVersion`/versions data. Keep it read-only first: compare selected snapshot content to current editor content, then leave Copy/Replace unchanged.
