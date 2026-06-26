# Plan 57 - Documents AI Proposal Output Contract

## Summary

Implement the next AI writing slice as a narrow Documents proposal quality pass: make live `Run Proposal` prompts ask for clean proposal-ready output, especially replacement text that can be applied directly. Keep this prompt-shaped, not JSON/structured parsing.

This slice should not add streaming, schema fields, parser logic, provider profiles, or broader Prompt Studio redesign.

## Key Changes

- Add a shared Documents prompt helper that appends action-specific output instructions at runtime without changing stored prompt templates.
  - Rewrite selection: output only the revised replacement passage, preserving paragraph breaks; no labels, markdown fences, commentary, explanation, or quoted source text.
  - Continue from cursor: output only continuation prose that can be appended after the cursor; no labels or explanation.
  - Summary: output only a concise working summary note.
- Use that helper in both `previewDocumentAi(...)` and `createProposalFromLiveRun(...)` so provider-free preview still shows the exact provider-bound prompt.
- Keep existing proposal storage behavior:
  - `ai_runs.outputText` remains the provider output.
  - `ai_proposals.proposedText` remains `run.outputText.trim()`.
  - No post-hoc stripping beyond the existing trim.
- Preserve current safety gates:
  - Replacement `Apply` remains available only for pending replacement proposals with exactly one source match.
  - Append-note proposals remain copy/reject only.
  - Failed or empty provider output still creates no proposal.
- Update the plan/handoff chain after implementation:
  - Save this as `workspace-agents/implementation/plans/57-documents-ai-proposal-output-contract.md`.
  - Add `workspace-agents/session-handoffs/HANDOFF_67.md` after validation.

## Public APIs / Interfaces

- No new IPC channels, database tables, schema fields, preload APIs, or module-contract APIs.
- No changes to `AiProposal`, `AiRun`, or `CreateAiProposalFromInvocationParams`.
- The only interface-level addition should be an internal/shared helper for Documents AI prompt construction, preferably near `app-shell/src/shared/ai-writing-prompts.ts`.

## Test Plan

- From `app-shell/`:
  - Run Svelte autofixer if `MainView.svelte` changes.
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`
- UI evidence:
  - Capture a Documents AI rewrite preview showing the rendered prompt includes the replacement-only output contract.
  - Use a screenshot name like `workspace-agents/implementation/screenshots/documents-ai-output-contract-after-2026-06-26.png`.
- Functional checks:
  - Confirm preview remains provider-free with `providerRequestSent:false`.
  - Confirm preview and live run use the same prompt body plus the same runtime output contract.
  - Confirm a live/mock proposal still creates one pending proposal and does not alter apply/reject behavior.
  - Confirm stored protected/custom prompt templates are not rewritten by this slice.

## Assumptions

- Chosen contract: prompt-shaped text, not strict JSON.
- Runtime output instructions should be appended after the editable template body so they win over weaker template wording.
- If the model ignores the contract, this slice leaves the bad output visible rather than using brittle cleanup heuristics.
- Structured JSON, diff-assisted recovery, fuzzy matching, append-note apply, streaming, cancel support, model presets, and run-history polish remain later slices.
