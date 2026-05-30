# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**Implementation in progress.** The foundational stack/architecture choices are committed as of 2026-05-29 (questionnaire resolved in `archive/decision-answers.md`, recorded in `0-shell-platform-spec.md` §12), and the runnable shell now lives in `app-shell/`.

**Committed stack:** Electron desktop shell + Svelte 5 UI, with core logic (persistence, AI, file handling) in framework-agnostic TypeScript *outside* renderer components where practical (enables a future LAN/iPad client). SQLite is the source of truth for documents (files = import provenance + export targets); fixed-zone layout; documented theming token API; modules bundled at build time (template/fork model); macOS-first. First app = a local-first AI-assisted authoring workbench, reference implementation `draftwell` (see `reference/draftwell-anchor-analysis.md`).

## What This Is

A **reusable desktop shell** — not a writing app, AI chat, or workflow tool. A stable platform with universal primitives that purpose-built modules can extend. The mental model mirrors Obsidian and VS Code: the shell is the host; apps are modules.

The same shell codebase can be forked and configured into different single-purpose apps by swapping which first-party (or custom) modules are active.

## Core Architectural Constraints

These are committed (see `0-shell-platform-spec.md` §12 for the full Q1–Q11 resolution):

- **Shell owns the primitives; modules contribute to them.** Shell owns: workspace lifecycle, document IDs and open/save pipeline, panel layout and docking, command registry, settings store, job queue. Modules may contribute views/commands/settings/document types/jobs — they may not patch shell internals or redefine the workspace contract.
- **Module boundary = unit of optionality.** Feature flags are for rollout only, not permanent substitutes for module boundaries. Long-lived flags are debt.
- **Lazy activation.** Modules activate by explicit user enablement, workspace type, file type, or command invocation — not at startup.
- **Data layering.** Three tiers: shell-level (app settings, layout state, recent workspaces, module registry), workspace-level (documents, module workspace state, jobs/history, indexes/cache), module-level (namespaced settings/cache/artifacts). Modules write only within their namespace.
- **Local-first.** No cloud dependency in the core shell.

## The Seven Primitives

Defined in `0-shell-platform-spec.md`. Every architectural decision should trace back to one of these:

1. **Workspace** — top-level project container
2. **Documents** — file-backed or virtual content objects
3. **Panels** — persistent UI regions (navigation, content, inspector, utilities)
4. **Commands** — invokable actions addressable by ID, reachable through command palette
5. **Settings** — typed, namespaced configuration
6. **Jobs** — background/long-running tasks with managed queue and cancellation
7. **Module registration** — manifest schema, lifecycle, compatibility checks

## Module Contract

Every module must declare: `id`, `name`, `version`, `required shell version`, `activation rules`, contributed commands/views/settings schema/document types/jobs, and permissions required.

## Core Services (to be built)

File system, search/index, event bus, command registry, layout manager, settings manager, job runner, notification/toast, theme/token, permission/capability.

## What Belongs in Modules, Not the Shell

- AI chat logic
- Manuscript/writing workflow rules
- Prompt runner execution
- Graph editor semantics

First-party starter modules planned: Documents, Journal, AI Chat, Prompt Studio, Workflow Runner, Table View, Web (bundled default-on; §12 Q13).

## Open Design Work (decisions resolved; these still need design)

The Q1–Q13 questions are resolved (§12). What remains is design, not decision:
- ~~**Module contract**~~ — ✅ **DONE** (2026-05-29). The contract is `3-module-contract.md`; plan + rationale in `implementation/plans/01-module-contract.md`. Three faces: a module *declares* (manifest), *provides* (contributions + `activate()`), and *receives* (`ModuleContext`). Validated against draftwell's Write room (contract §7).
- ~~**Documents module**~~ — ✅ **DONE** (2026-05-29). Spec: `modules/documents.md`; plan: `implementation/plans/02-documents-module.md`. Per-module specs live in `modules/`. Validated the contract end-to-end (no contract change needed).
- ~~**Document schema**~~ — ✅ **DONE** (2026-05-29). Shell-owned, in `1-shell-spec.md` §3; app-neutral, with the shell-universal vs. module-extension split (`manuscriptId`/`wordCount` stay module-level).
- ~~**Built-in primitives draftwell lacks**~~ — ✅ **ALL DONE** (2026-05-29): ~~command palette, keybindings~~ (`implementation/plans/05-command-palette.md`): Cmd+K palette + keybinding runtime. ~~Right-click context menus~~ (2026-05-29): shell-owned `ContextMenu.svelte` + `contextmenu.ts` store, wired to NavView tree. These are the UI/runtime of the Commands primitive modules register into via `ctx.commands`.
- ~~**Status bar zone**~~ — ✅ **DONE** (2026-05-29; `implementation/plans/06-editor-statusbar-polish.md`): Three-zone layout (left: module items, center: reserved, right: shell info) with hover states, transitions, pulsing unsaved indicator.
- ~~**Editor polish**~~ — ✅ **DONE** (2026-05-29; `implementation/plans/06-editor-statusbar-polish.md`): Floating bubble menu on text selection, debounced 3s auto-save, wired font/size/spellcheck settings.
- ~~**Scaffold (Option B)**~~ — ✅ **DONE** (2026-05-29). `app-shell/` directory — Electron + Svelte 5 + SQLite running. All five zones render, Documents module activates through the `ModuleContext`, IPC pipeline wired. Screenshot validated. Plan: `implementation/plans/03-scaffold.md`.
- ~~**Editor engine (F1)**~~ — ✅ **DONE** (2026-05-29). `<textarea>` stub replaced with **TipTap 3** WYSIWYG (`@tiptap/core` + `starter-kit` + `tiptap-markdown`) in a thin Svelte 5 wrapper (`MainView.svelte`). Engine chosen over Carta because draftwell (the anchor) uses TipTap. Content round-trips as markdown via `editor.storage.markdown` — store/IPC/schema/contract all unchanged. Plan: `implementation/plans/04-editor-engine.md`; evidence: `implementation/screenshots/editor-engine-after-2026-05-29.png`.
- ~~**Remaining modules**~~ — ✅ **DONE** (2026-05-29). All six modules scaffolded: Journal (📓 daily entries), Assets (🖼 file gallery), Workflow Runner (⚡ export jobs), Table View (📊 data table), AI Chat (🤖 mock chat), Web (🌐 browser placeholder). Each has manifest + activate in main, three views (nav/main/inspector) in renderer. Shell chrome refactored to dynamic module routing. Screenshot: `implementation/screenshots/all-modules-after-2026-05-29.png`.
- ~~**Toast/notification service**~~ — ✅ **DONE** (2026-05-29). Renderer sink for `shell:notify` events. `ToastContainer.svelte` + `store/toasts.ts`. Auto-dismiss timers, FIFO queue, glassmorphism styling.
- ~~**Settings panel**~~ — ✅ **DONE** (2026-05-29). `SettingsPanel.svelte` modal via Cmd+,. Editor font/size/spellcheck with live preview + IPC persistence.
- ~~**AI orchestration Phase 1**~~ — ✅ **DONE** (2026-05-30; `implementation/plans/15-ai-orchestration-and-context.md`): Shared AI contracts, SQLite persistence tables, mock provider, context candidates/packs, run history, renderer AI bridge, and wiring across AI Chat, Prompt Studio, and Workflow Runner. AI-specific behavior lives under `app-shell/src/main/ai/`, not shell core.
- ~~**OpenAI live provider adapter**~~ — ✅ **DONE** (2026-05-30; `implementation/plans/16-openai-live-provider.md`): Added `openai-responses` provider support through the Responses API using `OPENAI_API_KEY` from encrypted Secrets, while preserving `mock-local`, shared context packs, and persisted run history.

## Workspace Layout

```
app-shell-project/
├── CLAUDE.md                 ← you are here (durable orientation)
├── session-handoffs/         ← per-session handoffs, numbered HANDOFF_NN.md
│   └── HANDOFF_07.md         ← latest = highest number; read it first
├── 0-shell-platform-spec.md  ← primary spec; §12 = resolved decisions
├── 1-shell-spec.md           ← SHELL_SPEC: stack, layout, persistence, theming, manifest
├── 2-modules-overview.md     ← MODULES_OVERVIEW: first module-set + room→module map
├── 3-module-contract.md      ← MODULE_CONTRACT: how a plugin plugs into the shell (the keystone)
├── modules/                  ← per-module design specs (one file per module)
│   └── documents.md          ← Documents module (Write + Plan); first real module
├── reference/                ← material that informs the work ahead
│   ├── draftwell-anchor-analysis.md          (reference app → shell zones/modules)
│   ├── obsidian-vscode-extensibility-teardown.md  (prior-art for the module system)
│   └── single-file-css.md                    (CSS technique for theming/chrome)
├── implementation/           ← planning + validation (see implementation/AGENTS.md)
│   ├── plans/                ← detailed plans, written before executing a slice
│   └── screenshots/          ← UI validation evidence
├── app-shell/                ← Electron + Svelte 5 + SQLite scaffold (Option B, 2026-05-29)
│   ├── src/main/             ← Electron main: core services, module registry, IPC handlers
│   ├── src/preload/          ← contextBridge (window.shell)
│   └── src/renderer/         ← Svelte 5 UI: AppShell, zone components, Documents views
└── archive/                  ← spent decision-phase artifacts; safe to skip (see archive/README.md)
```

**Implementation work:** ambitious slices get a plan in `implementation/plans/` before execution; UI changes get screenshot evidence in `implementation/screenshots/`. See `implementation/AGENTS.md` for the conventions.

**Handoffs:** session handoffs live in `session-handoffs/`, numbered `HANDOFF_NN.md` — one per session, accumulating (never overwrite). Read the highest-numbered first. Each handoff is a **lean, slice-focused** brief whose only job is to get the next agent up to speed fast: status of the slice just completed or in progress, decisions made this session, what's being carried forward, and the recommended next action. Include only what's relevant to *that* slice — keep it minimal so new-session load stays light. (Distinct from this file: CLAUDE.md is durable workspace/project orientation; a handoff is session-to-session status. `HANDOFF_01.md` is the founding handoff and is naturally heavier — later ones should be leaner.)

**Reading order for a fresh session:** latest `session-handoffs/HANDOFF_NN.md` → this file → `0-shell-platform-spec.md` §12 → `reference/` as needed.
