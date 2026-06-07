# Plan 47 - Documents Close State, Annotations, Split Compare, and Version Restore

## Summary

Create a small-slice implementation plan for the Documents-room improvements discussed:

- Close an open document so returning to Documents does not automatically reopen it.
- Add Documents-only JSON sidecar annotations for selected text.
- Keep annotation records independent from document versions, with sessions tied to document/version context.
- Let annotations be edited, resolved, deleted, and marked orphaned when their anchor no longer maps.
- Add version restore actions: restore as copy or replace current with a safety snapshot first.
- Add side-by-side document editing with non-persistent split state.
- Add a read-only diff toggle for the two open documents.

## Slice 0 - Document Open/Close State

### Objective

Let users close the active document so returning to the Documents room does not automatically reopen it.

### Scope and Out-of-Scope

Scope:
- Add Documents-local open document state distinct from tree selection.
- Add a `Close Document` action.
- Show an empty editor state when no document is open.
- Ensure split editor state does not persist across restart.

Out of scope:
- Tabbed document UI.
- Workspace-wide recent document tracking.
- Multi-document session restore.
- Shell-wide pane/session management.

### Implementation Approach

- Treat tree selection and editor-open state as separate concepts.
- Add state fields for primary and secondary open document IDs.
- Clear the primary open document ID when the user closes the document.
- Selecting a document from the tree opens it again.
- Reset split editor state on app restart.

### Dependencies

- Existing Documents state slice.
- Existing document tree selection and active document loading behavior.

### Suggested Commit Checkpoint

Commit message: `Add document close state`

### Testing Plan

- Run `npm run typecheck`.
- Run `npm run build`.
- Open a document, close it, switch rooms, return to Documents, and confirm it remains closed.
- Select a document from the tree and confirm it opens normally.
- Restart the app and confirm split state is not restored.

### Snapshot Evidence

Capture:

`workspace-agents/implementation/screenshots/documents-close-state-after-YYYY-MM-DD.png`

### Acceptance Criteria

- User can close the active document.
- Returning to Documents does not reopen the closed document.
- Selecting a document opens it again.
- Empty editor state is clear and does not imply content loss.
- Split editor state resets after restart.

### Risks and Rollback Notes

- Risk: existing code may assume tree selection always equals open editor state.
- Mitigation: keep current active document semantics as primary editor state and add a narrow close/open layer.
- Rollback: remove close command/UI and restore prior active-document behavior.

## Slice 1 - Annotation Session and Data Model

### Objective

Add shell-owned persistence and API support for sidecar annotations while keeping annotation rendering and workflows inside Documents.

### Scope and Out-of-Scope

Scope:
- Add annotation session persistence.
- Add annotation record persistence.
- Add shared types and shell/preload API methods.
- Use JSON target data, not XML.
- Keep annotations independent from document versions.

Out of scope:
- Editor rendering.
- Inspector UI.
- Cross-module annotations.
- Export/import of annotations.
- Annotation history as a separate document type.

### Implementation Approach

Add two persistence concepts:

`document_annotation_sessions`:
- `id`
- `workspaceId`
- `documentId`
- `documentVersionId` nullable
- `title`
- `createdAt`
- `updatedAt`
- `archivedAt` nullable

`document_annotations`:
- `id`
- `sessionId`
- `workspaceId`
- `documentId`
- `note`
- `color`
- `status`: `active | resolved | orphaned`
- `targetJson`
- `createdAt`
- `updatedAt`
- `resolvedAt` nullable
- `deletedAt` nullable

`targetJson` should include:
- `exact`
- `prefix`
- `suffix`
- `from`
- `to`

Add shell API methods:
- `listAnnotationSessions(documentId)`
- `createAnnotationSession(params)`
- `listAnnotations(documentId, options)`
- `createAnnotation(params)`
- `updateAnnotation(id, patch)`
- `resolveAnnotation(id)`
- `reopenAnnotation(id)`
- `deleteAnnotation(id)`

Delete should soft-delete by setting `deletedAt`.

### Dependencies

- Existing SQLite migration pattern.
- Existing shell document service, IPC, preload, and shared contract patterns.

### Suggested Commit Checkpoint

Commit message: `Add document annotation persistence`

### Testing Plan

- Run `npm run typecheck`.
- Run `npm run build`.
- Verify annotation CRUD does not mutate document content.
- Verify annotation sessions can be tied to a document and optionally a document version.
- Verify restoring document versions does not restore or mutate annotations.

### Snapshot Evidence

No UI screenshot required for this backend/API slice.

### Acceptance Criteria

- Annotation sessions and annotations persist in SQLite.
- Annotation APIs are available through the shell/preload contract.
- Annotation records are independent from document versions.
- Deleted annotations are soft-deleted.
- Existing document save/version behavior is unchanged.

### Risks and Rollback Notes

- Risk: adding too much annotation semantics too early.
- Mitigation: keep persistence minimal and store anchoring details in JSON.
- Rollback: remove annotation API and migration before UI slices depend on it.

## Slice 2 - Editor Selection Annotation Creation

### Objective

Let users select text in the Documents editor and create an annotation note that rides sidecar while the highlighted text remains normal selectable text.

### Scope and Out-of-Scope

Scope:
- Add an annotate-selection action.
- Capture selected text and context.
- Persist a sidecar annotation.
- Render annotation highlights with editor decorations.

Out of scope:
- Full annotation inspector.
- Project-wide annotation search.
- AI-created annotations.
- Cross-document annotation sessions.

### Implementation Approach

- Use the existing ProseMirror decoration pattern already used for search highlights.
- On selected text, capture range, exact text, and prefix/suffix context.
- Create or reuse an active annotation session for the document.
- Create an annotation record.
- Render highlight decorations from annotation target data.
- Do not insert marks into document content for v1.
- The highlight must not prevent normal text selection.

### Dependencies

- Slice 1 annotation APIs.
- Existing TipTap/ProseMirror editor.
- Existing Documents toolbar or command registration pattern.

### Suggested Commit Checkpoint

Commit message: `Add document text annotation creation`

### Testing Plan

- Run `npm run typecheck`.
- Run `npm run build`.
- Select text and create an annotation.
- Confirm highlighted text remains selectable.
- Save/reopen the document and confirm highlight returns.
- Confirm annotation creation does not set the document dirty unless content changes.

### Snapshot Evidence

Capture:

`workspace-agents/implementation/screenshots/documents-annotation-create-after-YYYY-MM-DD.png`

### Acceptance Criteria

- User can annotate selected text.
- Annotation note is stored separately from document content.
- Highlight remains selectable.
- Annotation survives document reload.
- No new module is introduced.

### Risks and Rollback Notes

- Risk: annotations drift after edits.
- Mitigation: map decorations through transactions and use exact/prefix/suffix fallback.
- Rollback: disable annotate-selection command while preserving persistence.

## Slice 3 - Annotation Inspector and Lifecycle Management

### Objective

Add a Documents inspector section to review, edit, resolve, reopen, delete, and navigate annotations.

### Scope and Out-of-Scope

Scope:
- Add an Annotations inspector section.
- Show active, resolved, and orphaned annotations.
- Edit note text and color.
- Resolve/reopen annotations.
- Soft-delete annotations.
- Jump to annotation target when anchorable.

Out of scope:
- Global annotation dashboard.
- Annotation export.
- Annotation-as-document history view.
- Restoring annotations with document versions.

### Implementation Approach

- Extend Documents state to load annotations for the open primary document.
- Add filters: `Active`, `Resolved`, `Orphaned`.
- If an annotation cannot be re-anchored after content changes, set status to `orphaned`.
- Show orphaned annotations with note and original selected text preview.
- Clicking an anchorable annotation focuses the editor and selects or scrolls to its range.
- Delete sets `deletedAt`; deleted annotations do not show in default filters.

### Dependencies

- Slice 1 annotation APIs.
- Slice 2 decoration/targeting behavior.

### Suggested Commit Checkpoint

Commit message: `Add document annotation inspector`

### Testing Plan

- Run `npm run typecheck`.
- Run `npm run build`.
- Create annotation, edit note, resolve, reopen, delete.
- Delete highlighted source text and confirm annotation can become orphaned.
- Confirm deleted annotations are hidden by default.

### Snapshot Evidence

Capture:

`workspace-agents/implementation/screenshots/documents-annotation-inspector-after-YYYY-MM-DD.png`

### Acceptance Criteria

- Active document annotations are visible in inspector.
- User can edit, resolve, reopen, and delete annotations.
- Anchorable annotations navigate to highlighted text.
- Orphaned annotations remain visible and understandable.
- Annotation records remain independent from document versions.

### Risks and Rollback Notes

- Risk: inspector crowding.
- Mitigation: keep section compact and filter-driven.
- Rollback: remove inspector section while leaving annotation creation/persistence intact.

## Slice 4 - Version Restore Actions

### Objective

Let users restore document versions either as a new named copy or by replacing the current document after creating a safety snapshot.

### Scope and Out-of-Scope

Scope:
- Add version restore actions in the Snapshots inspector section.
- Support `Restore as Copy`.
- Support `Replace Current`.
- Create a safety snapshot before replacing current content.
- Keep annotation records independent.

Out of scope:
- Restoring annotations from old versions.
- Visual diff preview in this slice.
- Branching version trees.
- Permanent deleted-document recovery.

### Implementation Approach

- Add shell API method such as `restoreVersion(versionId, mode, options)`.
- For `Restore as Copy`, create a sibling document with version content.
- For `Replace Current`, require confirmation, save current content as a new version first, replace current document content with selected version content, and emit document changed.
- Do not modify annotation sessions or annotation records.
- Existing annotations may become orphaned if their anchors no longer map after replacement.

### Dependencies

- Existing `document_versions` table.
- Existing Snapshots inspector section.
- Annotation independence decisions from Slice 1.

### Suggested Commit Checkpoint

Commit message: `Add document version restore actions`

### Testing Plan

- Run `npm run typecheck`.
- Run `npm run build`.
- Create versions by editing and saving.
- Restore an older version as a copy.
- Replace current with an older version and confirm safety snapshot exists.
- Confirm annotations are not restored or deleted by version restore.

### Snapshot Evidence

Capture:

`workspace-agents/implementation/screenshots/documents-version-restore-after-YYYY-MM-DD.png`

### Acceptance Criteria

- User can restore a version as a new named document.
- User can replace current content with a version after confirmation.
- Replace-current creates a safety snapshot first.
- Annotation records remain independent.
- Existing archived-document restore behavior remains unchanged.

### Risks and Rollback Notes

- Risk: confusion between archived document restore and version restore.
- Mitigation: label actions under `Snapshots` as `Restore as Copy` and `Replace Current`.
- Rollback: remove restore buttons/API while leaving read-only snapshots intact.

## Slice 5 - Side-by-Side Document Editing

### Objective

Allow users to edit two documents at once inside the Documents main pane.

### Scope and Out-of-Scope

Scope:
- Add split editor mode.
- Track primary and secondary open document IDs.
- Render two editor panes.
- Save each pane independently.
- Allow closing secondary pane.
- Do not persist split state across restart.

Out of scope:
- More than two editors.
- Shell-wide split panes.
- Tabs.
- Diff mode.

### Implementation Approach

- Extend Documents state with secondary editor state.
- Keep shell/current active document as primary.
- Treat secondary editor as Documents-local state.
- Reuse editor code where possible.
- Extract a `DocumentEditorPane` component only if needed to avoid duplicating editor setup/save logic.
- Add actions: `Open in Second Editor`, `Close Second Editor`.
- Dirty state must be tracked per pane.

### Dependencies

- Slice 0 open/close state.
- Existing editor load/save flow.

### Suggested Commit Checkpoint

Commit message: `Add side by side document editing`

### Testing Plan

- Run `npm run typecheck`.
- Run `npm run build`.
- Open document A.
- Open document B in second editor.
- Edit and save each document independently.
- Close secondary editor.
- Restart app and confirm split state is not restored.

### Snapshot Evidence

Capture:

`workspace-agents/implementation/screenshots/documents-split-editor-after-YYYY-MM-DD.png`

### Acceptance Criteria

- Two documents can be visible and editable at once.
- Saving one pane does not overwrite the other.
- Dirty state is accurate per pane.
- Closing secondary pane returns to normal single-editor mode.
- Split editor state does not persist across restart.

### Risks and Rollback Notes

- Risk: current editor state may be too coupled to one active document.
- Mitigation: extract editor pane only if it reduces real duplication.
- Rollback: hide split editor command and restore single-editor rendering.

## Slice 6 - Read-Only Diff Toggle

### Objective

Add a read-only diff toggle for the two open documents in split editor mode.

### Scope and Out-of-Scope

Scope:
- Add diff toggle when two documents are open.
- Show read-only comparison of the two document contents.
- Allow toggling back to edit mode without content loss.

Out of scope:
- Editable diff.
- Merge tools.
- Patch apply.
- Three-way compare.
- PDF/binary diff.
- Project-wide compare.

### Implementation Approach

- Add `Edit | Diff` mode toggle inside split editor UI.
- Diff against serialized Markdown/plain text content.
- Use a small in-repo text diff implementation unless an existing dependency already fits.
- In diff mode, render both sides read-only with clear change highlighting.
- Do not mutate document content from diff mode.

### Dependencies

- Slice 5 side-by-side editor.
- Existing content serialization.

### Suggested Commit Checkpoint

Commit message: `Add split document diff toggle`

### Testing Plan

- Run `npm run typecheck`.
- Run `npm run build`.
- Compare identical documents.
- Compare different documents.
- Toggle from edit to diff and back.
- Confirm no content changes occur in diff mode.

### Snapshot Evidence

Capture:

`workspace-agents/implementation/screenshots/documents-split-diff-after-YYYY-MM-DD.png`

### Acceptance Criteria

- Diff toggle appears only when two documents are open.
- Diff mode is read-only.
- Differences are visible and understandable.
- Toggling back restores editable panes.
- No document content is mutated by diff viewing.

### Risks and Rollback Notes

- Risk: diff dependency adds unnecessary weight.
- Mitigation: use a focused local line diff for v1.
- Rollback: remove diff toggle while keeping split editor.

## Slice 7 - Documentation and Session Handoff

### Objective

Update durable docs and handoff artifacts so future agents understand what was built and what remains intentionally out of scope.

### Scope and Out-of-Scope

Scope:
- Update Documents module spec.
- Clarify that annotations/diff are Documents features for v1, not new modules.
- Add a new numbered session handoff.
- Reference screenshot evidence and validation commands.

Out of scope:
- Broad architecture rewrites.
- Creating a standalone Annotations module.
- User-facing marketing docs.

### Implementation Approach

- Update `docs/modules/documents.md` with close document behavior, annotation sessions/lifecycle, version restore behavior, split editor, and read-only diff mode.
- Update `docs/architecture/modules-overview.md` only if needed to clarify ownership.
- Add `workspace-agents/session-handoffs/HANDOFF_NN.md` with completed slices, validation, evidence, and next steps.

### Dependencies

- Slices 0-6 complete or explicitly deferred.

### Suggested Commit Checkpoint

Commit message: `Document documents annotation and compare workflows`

### Testing Plan

- Run `git diff --check`.
- Confirm docs match implemented behavior.
- Confirm handoff names exact evidence files.

### Snapshot Evidence

No new screenshot required.

### Acceptance Criteria

- Docs do not describe annotations or diff as new modules.
- Handoff is clear enough for future continuation.
- Evidence and validation are linked or named.
- Final git status is clean after commits.

### Risks and Rollback Notes

- Risk: docs overstate future annotation generalization.
- Mitigation: describe standalone annotation module only as possible future extraction.
- Rollback: trim speculative documentation.

## Recommended Slice Order

1. Document open/close state.
2. Annotation session and data model.
3. Editor selection annotation creation.
4. Annotation inspector and lifecycle management.
5. Version restore actions.
6. Side-by-side document editing.
7. Read-only diff toggle.
8. Documentation and session handoff.

## Final Validation Checklist

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
```

Run from repo root:

```bash
git diff --check
git status --short --branch
```

For every UI-visible slice, capture screenshot evidence using the existing `SHELL_CAPTURE` workflow.

## Required Evidence

- Typecheck output.
- Build output.
- `git diff --check` output.
- Screenshot for document close state.
- Screenshot for annotation creation.
- Screenshot for annotation inspector.
- Screenshot for version restore.
- Screenshot for split editor.
- Screenshot for read-only diff toggle.
- Final `git status --short --branch` showing a clean working tree after slice commits.

## Documentation Updates

- `docs/modules/documents.md`
- `docs/architecture/modules-overview.md` only if ownership clarification is needed.
- `workspace-agents/session-handoffs/HANDOFF_NN.md`
- Optional: `.agent/knowledge/WORKSPACE_ORIENTATION.md` only if agent-facing orientation materially changes.

## Assumptions and Locked Decisions

- Annotations start as Documents-only, not a new Annotations module.
- Annotation internals use JSON sidecar records, not XML.
- Highlighted text remains normal selectable editor text.
- Annotation records are independent from document versions.
- Annotation records can be edited, resolved, reopened, soft-deleted, or orphaned.
- Annotation sessions can be tied to a document and optionally a document version.
- Restoring a document version does not restore annotations.
- Replace-current version restore creates a safety snapshot first.
- Split editor state does not persist across app restart.
- Diff mode is read-only in v1.
