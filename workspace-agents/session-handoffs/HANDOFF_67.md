# Session Handoff 67 - Documents AI Proposal Output Contract

_Session: 2026-06-26 - Slice: Plan 57 Documents AI proposal output contract_

## What Changed

- Implemented `workspace-agents/implementation/plans/57-documents-ai-proposal-output-contract.md`.
- Added `documentsAiPromptWithOutputContract(...)` in `app-shell/src/shared/ai-writing-prompts.ts`.
- Runtime Documents AI prompts now append action-specific output contracts without rewriting stored prompt templates:
  - rewrite selection asks for only the revised replacement passage;
  - continue from cursor asks for only continuation prose;
  - summarize active document asks for only a concise working summary note.
- Updated Documents AI preview, provider-free proposal capture, and live `Run Proposal` calls to use the same runtime prompt helper.
- Preserved proposal storage:
  - `ai_runs.outputText` remains provider output;
  - `ai_proposals.proposedText` remains `run.outputText.trim()`;
  - no JSON parser or cleanup heuristic was added.
- Added capture-only prompt scrolling in the existing `shell:capture-document-ai-preview` handler so screenshot evidence can show the appended contract inside the fixed rendered-prompt box.

## Evidence

- `mcp__svelte.svelte_autofixer` on `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot:
  - `workspace-agents/implementation/screenshots/documents-ai-output-contract-after-2026-06-26.png`
- Data checks:
  - `ai_prompt_templates` rows with `body LIKE '%Output contract:%'`: `0`
  - validation temp documents remaining: `0`
  - validation temp proposals remaining: `0`
- Live proposal proof on a temporary document:
  - proposal type: `replacement`
  - proposal status: `pending`
  - run status: `completed`
  - provider: `openai-responses`
  - `ai_proposals.proposedText = trim(ai_runs.outputText)`
  - temporary document/proposal/run/context rows were cleaned up afterward.
- Local app settings restored after validation:
  - `shell.activeWorkspaceId` restored to `ws-10858106-f9fd-4a63-97c9-7b41161f0aa1`
  - `shell.ai.providerId` restored to `openai-responses`

## Not Built

- No streaming.
- No structured JSON response contract.
- No parser or post-hoc output stripping beyond existing trim behavior.
- No schema, IPC, preload, or module-contract changes.
- No append-note apply, fuzzy matching, diff-assisted recovery, provider profiles, or run-history polish.

## Notes for Next Agent

- The output contract is intentionally runtime-only. Custom and protected stored prompt bodies remain editable/unmodified.
- The next useful slice is either structured response parsing if model compliance is weak, or streaming/cancel support if prompt-shaped proposal quality is acceptable in live use.
