# Session Handoff 08 - OpenAI Live Provider Adapter

_Session: 2026-05-30 · Slice: OpenAI Responses provider for shared AI orchestration_

## What Changed

Implemented the first live AI provider while keeping mock mode as the default fallback:

- Added `openai-responses` provider metadata with `secretName = OPENAI_API_KEY`.
- Added a main-process Responses API adapter under `app-shell/src/main/ai/openai-provider.ts`.
- `aiOrchestrator.invoke()` now resolves provider defaults, dispatches to mock or OpenAI, and persists the same run/context history for both paths.
- Added renderer provider/model/temperature state and `window.shell.ai.providers()`.
- Wired shared provider selectors into AI Chat, Prompt Studio, and Workflow Runner inspectors.
- Added capture-only `SHELL_CAPTURE_AI_PROVIDER` and `SHELL_CAPTURE_AI_MODEL` overrides for provider smoke evidence.

## Evidence

- `npm run typecheck` passed.
- `npm run build` passed.
- Mock selector screenshot: `implementation/screenshots/openai-live-provider-selector-after-2026-05-30.png`.
- Missing-key OpenAI screenshot: `implementation/screenshots/openai-live-provider-missing-key-after-2026-05-30.png`.
- SQLite smoke check confirmed a completed `mock-local` run and a failed `openai-responses` run both wrote `ai_context_packs`.

## Carry Forward

- Live OpenAI completion was not run because no correctly named `OPENAI_API_KEY` secret is stored. There is a similarly named `OPEN_AI_KEY`, but the adapter deliberately requires `OPENAI_API_KEY`.
- Default OpenAI model is currently `gpt-4.1-mini` with `gpt-4.1` also selectable; this is conservative while the UI still exposes temperature.
- Next useful slice: add a small provider settings surface that can refresh secrets after adding `OPENAI_API_KEY`, optionally allow custom model IDs, and run one opt-in live smoke.
