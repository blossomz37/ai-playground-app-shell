# Plan 59 - Documents Version History Diff

## Goal & Scope

Add a direct, read-only diff in the Documents inspector so a writer can compare a selected version-history snapshot against the current document content before choosing Copy or Replace.

This slice only adds inspection. It must not change version persistence, restore behavior, snapshot labels, split-editor document diff behavior, or AI proposal apply behavior.

## Anchor

- `workspace-agents/session-handoffs/HANDOFF_71.md` queues direct version-history diff as the next approved task.
- `workspace-agents/implementation/plans/58-documents-ai-inspector-workflow.md` records the current gap: version history has Copy and Replace only.
- `docs/architecture/shell-platform-spec.md` §12 Q6 keeps live documents and version history in SQLite.
- `docs/architecture/module-contract.md` §7 says version history UI belongs in the Documents inspector while persistence stays shell-owned.

## Approach

1. Add a tiny shared Documents line-diff helper for side-by-side line rows.
   - Reuse it from the existing split-editor diff in `MainView.svelte`.
   - Use the same helper for version snapshot diff in `InspectorView.svelte`.
2. Extend the Version History inspector section.
   - Track one selected snapshot id locally in `InspectorView.svelte`.
   - Add a `Diff` action beside existing `Copy` and `Replace`.
   - Render a compact read-only current-vs-snapshot diff under the selected snapshot.
   - Provide a close action for the diff preview.
3. Keep restore actions unchanged.
   - `Copy` still restores as a new document.
   - `Replace` still confirms and creates the existing safety snapshot through the shell pipeline.
4. Keep the UI compact.
   - Inspector width is limited, so the diff should scroll and wrap text without resizing the shell layout.

## Files / Areas Touched

- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/documents/lineDiff.ts`
- `workspace-agents/implementation/plans/59-documents-version-history-diff.md`

## Risks & Unknowns

- A naive line-by-line diff is already the existing split-editor behavior; this slice intentionally keeps that simple model rather than adding a heavier diff dependency.
- Snapshot content may be long. The inspector diff needs a max height and scroll area.
- The active document can change while a snapshot is selected. The selected snapshot should clear or fail closed when it no longer belongs to the active document.

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
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/documents-version-history-diff-after-2026-06-26.png npm run start
```

Acceptance checks:

- Version History shows a `Diff` action for snapshots.
- Selecting `Diff` shows snapshot text beside current document text.
- Changed lines are visibly highlighted.
- Closing the diff hides it without changing document content.
- Existing `Copy` and `Replace` actions remain available and unchanged.
- Existing split-editor diff still typechecks and builds with the shared helper.

## Out of Scope

- No semantic, word-level, or rich-text diff.
- No editable diff.
- No restore preview confirmation redesign.
- No branching version tree.
- No changes to snapshot creation or restore persistence.

## Completed 2026-06-26

- Added a shared `buildLineDiff` helper and reused it from the existing split-editor diff.
- Added a read-only Version History `Diff` / `Hide Diff` action in the Documents inspector.
- Rendered a compact current-vs-snapshot diff under the selected version, with changed line count, highlighted changed rows, and a close action.
- Left existing `Copy` and `Replace` restore actions unchanged.
- Added capture-only support for `SHELL_CAPTURE_DOCUMENT_VERSION_DIFF=1` so screenshot evidence can seed a temporary document/version pair, open the diff, capture it, and clean up.
- Updated `docs/modules/documents.md` to mention snapshot-vs-current diff support.

Validation:

- `svelte_autofixer` clean:
  - `app-shell/src/renderer/src/modules/documents/MainView.svelte`
  - `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/documents-version-history-diff-after-2026-06-26.png`
