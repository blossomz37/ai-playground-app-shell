# Plan 61 - AI Streaming And Cancel Support

## Goal & Scope

Add the first shared AI streaming/cancel foundation and expose it through the Documents live proposal workflow so an in-flight proposal run can be cancelled from the inspector.

This is a foundation slice, not a full token-by-token UI redesign. The provider layer may stream internally and preserve cancellation boundaries, while proposal creation still stores a completed proposal only after the run finishes.

## Anchor

- `workspace-agents/session-handoffs/HANDOFF_71.md` queues streaming and cancel support through the shared AI/provider layer.
- `workspace-agents/implementation/plans/55-documents-ai-run-to-proposal-output.md` added live non-streaming proposal creation.
- `workspace-agents/implementation/plans/60-documents-ai-structured-proposal-output.md` made Documents proposal output structured before proposal persistence.
- Official OpenAI Responses streaming docs describe SSE with `stream: true`, including `response.output_text.delta`, `response.completed`, and `error` events.

## Approach

1. Add cancellable invocation identity.
   - Add optional `requestId` and `stream` fields to `InvokeAiParams`.
   - Main orchestrator maps `requestId` to an `AbortController` while a run is active.
   - Add `ai.cancelInvocation(requestId)` to the Shell API.
2. Add provider-level abort and streaming support.
   - OpenAI provider passes `AbortSignal` into `fetch`.
   - When `stream` is true, request `stream: true`, parse SSE events, accumulate text from `response.output_text.delta`, reconcile from `response.output_text.done`, and fail on `error` / `response.failed`.
   - Mock provider checks the abort signal and delays briefly for streaming runs so cancellation can be validated deterministically.
3. Keep proposal persistence unchanged.
   - `createProposalFromInvocation(...)` still creates a proposal only after the completed run returns.
   - Structured Documents proposal parsing from Plan 60 remains in the main process.
4. Add a narrow Documents UI cancel action.
   - `MainView.svelte` creates a `requestId` for live proposal runs and passes `stream: true`.
   - `InspectorView.svelte` shows a Cancel action while proposal creation is busy.
   - Cancel dispatches to `MainView`, which calls `ai.cancelInvocation(requestId)`.
5. Add deterministic capture proof.
   - Extend the existing Documents AI capture path to optionally click Cancel while a proposal run is in flight.
   - Screenshot should show the cancel-capable state or cancellation toast.
   - Capture logs should prove the run failed/cancelled without creating a proposal.

## Files / Areas Touched

- `app-shell/src/shared/ai.ts`
- `app-shell/src/shared/module-contract.ts`
- `app-shell/src/main/ai/orchestrator.ts`
- `app-shell/src/main/ai/openai-provider.ts`
- `app-shell/src/main/ai/mock-provider.ts`
- `app-shell/src/main/ipc.ts`
- `app-shell/src/preload/index.ts`
- `app-shell/src/renderer/src/store/ai.ts`
- `app-shell/src/renderer/src/browser-shell.ts`
- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`
- `app-shell/src/main/capture/evidence.ts`
- `workspace-agents/implementation/plans/61-ai-streaming-cancel-support.md`

## Risks & Unknowns

- Streaming UI deltas are intentionally out of scope. This slice proves provider-layer streaming and cancellation, not a live token display.
- OpenAI streaming SSE can include many event types. This slice handles text, completion, failed, and error events and ignores unknown events.
- Cancellation crosses IPC by `requestId`, not by `AbortSignal`, because `AbortSignal` cannot cross the preload boundary.
- If a provider finishes before cancel arrives, cancel becomes a no-op and the completed proposal remains valid.

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
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/documents-ai-cancel-after-2026-06-26.png \
SHELL_CAPTURE_MODULE=shell.documents \
SHELL_CAPTURE_DEMO_MODE=1 \
SHELL_CAPTURE_DOCUMENT_AI_PREVIEW=rewrite-selection \
SHELL_CAPTURE_DOCUMENT_AI_RUN_PROPOSAL=1 \
SHELL_CAPTURE_DOCUMENT_AI_CANCEL_PROPOSAL=1 \
npm run start
```

Acceptance checks:

- Documents live proposal runs pass a request id and stream flag.
- Inspector shows a cancel action while a live proposal run is busy.
- Cancel aborts an in-flight mock streaming run.
- Cancelled run does not create a proposal.
- Completed non-cancelled structured proposal flow from Plan 60 still works.
- Typecheck/build stay clean.

## Out of Scope

- No token-by-token renderer display.
- No persistent partial output rows.
- No database schema changes.
- No retry queue.
- No streaming support for Prompt Studio, AI Chat, or Workflow UI surfaces beyond the shared provider capability.

## Completed 2026-06-26

- Added optional `requestId` and `stream` fields to shared AI invocation params.
- Added `ai.cancelInvocation(requestId)` through Shell API, preload, IPC, browser fallback, and renderer store.
- Added main-process active invocation tracking with `AbortController`.
- Added OpenAI Responses streaming support for `stream: true`, including SSE parsing for text delta/done/completed/error events.
- Added cancellable mock-provider delay for streaming runs so cancellation can be validated deterministically.
- Added Documents live-proposal request ids and `stream: true`.
- Added Documents inspector cancel availability and a `Cancel run` action during live proposal runs.
- Extended Documents AI capture support with `SHELL_CAPTURE_DOCUMENT_AI_CANCEL_PROPOSAL=1`, run/proposal proof logging, and cleanup for cancelled runs with no proposal.
- Updated `docs/modules/documents.md` to mention structured/cancellable AI proposal review.

Validation:

- `svelte_autofixer` clean:
  - `app-shell/src/renderer/src/modules/documents/MainView.svelte`
  - `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/documents-ai-cancel-after-2026-06-26.png`
- Capture proof before cleanup:
  - run `ae651151-38e3-44e6-a236-e4f8a7b7f5ab`
  - run status `failed`
  - run error `AI run cancelled.`
  - no proposal id / no proposal row
  - temporary document/run/context rows were cleaned up afterward.
