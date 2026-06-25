# Session Handoff 64 - Exact-Match AI Proposal Apply

_Session: 2026-06-25 - Slice: Plan 54 exact-match replacement proposal apply_

## What Changed

- Implemented `workspace-agents/implementation/plans/54-documents-ai-exact-match-proposal-apply.md`.
- Added optional document save version labels:
  - `DocumentSaveOptions.versionLabel`
  - propagated through Shell API, preload, IPC, module context, renderer documents state, and main `documents.save(...)`.
- Added AI proposal accept path:
  - `acceptProposal(...)` in repository, orchestrator, IPC, preload, Shell API, renderer store, and browser shell stub.
- Added `Apply` in Documents pending proposal cards only when:
  - proposal is `pending`;
  - proposal type is `replacement`;
  - `sourceText` is non-empty;
  - `sourceText` has exactly one match in current editor markdown.
- Apply behavior:
  - uses current editor markdown as the source of truth;
  - saves dirty editor content before applying if needed;
  - replaces the exact single source match with `proposedText`;
  - saves the result with version label `Before AI proposal apply`;
  - marks the proposal `accepted` only after save succeeds.
- Added capture-only flag `SHELL_CAPTURE_DOCUMENT_AI_APPLY_PROPOSAL=1` for deterministic apply smoke validation.

## Evidence

- `svelte_autofixer` on `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- UI screenshot showing `replacement`, `Source verified`, and `Apply`:
  - `workspace-agents/implementation/screenshots/documents-ai-exact-apply-after-2026-06-25.png`
- Apply smoke screenshot:
  - `workspace-agents/implementation/screenshots/documents-ai-exact-apply-smoke-2026-06-25.png`
- SQLite smoke proof on temporary document `plan54-apply-smoke-1782429778`:
  - latest proposal became `accepted`
  - proposal type was `replacement`
  - document content changed
  - latest document version label was `Before AI proposal apply`
  - temporary document/proposal/run/version rows were cleaned up afterward

## Not Built

- No append-note apply.
- No stale-source or ambiguous-source apply.
- No fuzzy matching.
- No diff-assisted recovery.
- No live provider invocation.
- No streaming.
- No packaging, signing, notarization, or release bundle changes.

## Notes for Next Agent

- `Apply` is intentionally hidden instead of disabled for unsafe proposals.
- Stale/missing/ambiguous proposals still support `Copy` and `Reject`.
- The apply path can create an extra unlabeled version if the document was dirty before apply: it first saves dirty editor content, then saves the applied replacement with the labeled pre-apply snapshot. This preserves unsaved work before mutation.
- Notarization may still be running in a separate terminal. Do not run `npm run package:mac` or overwrite `release/App Shell-darwin-arm64/App Shell.app` until that process finishes and the ticket is stapled.

## Next Recommended Task

Move from provider-free proposal text to live model output landing in proposals, still without streaming. Keep exact-match apply unchanged until live-output replacement quality is proven.
