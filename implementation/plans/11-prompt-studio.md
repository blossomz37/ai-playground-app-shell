---
file: 11-prompt-studio.md
description: Scaffold the Prompt Studio module (listed in §11 but missing)
version: 0.2.0
created: 2026-05-29
modified: 2026-05-30
author: antigravity
status: implemented-by-15
---

# 11 — Prompt Studio Module

## Problem

`0-shell-platform-spec.md` §11 lists **Prompt Studio** as a separate first-party starter module, distinct from AI Chat. The module map in `2-modules-overview.md` §2 groups them as "AI Chat / Prompt Studio" from draftwell's AI layer. Currently only `shell.aichat` exists — there is no Prompt Studio module.

The distinction (per the draftwell analysis): **AI Chat** is conversational (send message → get response); **Prompt Studio** is a structured prompt engineering workbench (templates, variable binding, batch runs, output comparison, accept/reject proposals).

## Spec References

- `0-shell-platform-spec.md` §11 (first-party module list)
- `2-modules-overview.md` §2 (AI Chat / Prompt Studio row)
- `0-shell-platform-spec.md` §10 ("prompt-runner-specific execution logic" belongs in modules)

## Scope

### Must

- Manifest (`shell.promptstudio`), `activate()`, and 3 views (nav, main, inspector)
- **Nav**: Prompt template list (browse/create/duplicate)
- **Main**: Template editor — prompt text with `{{variable}}` slots, variable binding panel, "Run" button, output display
- **Inspector**: Run history, template metadata, model/provider selector

### Should

- Use `ctx.commands.execute('ai.invoke', ...)` or similar to delegate actual AI calls to a shared service
- Distinguish mock vs. live execution (mirrors the AI Chat mock pattern)

### Could

- Batch runs (run one template against multiple variable sets)
- Output comparison / diff view
- Accept/reject proposals that write back to documents via `ctx.documents.save()`

## Files to Create

- `src/main/modules/promptstudio/index.ts`
- `src/renderer/src/modules/promptstudio/NavView.svelte`
- `src/renderer/src/modules/promptstudio/MainView.svelte`
- `src/renderer/src/modules/promptstudio/InspectorView.svelte`

## Files to Modify

- `src/main/index.ts` — register + enable the new module
- `src/renderer/src/shell/{Sidebar,MainPane,Inspector}.svelte` — add routing case

## Outcome - 2026-05-30

Prompt Studio now exists as `shell.promptstudio` with a manifest, activation, commands, and three renderer views:

- Main process: `app-shell/src/main/modules/promptstudio/index.ts`
- Renderer views: `app-shell/src/renderer/src/modules/promptstudio/{NavView,MainView,InspectorView}.svelte`
- Registered in the shell module registry path from `app-shell/src/main/index.ts`

The current implementation supports template browsing/editing in the UI, variable input, shared AI invocation, output preview, and provider/model/status controls through the shared AI orchestration layer. Batch runs and proposal accept/reject remain future work.
