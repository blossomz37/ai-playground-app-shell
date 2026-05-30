---
file: 15-ai-orchestration-and-context.md
description: Design chat, prompt chaining, and user-configurable AI context across AI Chat, Prompt Studio, and Workflow Runner
version: 0.2.0
created: 2026-05-30
modified: 2026-05-30
author: codex
status: phase-1-implemented
---

# 15 - AI Orchestration and Configurable Context

## Goal

Define the architecture for AI Chat, Prompt Studio, prompt chaining, and user-configurable context without putting AI-specific behavior into the shell core.

This slice produces the shared AI execution model that first-party modules can use:

- AI Chat: conversational interaction over selected workspace context.
- Prompt Studio: structured templates, variables, test runs, and reusable prompt assets.
- Workflow Runner: multi-step prompt chains, long-running jobs, and repeatable workflows.
- Documents: readable source material and proposal writeback target.

## Phase 1 Implementation - 2026-05-30

Implemented the first durable AI orchestration layer:

- Shared AI contracts live in `app-shell/src/shared/ai.ts`.
- Workspace SQLite tables now cover providers, conversations/messages, templates, runs, context packs, chains, proposals, and tool calls.
- Main-process orchestration lives under `app-shell/src/main/ai/`, outside shell core services.
- `mock-local` provider records completed runs and immutable context packs without requiring API keys.
- Renderer bridge exposes `window.shell.ai.collectContext`, `invoke`, `runs`, `templates`, and `saveTemplate`.
- AI Chat, Prompt Studio, and Workflow Runner now call the shared layer instead of owning isolated mock behavior.
- Dev capture supports `SHELL_CAPTURE_MODULE`, `SHELL_CAPTURE_DOCUMENT`, and `SHELL_CAPTURE_AI_PROMPT` for UI evidence.

Validation evidence:

- `npm run typecheck`
- `npm run start` with capture: `implementation/screenshots/ai-orchestration-chat-after-2026-05-30.png`
- SQLite smoke check confirmed `ai_*` tables, a starter template, and a completed `shell.aichat` run.

## Problem

The workspace already identifies AI Chat and Prompt Studio as first-party modules, and the DraftWell anchor points to the richer target shape: context preview, toggleable context candidates, workflows, runs, prompt-chain steps, tool calls, proposals, and mock/live mode.

Current code only has scaffolded mock UI:

- `shell.aichat` is a local mock chat.
- `shell.promptstudio` is a template editor placeholder.
- No persistent conversation/run schema exists.
- No shared `ai.invoke` execution command exists.
- No user-facing context selection model exists.
- No prompt-chain step model exists.
- No proposal writeback contract exists.

## Anchors

- `0-shell-platform-spec.md` §10: AI-chat-specific logic and prompt-runner-specific execution logic belong in modules, not the shell.
- `0-shell-platform-spec.md` §11: AI Chat and Prompt Studio are first-party starter modules.
- `0-shell-platform-spec.md` §12 Q12: secrets are shell-owned because AI Chat, Prompt Studio, and Workflow Runner all need credentials.
- `2-modules-overview.md` §2: the AI layer maps to AI Chat / Prompt Studio, with context preview, workflows, runs, proposals, and mock/live behavior.
- `reference/draftwell-anchor-analysis.md` §2: DraftWell validates prompt-chain steps, tool calls, runs, proposals, and toggleable context candidates.
- `3-module-contract.md` §5: modules communicate through `ModuleContext`, especially commands, settings, secrets, jobs, events, and documents.
- `implementation/plans/14-state-architecture.md`: module state and logic should move into framework-agnostic TypeScript slices.

## Core Decision

AI orchestration is a first-party module-layer service, not a shell primitive.

The shell should provide only the neutral primitives:

- Documents
- Settings
- Secrets
- Jobs
- Events
- Commands
- Notifications
- Workspace identity

The AI modules should provide the meaning:

- What context is eligible.
- How context is packed.
- How prompts are templated.
- How model calls are assembled.
- How prompt chains proceed.
- How outputs become proposals.
- How proposals are accepted, rejected, or written back.

This keeps the shell reusable for non-AI apps while still giving the first app a coherent AI system.

## Conceptual Model

### AI Provider

Provider settings define how a model call is made.

Fields:

- `providerId`
- `providerName`
- `secretName`
- `baseUrl`
- `defaultModel`
- `availableModels`
- `supportsStreaming`
- `supportsTools`

Storage:

- Non-secret provider settings live in namespaced settings.
- Secret values live in shell secrets and are referenced only by name.

### Context Source

A context source is anything that can contribute material to an AI run.

Initial source types:

- Active document
- Selected documents
- Document descendants
- Search results
- Manual note
- Current chat conversation
- Prompt Studio variable values
- Future: assets, journal entries, table rows, web clips

Each source produces context candidates.

### Context Candidate

A context candidate is a previewable item the user can include or exclude before a run.

Fields:

- `id`
- `sourceType`
- `sourceId`
- `title`
- `kind`
- `excerpt`
- `estimatedTokens`
- `included`
- `priority`
- `reason`

The user must be able to see and toggle candidates. This is the missing "user-configurable context" layer.

### Context Pack

A context pack is the exact context snapshot used for a run.

Fields:

- `id`
- `runId`
- `createdAt`
- `candidates`
- `renderedText`
- `tokenEstimate`
- `packingStrategy`

Context packs are immutable once a run starts. This makes outputs auditable and reproducible.

### Prompt Template

Prompt templates belong primarily to Prompt Studio.

Fields:

- `id`
- `name`
- `description`
- `body`
- `variables`
- `defaultModel`
- `defaultTemperature`
- `contextPolicy`
- `tags`
- `createdAt`
- `updatedAt`

Variables are explicit slots, not ad hoc string replacement hidden inside the UI.

### AI Run

An AI run is one model invocation or one parent workflow execution.

Fields:

- `id`
- `moduleId`
- `originType` (`chat`, `template`, `chain`, `workflow`)
- `originId`
- `providerId`
- `model`
- `temperature`
- `status`
- `inputSummary`
- `outputText`
- `error`
- `createdAt`
- `completedAt`

Runs should be visible in module inspectors and, when long-running, in the shell Jobs surface.

### Prompt Chain

A prompt chain is a reusable ordered workflow of AI steps.

Fields:

- `id`
- `name`
- `description`
- `steps`
- `createdAt`
- `updatedAt`

Each step has:

- `id`
- `name`
- `templateId`
- `inputMap`
- `contextPolicy`
- `outputKey`
- `onError`

Output from one step can be mapped into variables for later steps.

### Chain Run and Step Run

A chain run records the parent workflow. Step runs record each prompt invocation.

Chain run fields:

- `id`
- `chainId`
- `status`
- `startedAt`
- `completedAt`

Step run fields:

- `id`
- `chainRunId`
- `stepId`
- `runId`
- `inputSnapshot`
- `outputSnapshot`
- `status`
- `order`

These records are the basis for debugging, retrying, comparing, and teaching prompt sequencing.

### Proposal

A proposal is an AI output that can affect a document but has not been accepted yet.

Fields:

- `id`
- `runId`
- `targetDocumentId`
- `proposalType` (`append-note`, `replacement`, `outline`, `metadata`, `new-document`)
- `sourceText`
- `proposedText`
- `status` (`pending`, `accepted`, `rejected`)
- `createdAt`
- `resolvedAt`

Accept/reject behavior belongs in the module that understands the proposal type. Document writes still go through `ctx.documents.save()`.

## User Experience

### AI Chat

AI Chat should feel like a working conversation, but with visible context control.

Navigation:

- Conversation list.
- New conversation.
- Conversation metadata.

Main pane:

- Message stream.
- Composer.
- Run status and retry affordances.

Inspector:

- Context panel with included/excluded candidates.
- Provider/model settings.
- Conversation run history.
- Option to save a useful exchange as a Prompt Studio template.

### Prompt Studio

Prompt Studio should be a structured prompt engineering workbench.

Navigation:

- Template list.
- Template groups/tags.
- New/duplicate/delete actions.

Main pane:

- Template editor.
- Variable editor.
- Context preview.
- Run output.
- Comparison view for multiple outputs.

Inspector:

- Run settings.
- Run history.
- Template metadata.
- Proposal/writeback actions.

### Workflow Runner

Workflow Runner should own repeatable prompt chains and long-running orchestration.

Navigation:

- Workflow/chain list.
- Recent chain runs.

Main pane:

- Step sequence view.
- Current run progress.
- Step outputs.

Inspector:

- Chain settings.
- Context policy.
- Retry/cancel controls.
- Job log.

## Architecture

### Shared AI Orchestration Package

Create a framework-agnostic package or directory for shared AI module logic.

Candidate location:

- `app-shell/src/main/ai/`

Initial files:

- `providers.ts`
- `context-candidates.ts`
- `context-packer.ts`
- `templates.ts`
- `runs.ts`
- `chains.ts`
- `proposals.ts`
- `mock-provider.ts`

This code should not import Svelte. Renderer components subscribe to module state rather than owning AI logic.

### Shared Command Surface

Define command IDs that modules can call without importing each other.

Initial commands:

- `ai.invoke`
- `ai.context.collect`
- `ai.context.pack`
- `ai.template.run`
- `ai.chain.run`
- `ai.proposal.accept`
- `ai.proposal.reject`

`ai.invoke` should be registered by the shared AI orchestration layer or by a first-party AI module that is always enabled in the authoring app build. Prompt Studio and AI Chat can call it through `ctx.commands.execute()`.

### Jobs Integration

Use Jobs for:

- Long model calls.
- Batch Prompt Studio runs.
- Prompt chains.
- Tool-using workflows.

Short chat calls can start as direct async commands, but the run record should still be persisted. Streaming can later be represented as events.

### Event Surface

Initial events:

- `ai.run.started`
- `ai.run.delta`
- `ai.run.completed`
- `ai.run.failed`
- `ai.context.updated`
- `ai.proposal.created`
- `ai.proposal.resolved`

Events let Chat, Prompt Studio, Workflow Runner, Jobs UI, and inspectors update without direct coupling.

### Persistence

Add AI-specific tables under the workspace database, not shell global state.

Candidate tables:

- `ai_providers`
- `ai_conversations`
- `ai_messages`
- `ai_prompt_templates`
- `ai_context_packs`
- `ai_runs`
- `ai_prompt_chains`
- `ai_chain_runs`
- `ai_chain_step_runs`
- `ai_proposals`
- `ai_tool_calls`

Names can be refined during implementation, but the boundary should stay: workspace-level AI history and module-level settings, with secrets referenced by name only.

## Build Order

### Phase 1 - Design and Data Contract

1. Create `modules/aichat.md` and `modules/promptstudio.md` if the slice needs full module specs.
2. Finalize AI table schemas.
3. Define TypeScript types for providers, context candidates, packs, templates, runs, chains, and proposals.
4. Define the command/event IDs as constants.
5. Add mock provider support so the UI can work without API keys.

### Phase 2 - User-Configurable Context

1. Implement context candidate collection from active/selected documents.
2. Add context candidate preview and toggles in AI Chat inspector.
3. Add context candidate preview in Prompt Studio.
4. Persist context packs per run.
5. Add token estimates as approximate counts first; exact tokenizer support can come later.

### Phase 3 - Real Chat Persistence

1. Persist conversations and messages.
2. Move current mock chat state into a plain TypeScript AI Chat state slice.
3. Route send-message through `ai.invoke`.
4. Record every response as an `ai_run`.
5. Keep mock/live mode switchable.

### Phase 4 - Prompt Studio Runtime

1. Persist templates.
2. Parse and validate variables.
3. Bind variables to user-entered values and context packs.
4. Run templates through `ai.invoke`.
5. Store run history.
6. Add output comparison after the single-run path is stable.

### Phase 5 - Prompt Chains

1. Persist chain definitions and step definitions.
2. Run chains through Jobs.
3. Store step run inputs and outputs.
4. Support step output mapping into later step variables.
5. Add retry from failed step.

### Phase 6 - Proposals and Writeback

1. Create proposal records from AI outputs.
2. Surface proposals in the relevant module inspector.
3. Implement accept/reject actions.
4. Write accepted changes through `ctx.documents.save()`.
5. Add document version labels that identify AI-originated changes.

## Files and Areas Likely Touched

Planning/spec files:

- `modules/aichat.md`
- `modules/promptstudio.md`
- `implementation/plans/15-ai-orchestration-and-context.md`

Main process:

- `app-shell/src/main/ai/*`
- `app-shell/src/main/modules/aichat/index.ts`
- `app-shell/src/main/modules/promptstudio/index.ts`
- `app-shell/src/main/modules/workflow/index.ts`
- `app-shell/src/main/core/jobs.ts`
- `app-shell/src/main/core/settings.ts`
- `app-shell/src/main/core/secrets.ts`
- `app-shell/src/main/core/db.ts`
- `app-shell/src/main/ipc.ts`

Shared types:

- `app-shell/src/shared/module-contract.ts`
- `app-shell/src/shared/ai.ts`

Renderer:

- `app-shell/src/renderer/src/modules/aichat/*`
- `app-shell/src/renderer/src/modules/promptstudio/*`
- `app-shell/src/renderer/src/modules/workflow/*`
- `app-shell/src/renderer/src/shell/SettingsPanel.svelte`
- `app-shell/src/renderer/src/shell/JobDrawer` or future Jobs UI surface

## Risks and Unknowns

- Provider strategy: one OpenAI-first implementation may be enough for the first pass, but the types should not hard-code one provider.
- Streaming: useful for chat, but can be deferred until non-streaming run records work.
- Token counting: exact tokenizers add dependency weight; approximate estimates are acceptable for the first context UI.
- Prompt-chain UX: the data model can be implemented before a polished visual chain editor.
- Proposal safety: direct replacement proposals need strong source matching and version history. Start with append-note or new-document proposals if replacement safety is not ready.
- Module ownership: `ai.invoke` needs a clear owner. Prefer a first-party shared AI orchestration layer used by AI Chat, Prompt Studio, and Workflow Runner rather than one module secretly depending on another.

## Validation

Because this is a planning artifact, validation for this slice is document-level:

- Confirm the plan exists at `implementation/plans/15-ai-orchestration-and-context.md`.
- Confirm it cites the platform/module anchors.
- Confirm it keeps AI-specific behavior outside shell core.
- Confirm it defines context candidates, context packs, runs, chains, and proposals.

When implemented later, validation should include:

- `npm run typecheck`
- `npm run build`
- AI Chat screenshot with context candidates visible.
- Prompt Studio screenshot with template variables, context preview, and output history visible.
- Workflow Runner screenshot with a multi-step chain run visible.
- Persist/reload test proving conversations, runs, and context packs survive restart.
- Mock-provider test proving the feature works without API keys.
- Live-provider smoke test only when a secret is configured and live AI is explicitly enabled.

## Out of Scope

- Building the AI runtime in this slice.
- Choosing a final visual chain editor design.
- Implementing cloud sync.
- Adding runtime third-party plugins.
- Adding a full provider marketplace.
- Solving exact tokenizer support in the first pass.
- Direct manuscript replacement without a separate proposal-safety pass.

## Recommended Next Step

Before implementation, create or expand `modules/aichat.md` and `modules/promptstudio.md` with their user-facing behavior and persistence needs, then implement Phase 1 as a narrow foundation slice.
