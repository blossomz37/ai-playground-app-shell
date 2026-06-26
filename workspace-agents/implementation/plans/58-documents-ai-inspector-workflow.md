# Plan 58 - Documents AI Inspector Workflow

## Goal & Scope

Move the Documents AI action surface, provider-free preview, and pending proposal review from the editor body into the Documents inspector so the source document remains visible while the writer previews, sends, applies, copies, or rejects AI output.

This is a layout and workflow correction for the already-implemented Documents AI proposal loop. It should not change provider behavior, proposal persistence, exact-match apply safety, or prompt output contracts.

## Anchor

- `workspace-agents/session-handoffs/HANDOFF_68.md` made Documents AI send actions clear enough but left the AI panel in the main editor flow.
- Current UI in `app-shell/src/renderer/src/modules/documents/MainView.svelte` renders AI actions, preview text, and pending proposals above the editor, which can obscure the document context the output relates to.
- `app-shell/src/renderer/src/modules/documents/InspectorView.svelte` already owns document-adjacent review surfaces: annotations, version history, and metadata.

## Approach

1. Add a narrow shared Documents AI panel state for:
   - instruction text;
   - last writing-context snapshot;
   - preview result and label;
   - preview/proposal busy flags.
2. Keep editor-dependent work in `MainView.svelte`.
   - TipTap selection/cursor capture still lives beside the editor.
   - Preview, live proposal creation, and exact-match apply still call the existing AI/store functions.
   - The inspector dispatches document AI events instead of reaching into editor internals.
3. Move visible Documents AI controls into `InspectorView.svelte`.
   - Add a new collapsible `AI` section above annotations.
   - Show instruction input, Rewrite/Continue/Summary buttons, optional preview buttons, Send Preview, and Close.
   - Show the captured source context summary and selected-context titles in the inspector.
   - Show pending proposal cards with source status and Apply/Copy/Reject actions in the inspector.
4. Remove the large main-pane AI preview/proposal panel from `MainView.svelte`.
   - Keep the compact toolbar AI context status near formatting controls.
   - The editor should occupy the main reading/writing area again.
5. Preserve capture and validation hooks.
   - Existing capture event `shell:capture-document-ai-preview` should keep working.
   - Add screenshot evidence showing the editor visible while the inspector contains AI controls/proposals.

## Files / Areas Touched

- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`
- New shared Documents AI panel state under `app-shell/src/renderer/src/modules/documents/`

## Risks & Unknowns

- The inspector does not own the TipTap editor instance. Event dispatch keeps the boundary explicit, but it means `MainView` must stay mounted for AI actions to work.
- Inspector width is limited. Preview and proposal text need compact, scrollable rendering instead of pushing controls off-screen.
- Current version history has restore actions but no version-history diff. The existing diff toggle only compares two open documents in the main split editor. A direct snapshot-vs-current diff should be a later slice.

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
git diff --check
```

Run Svelte autofixer on touched Svelte components if available.

UI evidence:

```bash
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/documents-ai-inspector-workflow-after-2026-06-26.png npm run start
```

Acceptance checks:

- Documents AI controls render in the inspector, not above the editor.
- The source document remains visible while preview/proposal output is visible.
- Rewrite still requires selected text.
- Preview remains provider-free and can be sent afterward.
- Live Rewrite/Continue/Summary still create pending proposals.
- Pending replacement proposals still show Apply only when the exact source match is verified.
- Copy and Reject still work.

Completed 2026-06-26:

- Added shared Documents AI panel state for instruction text, writing context, preview result, and busy flags.
- Moved Documents AI controls, provider-free preview, and pending proposal cards into the Documents inspector.
- Kept editor-owned preview/run/apply logic in `MainView.svelte` and connected the inspector through `documents:ai-panel-action` events.
- Removed the large main-pane AI panel so the active document remains visible while AI preview/proposals are reviewed.
- `svelte_autofixer` clean for:
  - `app-shell/src/renderer/src/modules/documents/MainView.svelte`
  - `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/documents-ai-inspector-workflow-after-2026-06-26.png`
- Note: the version-history section still has Copy/Replace only. The existing diff feature is a split-editor document-vs-document diff, not a version-history diff.

## Follow-Ups To Keep

- Plan 59: direct version-history diff against current document content.
- Plan 60: structured proposal output if live output violates the runtime prompt contract.
- Plan 61: streaming and cancel support through the shared AI/provider layer.
- Plan 62: run audit detail and run-history restore polish.
- Later: Prompt Library usability polish, including categories/tags, import/export, variable reference, and last-run settings.
- Later: model presets/provider profiles for drafting, revision, analysis, and summary.

## Out of Scope

- No streaming or cancel support.
- No structured JSON/parser contract.
- No new proposal schema fields.
- No fuzzy matching, diff-assisted proposal apply, or append-note apply.
- No model presets/provider profiles.
- No Prompt Studio redesign.
- No direct version-history diff in this slice.
