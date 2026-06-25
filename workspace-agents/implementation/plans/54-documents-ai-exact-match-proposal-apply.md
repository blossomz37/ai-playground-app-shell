# Plan 54 - Documents AI Exact-Match Proposal Apply

## Goal & Scope

Add the first safe apply path for Documents AI replacement proposals. Only allow apply when the proposal source has exactly one match in the current editor content, then replace that exact source text with the proposal text and mark the proposal accepted.

This follows Plan 53. It should remain a narrow replacement-only slice.

## Anchor

- `workspace-agents/implementation/plans/52-documents-ai-proposals.md` created pending proposal persistence with `Copy` and `Reject`.
- `workspace-agents/implementation/plans/53-documents-ai-proposal-source-safeguards.md` added non-mutating source status.
- `app-shell/src/main/core/documents.ts` already creates a `document_versions` snapshot when `documents.save(...)` changes content.
- `app-shell/src/main/ai/repository.ts` already has proposal status transitions for `reject`; this slice should add the symmetric `accept` transition.

## Decisions

1. Replacement apply requires an exact single source match.
   - `proposal.proposalType` must be `replacement`.
   - `proposal.status` must be `pending`.
   - `proposal.sourceText.trim()` must be non-empty.
   - `exactMatchCount(currentEditorMarkdown, proposal.sourceText) === 1`.
2. If source match is missing or ambiguous, no mutation occurs.
   - Missing source: keep proposal pending and show a warning toast.
   - Multiple matches: keep proposal pending and show a warning toast.
3. Apply uses current editor markdown as source of truth, not the last saved database row.
   - This preserves unsaved editor edits.
   - The resulting content is saved through the existing document save path.
4. Version history must preserve the pre-apply document.
   - Minimum implementation may rely on `documents.save(...)`, which already snapshots old saved content.
   - Preferred small improvement: add an optional save label so the version can be labeled `Before AI proposal apply`.
5. Applying a proposal marks it accepted only after the document save succeeds.
6. Append-note proposals remain copy/reject only in this slice.

## Approach

1. Extend shared AI types with `AcceptAiProposalParams` or reuse `ResolveAiProposalParams` if no extra fields are needed.
2. Add `acceptProposal(...)` to:
   - `app-shell/src/main/ai/repository.ts`
   - `app-shell/src/main/ai/orchestrator.ts`
   - `app-shell/src/main/ipc.ts`
   - `app-shell/src/preload/index.ts`
   - `app-shell/src/shared/module-contract.ts`
   - `app-shell/src/renderer/src/store/ai.ts`
   - `app-shell/src/renderer/src/browser-shell.ts`
3. In Documents `MainView.svelte`:
   - Reuse the Plan 53 source-status/exact-match helpers.
   - Show `Apply` only for pending replacement proposals with `Source verified`.
   - Disable/hide `Apply` for append-note, stale source, ambiguous source, or empty source.
   - On apply, build `nextMarkdown = currentMarkdown.replace(proposal.sourceText, proposal.proposedText)`.
   - Call `window.shell.documents.save(activeDoc.id, nextMarkdown)` or a new labeled save helper if implemented.
   - Update editor state with `setEditorContent(nextMarkdown, { dirty: false })`.
   - Mark proposal accepted only after save succeeds.
   - Refresh pending proposals.
4. If adding labeled version support:
   - Add optional save params to the Shell API without breaking existing callers.
   - Update `documents.save(...)` to insert the version label when provided.
   - Use label `Before AI proposal apply`.
5. Add capture support only if needed for a deterministic screenshot of an applied proposal. Do not expand capture hooks unless ordinary UI evidence cannot prove the result.

## Files / Areas Touched

- `app-shell/src/shared/ai.ts`
- `app-shell/src/shared/module-contract.ts`
- `app-shell/src/main/ai/repository.ts`
- `app-shell/src/main/ai/orchestrator.ts`
- `app-shell/src/main/ipc.ts`
- `app-shell/src/preload/index.ts`
- `app-shell/src/renderer/src/store/ai.ts`
- `app-shell/src/renderer/src/browser-shell.ts`
- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- Optional if labeled saves are included:
  - `app-shell/src/main/core/documents.ts`
  - `app-shell/src/renderer/src/store/index.ts`

## Risks & Unknowns

- Current Plan 52 proposals use provider-free rendered prompt text, not model-generated replacement prose. Applying those exact proposals is functionally safe but may not be creatively useful until live model output lands.
- `String.replace(...)` is acceptable only because apply is gated to exactly one source match.
- Saved document versions currently snapshot the last saved DB content. If the editor has unsaved changes, relying only on the current save behavior may not capture every unsaved intermediate state. If that matters, add a labeled explicit pre-apply version helper before mutating.
- Exact matching will reject many legitimate stale-but-recoverable proposals. That is intentional for the first apply slice.

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
git diff --check
```

Run Svelte autofixer on `app-shell/src/renderer/src/modules/documents/MainView.svelte`.

UI evidence:

```bash
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/documents-ai-exact-apply-after-2026-06-25.png npm run start
```

Manual/CLI proof to capture in the final handoff:

- A replacement proposal with exactly one source match shows `Apply`.
- Applying it changes the active document content.
- The proposal status changes from `pending` to `accepted`.
- Stale or ambiguous source proposals do not mutate the document.
- Version history contains a pre-apply snapshot, preferably labeled `Before AI proposal apply` if the optional label work is included.

Completed 2026-06-25:

- Added optional `DocumentSaveOptions.versionLabel`.
- Added `acceptProposal(...)` to the AI proposal API path.
- Added `Apply` only for pending replacement proposals with exactly one source match.
- Applied proposal saves with version label `Before AI proposal apply`.
- `svelte_autofixer` on `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/documents-ai-exact-apply-after-2026-06-25.png`
- Apply smoke screenshot: `workspace-agents/implementation/screenshots/documents-ai-exact-apply-smoke-2026-06-25.png`
- SQLite smoke proof on a temporary document:
  - proposal status became `accepted`
  - proposal type was `replacement`
  - document content changed
  - latest document version label was `Before AI proposal apply`
  - temporary document/proposal/run/version rows were cleaned up afterward

## Out of Scope

- Append-note apply.
- Applying stale, missing, or ambiguous proposals.
- Fuzzy matching.
- Diff-assisted recovery.
- Streaming.
- Live provider invocation.
- Repackaging, signing, notarizing, or touching `release/App Shell-darwin-arm64/App Shell.app`.
