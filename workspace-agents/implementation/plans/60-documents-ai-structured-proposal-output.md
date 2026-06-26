# Plan 60 - Documents AI Structured Proposal Output

## Goal & Scope

Make live Documents AI proposal runs produce and parse a small structured proposal envelope so provider commentary does not become `ai_proposals.proposedText`.

This slice applies to live `Run Proposal` creation only. Provider-free preview stays an inspection path, existing proposal storage schema stays unchanged, and raw `ai_runs.outputText` remains the unmodified provider response for audit/debugging.

## Anchor

- `workspace-agents/session-handoffs/HANDOFF_71.md` queues structured proposal output after the inspector move.
- `workspace-agents/implementation/plans/57-documents-ai-proposal-output-contract.md` explicitly left bad free-form output visible if a model ignored the text-only contract.
- `workspace-agents/implementation/plans/55-documents-ai-run-to-proposal-output.md` stores live run output into proposals through `createProposalFromInvocation(...)`.

## Approach

1. Add a Documents proposal JSON contract helper and parser.
   - Contract asks for a JSON object with a `proposalText` string.
   - Parser accepts raw JSON or fenced JSON, validates `proposalText`, trims it, and rejects empty/invalid output.
2. Extend the live proposal API narrowly.
   - Add an optional `outputFormat` flag to `CreateAiProposalFromInvocationParams`.
   - When the flag is `documents-proposal-json`, parse `ai_runs.outputText` before creating the proposal.
   - Keep other AI proposal callers on the current text behavior.
3. Update Documents live proposal runs.
   - `Run Proposal` uses the structured JSON prompt helper.
   - Provider-free preview continues using the existing readable output contract.
   - Proposal type and source safety behavior stay unchanged.
4. Make deterministic capture work with Demo Mode.
   - Update the mock provider to return a valid JSON envelope when it sees the Documents proposal JSON contract.
   - Keep the generic mock-provider response for other AI surfaces.

## Files / Areas Touched

- `app-shell/src/shared/ai.ts`
- `app-shell/src/shared/ai-writing-prompts.ts`
- `app-shell/src/main/ai/orchestrator.ts`
- `app-shell/src/main/ai/mock-provider.ts`
- `app-shell/src/renderer/src/store/ai.ts`
- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `app-shell/src/renderer/src/browser-shell.ts`
- `workspace-agents/implementation/plans/60-documents-ai-structured-proposal-output.md`

## Risks & Unknowns

- This is JSON-object parsing, not a rich schema or tool-call contract.
- Invalid structured output should fail proposal creation instead of storing commentary as proposal text.
- `ai_runs.outputText` intentionally remains raw JSON, which means proposal text no longer necessarily equals run output text for this Documents live path.
- Browser fallback needs to mirror the optional flag enough for local type safety.

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
git diff --check
```

Run Svelte autofixer on `MainView.svelte` if it changes.

UI evidence:

```bash
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/documents-ai-structured-proposal-after-2026-06-26.png \
SHELL_CAPTURE_MODULE=shell.documents \
SHELL_CAPTURE_DEMO_MODE=1 \
SHELL_CAPTURE_DOCUMENT_AI_PREVIEW=rewrite-selection \
SHELL_CAPTURE_DOCUMENT_AI_RUN_PROPOSAL=1 \
npm run start
```

Acceptance checks:

- Live Documents proposal prompts include the JSON proposal contract.
- Demo/mock live proposal creates one pending proposal.
- `ai_runs.outputText` contains the raw JSON envelope.
- `ai_proposals.proposedText` contains only parsed `proposalText`.
- Replacement source verification and `Apply` visibility are unchanged.
- Invalid/empty structured output creates no proposal.

## Out of Scope

- No streaming or cancel support.
- No tool-call API.
- No database schema changes.
- No new proposal fields.
- No fuzzy matching or diff-assisted recovery.
- No Prompt Library redesign.

## Completed 2026-06-26

- Added a Documents structured proposal prompt helper for live proposal runs.
- Added `parseDocumentsAiStructuredProposalOutput(...)`, accepting raw JSON or fenced JSON and rejecting invalid or empty `proposalText`.
- Added optional `outputFormat: "documents-proposal-json"` to live proposal creation params.
- Parsed structured Documents live-run output in the main orchestrator before proposal creation.
- Kept `ai_runs.outputText` as the raw provider output.
- Stored only parsed `proposalText` in `ai_proposals.proposedText` for structured Documents proposal runs.
- Updated the browser fallback for the optional structured output flag.
- Updated capture support so Documents AI evidence can create a temporary document, select rewrite text, run a proposal, log run/proposal proof, capture, and clean up.

Validation:

- `svelte_autofixer` clean:
  - `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/documents-ai-structured-proposal-after-2026-06-26.png`
- Capture proof before cleanup:
  - proposal `207ff2d6-3507-4e4c-8927-c5b7cdb09918`
  - run `c5144d32-97b0-47ab-a0b6-b5369a0e52ad`
  - proposal type `replacement`
  - proposal status `pending`
  - run status `completed`
  - `ai_runs.outputText` was `{"proposalText":"This excerpt serves to illustrate the capabilities and application of Documents AI within the context of evidence management."}`
  - `ai_proposals.proposedText` was `This excerpt serves to illustrate the capabilities and application of Documents AI within the context of evidence management.`
  - screenshot showed `Source verified` and `Apply`
  - temporary document/proposal/run/context rows were cleaned up afterward.
