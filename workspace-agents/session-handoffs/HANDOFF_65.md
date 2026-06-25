# Session Handoff 65 - Live Documents AI Run-to-Proposal Output

_Session: 2026-06-25 - Slice: Plan 55 live non-streaming proposal output_

## What Changed

- Implemented `workspace-agents/implementation/plans/55-documents-ai-run-to-proposal-output.md`.
- Added `CreateAiProposalFromInvocationParams`.
- Added `createProposalFromInvocation(...)` through:
  - shared Shell API contract;
  - preload;
  - IPC;
  - main AI orchestrator;
  - renderer AI store;
  - browser-shell preview stub.
- New behavior:
  - Documents previews remain provider-free.
  - `Run Proposal` now invokes the configured non-streaming provider path.
  - Successful live runs create one pending proposal linked to the completed `ai_runs.id`.
  - `ai_proposals.proposedText` stores `run.outputText.trim()`.
  - Failed or empty-output runs throw before proposal creation.
- Existing behavior preserved:
  - provider-free `createProposal(...)` still exists for compatibility/capture setup;
  - replacement `Apply` still appears only for pending replacement proposals with exactly one source match;
  - append-note proposals remain copy/reject only.
- Added capture flag:
  - `SHELL_CAPTURE_DOCUMENT_AI_RUN_PROPOSAL=1`

## Evidence

- `svelte_autofixer` on `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- UI screenshot:
  - `workspace-agents/implementation/screenshots/documents-ai-live-proposal-after-2026-06-25.png`
- SQLite proof from demo/mock capture before cleanup:
  - proposal id: `03079a35-fcc7-46e0-904a-773ccfc94f92`
  - run id: `15094d7c-de34-42ce-9307-f5d22096dfb6`
  - proposal type: `replacement`
  - proposal status: `pending`
  - run status: `completed`
  - provider: `mock-local`
  - `ai_proposals.proposedText = ai_runs.outputText`
  - proposal output started with `Mock template run complete.`
  - screenshot showed `Source verified` and `Apply`.
- Cleanup:
  - capture-created mock proposals/runs/context packs were removed from Carlo's real workspace after proof;
  - temporary missing-key-provider rows/settings were removed;
  - `shell.ai.providerId` was restored to `openai-responses`.

## Not Fully Proven

- Missing-key failure was not integration-proven because Carlo has a stored `OPENAI_API_KEY`. Forcing that proof would require temporarily deleting or renaming the real key.
- The implementation still guards the path: if `invoke(...)` returns `failed` or empty output, no proposal is created.

## Not Built

- No streaming.
- No fuzzy matching.
- No append-note apply.
- No diff-assisted recovery.
- No structured model-output parser.
- No packaging, signing, notarization, or release bundle changes.

## Notes for Next Agent

- The next useful slice is likely output quality/formatting for replacement proposals: prompt the model to return only replacement text, or add a structured response contract before widening apply behavior.
- Custom provider ids currently route through the mock provider unless the id is `openai-responses`; this affected the attempted missing-key test and should be handled in a separate provider-hardening slice if custom providers become real.
