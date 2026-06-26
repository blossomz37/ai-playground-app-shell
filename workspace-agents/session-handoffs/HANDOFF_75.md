# Session Handoff 75 - UI/UX First-Class Roadmap: Plan 68 kickoff (Slice 0 + Slice 1), paused for screenshot capture

_Session: 2026-06-26 - Slice: assessment → roadmap plan → Slice 0 discovery → Slice 1 universal search (code-complete, screenshots blocked)_

## What Changed

Produced a strategic UI/UX product assessment, turned its roadmap into an
orchestrated multi-slice plan, executed the discovery gate (Slice 0) and the
first P0 slice (Slice 1, universal "go to anything" search). Paused before
further slices because the required screenshot evidence cannot be produced in
this remote sandbox (the app cannot build/launch here).

Artifacts:
- Assessment: `docs/product/uiux-assessment-2026-06.md`
- Plan: `workspace-agents/implementation/plans/68-uiux-first-class-roadmap.md`
- PR: blossomz37/ai-playground-app-shell#2 (draft)

## Commits (branch `claude/repo-uiux-overview-44a073`)

- `cb28e40` Add UI/UX product assessment
- `7bc397b` Add UI/UX first-class roadmap plan (68)
- (Slice 0) Record discovery: current-state map, risk register, contract deltas
- `ad7a8b4` Slice 1 universal search (backend FTS) [WIP]
- `5f51659` Slice 1 QA fixes (asset dedupe via EXISTS; snippet sentinel + escape)
- `ee90fa5` Record Slice 1 outcome + env blocker in plan 68

## Slice 0 - Discovery (done)

Four explorers mapped the search backend, entity persistence, AI plumbing, and
token consumers. Full map + risk register + contract-change deltas are in plan
68's Outcome Log. Key facts: search is documents-only FTS5 capped at 20;
`SearchResult` lives in `src/shared/module-contract.ts`; chats/templates/assets
are SQLite (unindexed), while chains/journal/bookmarks are settings-backed; the
AI global model-state leak is real but the Slice 3 fixes are mostly
renderer-only; light/system themes never override the zone accents (a
pre-existing bug for Slice 5).

## Slice 1 - Universal "go to anything" search (code-complete, NOT yet proven)

Chosen at the contract gate: **Backend FTS**. Implemented:
- `src/main/core/db.ts` — FTS5 tables + sync triggers + idempotent backfill for
  `ai_conversations` (title + aggregated `ai_messages` content), `ai_prompt_templates`
  (name + description + body), `assets` (label + originalName + comments + tags),
  alongside the existing `documents_fts`.
- `src/main/core/search.ts` — `search()` UNIONs all four FTS tables; `recents()`
  is a non-FTS empty-query fallback ordered by `updatedAt`; match highlights use
  STX/ETX sentinels; default limit 50.
- `src/shared/module-contract.ts` — `SearchResult` extended with
  `entityType`/`entityId`/`moduleId`; `documentId` now optional (back-compat);
  added `search.recents`.
- `src/main/ipc.ts`, `src/preload/index.ts`, `src/renderer/src/browser-shell.ts`
  — `search:recents` channel wired through.
- `src/renderer/src/store/navigate.ts` (new) — routes a result to the correct
  module + selects the entity (load-before-select per type).
- `src/renderer/src/modules/assets/state.ts` — exported `loadAssetsWorkspace()`.
- `src/renderer/src/shell/CommandPalette.svelte` — recents on empty query,
  entity-type badges, routing by `entityType`, visible result count (no silent
  20-cap), `renderSnippet()` HTML-escapes the fragment then swaps sentinels for
  `<mark>`.

Adversarial QA (static, since runtime is impossible here) verified FTS
schema/triggers/snippet indices, migration idempotency/back-compat, query scoping,
navigation imports, and type back-compat as correct; it found one **blocking**
bug (asset rows duplicated by the `asset_workspace_links` join) — fixed with an
`EXISTS` subquery in both `search()` and `recents()` — and a snippet hardening
item, also fixed.

Static validation: `npm run typecheck` ✓, `npm run build` ✓.

Deferred (logged, not silently dropped): chains, journal, bookmarks are
settings-backed and not FTS-indexable without the Slice 4 data-model change.

## Why Paused: environment cannot run the app

The Electron app cannot launch in this remote sandbox: the native
`better-sqlite3` module cannot be built because the network policy blocks
`nodejs.org` (node headers) and `release-assets.githubusercontent.com` (prebuilt
binary), both returning 403 (confirmed via `npm rebuild better-sqlite3` and the
agent-proxy status). Therefore **no `SHELL_CAPTURE` screenshots and no runtime
SQL execution are possible here**. The First-Class Bar requires screenshot proof,
so Slice 1 is "code-complete" but not "done". Carlo chose to pause rather than
lower the bar or proceed unverified.

## Resume Checklist (run on a machine that CAN build the app, e.g. macOS)

1. **Unblock native build** (one of):
   - Build locally on macOS where egress is open; or
   - In a remote env, allow `nodejs.org` + `release-assets.githubusercontent.com`
     in the network policy, then `cd app-shell && npm rebuild better-sqlite3`.
2. **Static gates:** `cd app-shell && npm install && npm run typecheck && npm run build` (all expected clean).
3. **Runtime verification** (the part never exercised here — watch these specific risks):
   - Launch on an **existing/seeded** workspace DB and confirm migration runs
     cleanly (new FTS tables created + backfilled; no errors; no data loss; second
     launch is a no-op — backfill is guarded by empty-table checks).
   - Open the palette in search mode (Cmd+Shift+F). Confirm a query returns
     **documents, chats, prompts, and assets** interleaved, each with a type badge.
   - Empty query shows **Recents** (most-recently-updated across the four types).
   - Selecting each result type navigates to the right module and focuses the
     entity (document/chat/prompt/asset).
   - Create an asset with **two workspace roles**, confirm it appears **once**
     (the EXISTS dedupe fix).
   - Put literal HTML (e.g. `<img src=x onerror=alert(1)>`) in a document, search
     for surrounding text, confirm the snippet shows it **as text** (escaped) with
     working `<mark>` highlight — no layout break, no script.
   - Confirm the result count is shown and there is no silent truncation; `>`
     command mode and keyboard nav unchanged.
4. **Capture required screenshots** (heavy seeded state — many docs/chats/prompts/assets),
   store under `workspace-agents/implementation/screenshots/`:
   - `uiux-fc-goto-empty-recents-after-2026-06-26.png` (palette open, empty query → recents)
   - `uiux-fc-goto-mixed-results-after-2026-06-26.png` (query returning all four types with badges + count)
   - `uiux-fc-goto-before-2026-06-26.png` (old document-only behavior for the diff, from before this branch)
   - Capture hook: `SHELL_CAPTURE=...png npm run start`. The palette has a
     `shell:capture-open-command-palette` listener and prior passes used
     `SHELL_CAPTURE_COMMAND_PALETTE_QUERY`; note that listener currently opens in
     **command** mode (`> {query}`). To screenshot the **search** palette with
     results/recents, a small capture-hook addition in
     `app-shell/src/main/capture/evidence.ts` is likely needed (open in search
     mode + seed a query), mirroring how plans 66/67 extended that file.
5. **Then** update plan 68's Slice 1 row to "done", attach evidence paths, and
   resume Slice 2.

## Remaining Slices (queued, not started)

- Slice 2 NavView inline search (P0, renderer-only, no gate)
- Slice 3 AI mental-model unification (P0, renderer-only path per Slice 0)
- Slice 4 organizing layer pins/tags/recents (P1, **schema/IPC — contract gate pending**)
- Slice 5 color discipline (P1, renderer-only; also fixes the light/system zone-accent bug)
- Slice 6 clutter pass (P2, renderer-only)

All carry the same screenshot constraint until the app can run.

## Open Threads

- PR #2 is a draft; an hourly self check-in is armed to re-check CI/mergeability
  until it is merged/closed.
- Slice 4's contract-gate decision (schema for pins/tags/recents) is still owed
  to Carlo when that slice is reached.
