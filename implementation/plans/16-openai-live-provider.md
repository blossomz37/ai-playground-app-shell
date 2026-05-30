---
file: 16-openai-live-provider.md
description: Add an OpenAI live-provider adapter for the shared AI orchestration layer
version: 0.1.0
created: 2026-05-30
modified: 2026-05-30
author: codex
status: proposed
---

# 16 - OpenAI Live Provider Adapter

## Goal & Scope

Add the first real AI provider behind the durable orchestration layer so AI Chat, Prompt Studio, and Workflow Runner can run against OpenAI through the Responses API while keeping `mock-local` available for offline testing.

This slice delivers:

- `openai` provider support in `app-shell/src/main/ai/`.
- `OPENAI_API_KEY` lookup through the existing shell Secrets service.
- A real Responses API invocation path that stores the same `ai_runs` and `ai_context_packs` records as the mock provider.
- A mock/live selector in AI run settings surfaces.

## Anchors

- `0-shell-platform-spec.md` §10: AI chat and prompt-runner behavior belongs in modules, not shell core.
- `0-shell-platform-spec.md` §12 Q12: secrets are shell-owned, OS-encrypted, and referenced by name.
- `3-module-contract.md` §5: modules receive `ctx.secrets`, `ctx.commands`, `ctx.jobs`, `ctx.events`, and document access through `ModuleContext`.
- `implementation/plans/15-ai-orchestration-and-context.md`: Phase 1 created shared AI contracts, context packs, run persistence, and `mock-local`.
- Official OpenAI docs checked 2026-05-30:
  - Responses API creates model responses with `POST https://api.openai.com/v1/responses`.
  - The Node/TypeScript quickstart uses the official OpenAI SDK and `client.responses.create(...)`.
  - Responses support text inputs/outputs and stateful interactions; streaming can remain deferred.

## Current State

The app can already:

- Collect context candidates from active/descendant documents.
- Persist immutable context packs.
- Persist completed/failed AI runs.
- Route AI Chat, Prompt Studio, and Workflow Runner through one shared `invoke` path.
- Run with `mock-local` without API keys.

It cannot yet:

- Call OpenAI.
- Let a user choose mock vs. live provider.
- Resolve `OPENAI_API_KEY` into an actual provider call.
- Surface live-provider errors in a user-friendly way.

## Approach

1. Add provider selection to the AI request path.
   - Keep `providerId` defaulting to `mock-local`.
   - Add `openai` as a supported provider id.
   - Store provider metadata in `ai_providers` using `secretName = OPENAI_API_KEY`.

2. Add an OpenAI adapter under `app-shell/src/main/ai/`.
   - Candidate file: `openai-provider.ts`.
   - Read the key from `secretsService.get('OPENAI_API_KEY')`.
   - Use the official `openai` npm package if added, or a narrow `fetch` implementation if avoiding a dependency is preferred.
   - Send packed context and prompt through the Responses API.
   - Extract text output into the existing `AiRun.outputText`.

3. Keep the orchestration boundary stable.
   - `aiOrchestrator.invoke()` decides which provider adapter to call.
   - Providers return only normalized text/error metadata to the orchestrator.
   - Existing run/context persistence remains provider-agnostic.

4. Add UI controls.
   - AI Chat inspector: provider selector with `Mock Local` and `OpenAI`.
   - Prompt Studio inspector: same selector, model input/select, and status for missing key.
   - Workflow Runner inspector: same provider mode display/control if practical.
   - Persist provider choice in shell/module settings, not hardcoded component state.

5. Add live error handling.
   - Missing `OPENAI_API_KEY`: do not call the network; mark run failed with a clear message and notify the user.
   - API/network error: store failure in `ai_runs.error`, emit `ai.run.failed`, and show a toast.
   - Do not log secret values.

6. Add validation hooks.
   - Keep mock-provider tests/smoke behavior working without network.
   - Add an opt-in live smoke command/env gate, e.g. `DRAFTWELL_ALLOW_LIVE_AI=1` or `APP_SHELL_ALLOW_LIVE_AI=1`, so routine validation never spends API credits by accident.

## Files / Areas Touched

- `app-shell/package.json` if adding the official OpenAI SDK.
- `app-shell/src/main/ai/openai-provider.ts`
- `app-shell/src/main/ai/orchestrator.ts`
- `app-shell/src/main/ai/repository.ts`
- `app-shell/src/shared/ai.ts`
- `app-shell/src/renderer/src/store/ai.ts`
- `app-shell/src/renderer/src/modules/aichat/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/workflow/InspectorView.svelte`
- `implementation/screenshots/`
- `session-handoffs/HANDOFF_NN.md`

## Risks & Unknowns

- Model default should be chosen deliberately. Start with a configurable default rather than hardcoding a long-lived product decision.
- Streaming is useful but should stay out of this slice unless the non-streaming path is already stable.
- SDK dependency vs. raw `fetch` is a small tradeoff: SDK reduces API-shape drift, while raw `fetch` keeps dependencies lighter.
- Live validation costs money and depends on a local secret, so it must be opt-in and clearly reported.
- Provider settings need a durable owner; for this slice, module settings are enough, but a later provider-management UI may belong in Settings.

## Validation

Required:

- `npm run typecheck`
- `npm run build`
- Mock mode still works and writes `ai_runs` / `ai_context_packs`.
- Missing-key live mode fails gracefully without network retry loops.
- Screenshot evidence of provider selector and missing-key/live-ready state.

Opt-in live validation:

- Add `OPENAI_API_KEY` through Settings > Secrets.
- Enable live validation env gate.
- Run one AI Chat prompt against `openai`.
- Confirm:
  - `ai_runs.providerId = openai`
  - `ai_runs.status = completed`
  - `ai_runs.outputText` contains model output
  - `ai_context_packs` records the exact included candidates

## Out of Scope

- Streaming UI.
- Tool calling.
- Web search/file search.
- Multi-provider management UI beyond mock/live selection.
- Proposal accept/reject behavior.
- Prompt-chain retries and full Jobs UI integration.
