# Plan 55 - Documents AI Run-to-Proposal Output

## Goal & Scope

Create pending Documents AI proposals from live, non-streaming model output. Provider-free preview remains the inspection path, but normal proposal creation should store the completed run output in `ai_proposals.proposedText` and link the proposal to the actual `ai_runs` row.

This follows Plan 54 and keeps the existing exact-match replacement apply rules unchanged.

## Anchor

- `workspace-agents/implementation/plans/52-documents-ai-proposals.md` created provider-free pending proposal persistence.
- `workspace-agents/implementation/plans/54-documents-ai-exact-match-proposal-apply.md` added safe replacement apply for exact single source matches.
- Existing non-streaming AI invocation path: `aiOrchestrator.invoke(...)`.
- Existing tables: `ai_runs` and `ai_proposals`.

## Approach

1. Add a narrow `createProposalFromInvocation(...)` AI API.
   - Parameters: `workspaceId`, `targetDocumentId`, `proposalType`, `sourceText`, and `runParams`.
   - The orchestrator calls the existing non-streaming invocation path.
   - Failed or empty-output runs should not create proposals.
   - Successful runs create one `ai_proposals` row using the completed run id and trimmed output text.
2. Keep the older provider-free `createProposal(...)` path for compatibility and capture setup.
3. Update Documents AI UI:
   - Keep `Rewrite`, `Continue`, and `Summary` as provider-free previews.
   - Replace preview-backed `Save Proposal` with live `Run Proposal`.
   - Proposal cards render model output, not rendered prompt text.
4. Preserve Plan 54 mutation safety:
   - Replacement proposals may apply only when there is exactly one source match.
   - Append-note proposals remain copy/reject only.
5. Add capture support for deterministic validation:
   - `SHELL_CAPTURE_DOCUMENT_AI_RUN_PROPOSAL=1`
   - Use `SHELL_CAPTURE_DEMO_MODE=1` for mock-provider proof without a live API key.

## Files / Areas Touched

- `app-shell/src/shared/ai.ts`
- `app-shell/src/shared/module-contract.ts`
- `app-shell/src/main/ai/orchestrator.ts`
- `app-shell/src/main/ipc.ts`
- `app-shell/src/preload/index.ts`
- `app-shell/src/renderer/src/store/ai.ts`
- `app-shell/src/renderer/src/browser-shell.ts`
- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `app-shell/src/main/capture/evidence.ts`

## Risks & Unknowns

- Live model output is free-form text. This slice does not parse structured diffs or enforce a model output format.
- Replacement apply remains intentionally conservative; useful model output can still be blocked if the source text changed or appears more than once.
- Missing API keys should fail the live proposal action without creating a proposal.

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
git diff --check
```

Run Svelte autofixer on `app-shell/src/renderer/src/modules/documents/MainView.svelte`.

Capture UI evidence:

```bash
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/documents-ai-live-proposal-after-2026-06-25.png \
SHELL_CAPTURE_MODULE=shell.documents \
SHELL_CAPTURE_DEMO_MODE=1 \
SHELL_CAPTURE_DOCUMENT_AI_PREVIEW=rewrite-selection \
SHELL_CAPTURE_DOCUMENT_AI_RUN_PROPOSAL=1 \
npm run start
```

Smoke proof:

- A live run creates one pending proposal.
- `ai_proposals.runId` matches the completed `ai_runs.id`.
- `ai_proposals.proposedText` equals `ai_runs.outputText`, not the provider-free rendered prompt.
- Replacement proposal with exactly one source match still shows `Apply`.
- Append-note proposal still has no apply path.
- Missing-key failures create no proposal.

Completed 2026-06-25:

- Added `CreateAiProposalFromInvocationParams` and `createProposalFromInvocation(...)`.
- The orchestrator now invokes the existing non-streaming run path, rejects failed/empty output, and creates one proposal linked to the completed run id.
- Documents preview remains provider-free; the visible proposal action is now `Run Proposal`.
- Existing provider-free `createProposal(...)` remains for compatibility and capture setup.
- Existing exact-match apply guard remains unchanged.
- Added `SHELL_CAPTURE_DOCUMENT_AI_RUN_PROPOSAL=1`.
- `svelte_autofixer` on `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/documents-ai-live-proposal-after-2026-06-25.png`
- SQLite proof from a demo/mock capture before cleanup:
  - proposal `03079a35-fcc7-46e0-904a-773ccfc94f92`
  - run `15094d7c-de34-42ce-9307-f5d22096dfb6`
  - proposal type `replacement`
  - proposal status `pending`
  - run status `completed`
  - provider `mock-local`
  - `ai_proposals.proposedText = ai_runs.outputText`
  - proposal text started with `Mock template run complete.`
  - screenshot showed `Source verified` and `Apply`
- Cleanup performed:
  - demo/mock proposal and run rows were removed from Carlo's real workspace after screenshot/database proof.
  - temporary missing-key-provider test rows/settings were removed.
- Missing-key behavior note:
  - The code rejects failed invocations before proposal creation.
  - A full missing-key integration proof was not run because Carlo has a stored `OPENAI_API_KEY`; forcing that path would require temporarily deleting or renaming the real key.

## Out of Scope

- Streaming.
- Fuzzy matching.
- Append-note apply.
- Diff-assisted recovery.
- Structured model output parsing.
- Repackaging, signing, notarization, or release bundle changes.
