# Plan 68 - UI/UX First-Class Roadmap (Orchestrated, Multi-Slice)

## Summary

This plan executes the prioritized roadmap from `docs/product/uiux-assessment-2026-06.md`
to bring App Shell to a first-class bar for the novel-authoring use case at scale.
It is deliberately larger than plans 66/67: those were tactical polish passes that
avoided data-model, IPC, and contract changes. This plan **does** allow those
changes where the assessment shows they are required (scale spine, AI coherence,
organizing layer), gated behind an explicit stop-and-confirm protocol.

The plan is orchestrated: a lead agent decomposes work, spawns explorer/worker/QA
subagents, monitors each slice to completion, and **rejects substandard output**,
iterating each slice until it clears the First-Class Bar. Every UI-visible slice
ships only when screenshot evidence proves the change.

## Anchor

- Product assessment: `docs/product/uiux-assessment-2026-06.md` (P0–P2 roadmap).
- Prior art and house conventions: plans `66-ui-ux-audit-resolution.md`,
  `67-ui-ux-next-pass.md`; capture hook in `workspace-agents/implementation/AGENTS.md`.
- Architecture commitments: `CLAUDE.md` and `docs/architecture/shell-platform-spec.md`
  §12; module boundary in `docs/architecture/module-contract.md`.

## Scope

In scope (from the assessment roadmap):

| Roadmap item | Priority | Slice |
|---|---|---|
| Universal "go to anything" search/palette | P0 | Slice 1 |
| Inline search/filter in every NavView | P0 | Slice 2 |
| AI mental-model unification (model/temp per run, unified context + run history) | P0 | Slice 3 |
| Organizing layer: pins / tags / recents in the data model | P1 | Slice 4 |
| Color discipline: single accent + semantic + one AI color | P1 | Slice 5 |
| Clutter pass: de-dupe Jobs UI, single editor header, icon-ify buttons | P2 | Slice 6 |

Slice 0 (Discovery & Foundations) precedes all of them and is a hard gate.

Out of scope for this plan: new product surfaces not named in the assessment, a
plugin/extension system, mobile-first redesign, browser-engine work, and any
cloud dependency (local-first is a core constraint).

## Orchestration & Quality Model

This is the operating model the executing lead must follow. It is the point of
the plan as much as the slices are.

### Roles

- **Lead orchestrator (single, persistent).** Owns decomposition, sequencing,
  integration, the First-Class Bar, accept/reject decisions, validation,
  screenshots, plan/handoff updates, commits, and pushes. The lead never
  delegates the accept/reject decision.
- **Explorer subagents (read-only).** Map current state before each slice:
  data model, IPC surface, stores, component structure, and risk. They produce
  a written current-state map + risk register; they do not edit code.
- **Worker subagents (implementers).** Build a single disjoint slice. Used only
  where files do not overlap a concurrently active slice. Workers that mutate
  files in parallel run in isolated worktrees to avoid conflicts.
- **QA/Design reviewer subagents (adversarial).** Run after screenshots exist.
  Their explicit instruction is to find reasons the slice does **not** meet the
  bar — hierarchy, density, color/state clarity, scale behavior, accessibility,
  regressions. They default to "not yet first-class" when uncertain.
- **Verifier subagents (optional, for risky claims).** For data-model/IPC
  changes, an independent subagent attempts to reproduce or refute the claim
  that behavior is preserved (e.g. "existing layouts still load").

### Task monitoring

- The lead tracks every slice and every spawned subagent in the **Outcome Log**
  status table below (one row per slice: state, subagent, screenshots, QA
  verdict, iteration count). The table is refreshed on every state change so a
  fresh agent can resume mid-plan.
- The lead monitors background subagents to completion and reads each returned
  result in full before acting; it does not proceed on a slice whose explorer or
  QA subagent has not reported back.
- A slice is never marked done on "code compiles." It is done only when its
  Definition of Done (below) is fully satisfied.

### The First-Class Bar (acceptance rubric)

A slice clears the bar only when **all** of the following hold:

1. **Correct & complete** — the slice's acceptance criteria are all met; no
   stubbed or half-wired behavior.
2. **Scales** — the changed surface is demonstrated with a *large* dataset
   (see Test Plan: seeded heavy state), not just the empty/few-item case.
3. **Hierarchy & density** — primary content leads; chrome earns its space; the
   change does not regress the gains from plans 66/67.
4. **Color is semantic** — accent only for primary/active/focus; semantic colors
   for real state; the new AI color used consistently; no decorative regressions.
5. **Accessible** — keyboard reachable, `aria-label`/roles correct, visible
   focus, no icon-only control without an accessible name.
6. **No regressions** — typecheck, build, and Svelte autofixer clean; existing
   persisted state (layouts, workspaces, documents) still loads.
7. **Proven** — required before/after screenshots exist and a QA/Design
   subagent has signed off with zero blocking findings.

### Iteration protocol (do not accept poor quality)

For each slice: implement → validate (typecheck/build/autofixer) → capture
screenshots → adversarial QA review → **accept or reject**.

- If QA returns any **blocking** finding, the slice is rejected. The lead
  re-scopes or re-implements and repeats the loop. Poor-quality worker output is
  discarded, not patched into acceptance.
- Iterate until zero blocking findings. There is no fixed iteration cap; if a
  slice has not converged after **3 full QA cycles**, the lead stops, records the
  blockers in the Outcome Log, and escalates to Carlo via `AskUserQuestion`
  rather than lowering the bar.
- Non-blocking (polish) findings are logged; the lead fixes them in-slice when
  cheap, or records them as an explicit deferral with rationale.

### Contract-change protocol (hard gate)

Slices 3 and 4 are expected to need SQLite schema, IPC, and possibly
`ModuleContext`/`LayoutState` changes — which the architecture commitments treat
as significant. Before writing any such change:

1. The slice's explorer must document the exact delta (schema fields, IPC
   channels, contract additions) and a migration/back-compat story.
2. The lead pauses and confirms the delta with Carlo via `AskUserQuestion`,
   summarizing the change and its blast radius.
3. Only after sign-off does implementation proceed. If sign-off is withheld, the
   slice ships the largest renderer-only subset that is still coherent, and the
   data-model portion is deferred with evidence.

## Implementation Slices

### Slice 0 - Discovery & Foundations (gate)

Goal: produce the shared current-state map and risk register that every later
slice depends on, and surface contract-change decisions early.

Approach: fan out explorer subagents over (a) the search backend and how it is
queried (`CommandPalette.svelte`, `window.shell.search`, main-process search),
(b) the entity stores and their persistence (`store/ai.ts`, module `state.ts`
files, SQLite access), (c) the AI run/model/context plumbing across all four AI
surfaces, (d) the design-token consumers for the color work. Consolidate into
one map + a risk register + a list of required contract changes for Slices 3/4.

Files / areas: read-only across `app-shell/src/`.

Risks & unknowns: search may be document-only at the data layer; entity stores
may be in-memory arrays without queryable persistence; resolving these scopes
Slices 1 and 4.

Subagent roles: explorers only; lead consolidates. No code changes.

Required screenshots: none (no UI change).

Validation: map reviewed by lead; contract-change deltas drafted; gate passed
before Slice 1.

Definition of Done: current-state map + risk register committed into this plan's
Outcome Log; any Slice 3/4 contract deltas drafted and queued for the
contract-change gate.

### Slice 1 - Universal "Go to Anything" (P0)

Goal: one fast palette that finds and jumps to **any** entity — document, chat,
prompt, prompt chain, asset, bookmark, journal entry — with recents on empty
query and no silent result cap.

Anchor: assessment §2, item 1; `CommandPalette.svelte:61` (current 20-cap,
document-only).

Approach: extend the search/index path to cover all entity types (or aggregate
per-module providers); rank results, group by type, surface recents when the
query is empty; replace the hard 20-result cap with paged/▸"show more" results
and a visible count; wire selection to navigate to the entity in its module.

Files / areas: `CommandPalette.svelte`, `store/commands.ts`, the main-process
search surface, and a small per-module "searchable entities" contribution if the
contract gate allows it.

Risks & unknowns: indexing non-document entities may need an IPC/search-backend
change (contract gate). If withheld, ship renderer-side aggregation over loaded
stores as the coherent subset.

Subagent roles: worker candidate (isolated to palette + search); QA reviews
scanability and scale (500+ mixed entities).

Required screenshots (heavy seeded state): `uiux-fc-goto-empty-recents-after-<date>.png`,
`uiux-fc-goto-mixed-results-after-<date>.png`, `uiux-fc-goto-before-<date>.png`
(current palette for the diff).

Validation: autofixer, typecheck, build, `git diff --check`; demonstrated with
500+ mixed entities.

Acceptance criteria: can jump to every entity type; recents on empty query; no
undisclosed cap; keyboard-only operable; selected row obvious.

Out of scope: fuzzy-ranking algorithm research, saved searches.

### Slice 2 - Inline Search/Filter In Every NavView (P0)

Goal: every module sidebar list (chats, prompts, chains, assets, journal,
bookmarks) gains inline text filter; lists that lack sort gain a basic sort.

Anchor: assessment §2, item 3.

Approach: a shared, accessible filter-input pattern reused across NavViews;
filter against title/metadata; preserve archive sections; empty-filter and
no-match states use the copy conventions from plans 66/67.

Files / areas: `modules/*/NavView.svelte`; one shared filter component/helper if
it removes real duplication.

Risks & unknowns: list lengths large enough to need virtualization (assessment
notes none exists); if a list renders thousands of nodes, add windowing or log
the deferral explicitly.

Subagent roles: worker candidates per module (disjoint files), QA reviews
consistency across modules and scale behavior.

Required screenshots: per representative module, before/after at heavy seeded
state, e.g. `uiux-fc-navsearch-aichat-after-<date>.png`,
`uiux-fc-navsearch-promptstudio-after-<date>.png`,
`uiux-fc-navsearch-workflow-after-<date>.png` (+ before pairs).

Validation: autofixer, typecheck, build, `git diff --check`.

Acceptance criteria: filter present and consistent in every listed NavView;
keyboard reachable; archive interaction preserved; performant at scale.

Out of scope: multi-facet filtering (covered by Slice 4 tags).

### Slice 3 - AI Mental-Model Unification (P0)

Goal: collapse four overlapping AI surfaces into one coherent model. Make
model/temperature a property of the run/prompt (not leaky global state); unify
"what the model sees" into one reviewable context tray; unify run history into
one cross-module log; clarify or fold "chains"; make document proposals the
universal apply surface for any prompt.

Anchor: assessment §3; `store/ai.ts` (global model state), the four AI surfaces.

Approach (subject to the contract gate): (1) decouple per-run model/temp from
global defaults so selecting in one surface no longer mutates another; (2) a
single context-tray component shared by chat, prompt studio, workflow, and
document AI; (3) a unified run-history store/view filterable by source; (4)
resolve chains — give them a genuine multi-step definition or fold them into
prompts; (5) allow any prompt (including custom) to run as a document proposal.

Files / areas: `store/ai.ts`, `shell/AiContextPicker.svelte`,
`shell/AiModelPresetPicker.svelte`, `shell/RunHistoryList.svelte`, and the
`aichat` / `promptstudio` / `workflow` / `documents` AI views; likely SQLite +
IPC for run/model persistence.

Risks & unknowns: largest slice; high blast radius. May warrant being split into
its own sub-plan (68a) after Slice 0 reveals the plumbing. The contract gate
applies before any schema/IPC change.

Subagent roles: lead-owned integration; explorer maps the plumbing first; a
verifier subagent confirms existing runs/conversations still load after changes;
QA reviews the unified mental model against the assessment's friction list.

Required screenshots: `uiux-fc-ai-context-tray-after-<date>.png`,
`uiux-fc-ai-run-history-unified-after-<date>.png`,
`uiux-fc-ai-proposal-any-prompt-after-<date>.png`, plus before pairs of the
fragmented surfaces.

Validation: autofixer, typecheck, build, `git diff --check`; verifier confirms
back-compat; QA confirms a novelist can answer "which tool do I use?" without
ambiguity.

Acceptance criteria: changing model in one surface does not silently change
another; one context tray; one run-history view; chains resolved; custom prompts
runnable as proposals.

Out of scope: new model providers, autonomous multi-agent writing features.

### Slice 4 - Organizing Layer: Pins / Tags / Recents (P1)

Goal: a shared organizing primitive (pin, multi-tag, recents) in the data model,
surfaced consistently across all entity lists and feeding Slice 1 ranking.

Anchor: assessment §2, item 2.

Approach (contract gate applies): add pin/tag/last-accessed to the entity data
model with migration; expose through stores; render a consistent
pinned/recent/tagged affordance in lists and the universal palette.

Files / areas: SQLite schema + IPC, entity stores, NavViews, palette.

Risks & unknowns: schema migration and back-compat; this is the most invasive
data change. Gate required.

Subagent roles: explorer drafts schema/migration; verifier tests migration on
existing data; workers wire the UI; QA reviews consistency.

Required screenshots: `uiux-fc-pins-tags-aichat-after-<date>.png`,
`uiux-fc-pins-tags-promptstudio-after-<date>.png`, palette-with-pins shot.

Validation: autofixer, typecheck, build, `git diff --check`; migration verified
on a pre-existing workspace.

Acceptance criteria: pin/tag/recents available and consistent across lists;
existing data migrates cleanly; palette uses pins/recents in ranking.

Out of scope: nested folders, smart/saved tag queries.

### Slice 5 - Color Discipline (P1)

Goal: retire per-zone decorative hues from structural chrome; one brand accent
for primary/active/focus, semantic success/warn/danger for real state, and one
dedicated AI color so model-generated content/proposals/jobs are instantly
legible. Jewel palette demoted to an opt-in decorative theme.

Anchor: assessment §1; `tokens.css:45-58` (zone accents), `218-221` (gray-theme
collapse — the evidence the hues carry no meaning).

Approach: introduce `--color-ai` (and dim variant) per theme; repoint zone-accent
consumers to the single brand accent; reserve semantic tokens; keep party mode;
preserve all four themes. Token-level change with consumer sweep — no new theme
architecture.

Files / areas: `styles/tokens.css`, accent consumers across shell + modules.

Risks & unknowns: wide but shallow sweep; must verify all four themes and
light-mode contrast (assessment notes accents wash out in light mode).

Subagent roles: worker sweeps consumers; QA reviews all four themes for state
clarity and contrast; lead owns token changes.

Required screenshots: each theme before/after on a representative screen, plus an
AI-content shot showing the new AI color, e.g.
`uiux-fc-color-dark-after-<date>.png`, `uiux-fc-color-light-after-<date>.png`,
`uiux-fc-color-ai-signal-after-<date>.png` (+ before pairs).

Validation: autofixer, typecheck, build, `git diff --check`; manual all-theme
contrast check.

Acceptance criteria: accent only for primary/active/focus; AI color consistent;
contrast holds in all themes; party mode intact.

Out of scope: full token-system rewrite, new palettes beyond the AI color.

### Slice 6 - Clutter Pass (P2)

Goal: remove the redundancy and chrome weight the assessment flagged.

Anchor: assessment §4.

Approach: consolidate the duplicated Jobs UI (`ContextStrip` badge vs.
`StatusBar` item) to one location; collapse Documents/Journal's stacked headers
toward a single header with formatting in the existing bubble toolbar; convert
flagged text buttons to icon buttons with tooltips (Journal `H1 H2 B I UL 1.`,
Assets `Copy Path`/`Open in Finder`/`Export`/`Archive`/`Remove`); keep words on
ambiguous/destructive actions; reclaim editor width.

Files / areas: `ContextStrip.svelte`, `StatusBar.svelte`,
`modules/journal/MainView.svelte`, `modules/documents/MainView.svelte`,
`modules/assets/MainView.svelte`, `MarkdownBubbleToolbar.svelte`.

Risks & unknowns: icon legibility — every icon button needs an accessible name
and tooltip; verify no action becomes undiscoverable.

Subagent roles: worker candidates per area; QA reviews discoverability and
chrome-to-content ratio.

Required screenshots: `uiux-fc-jobs-single-after-<date>.png`,
`uiux-fc-editor-chrome-after-<date>.png`, `uiux-fc-assets-icons-after-<date>.png`
(+ before pairs).

Validation: autofixer, typecheck, build, `git diff --check`.

Acceptance criteria: Jobs status in one place; reduced editor chrome; flagged
buttons icon-ified with accessible names; no lost discoverability.

Out of scope: new icon library; a focus/zen-mode redesign beyond width reclaim.

## Bloat Guardrails

- Data-model/IPC/contract changes are allowed **only** through the
  contract-change gate, with migration and back-compat documented.
- Prefer existing components and tokens; add a new shared component/helper only
  when it removes real duplication (e.g. the Slice 2 filter, Slice 3 context tray).
- Keep color semantic; the only new color concept is `--color-ai`.
- No new dependencies, decorative palettes, permanent panels, or speculative
  hooks. After each slice, list every new file/export/type and remove anything
  the slice does not exercise.

## Test Plan

Per slice, from `app-shell/`: `npm run typecheck`, `npm run build`; from repo
root `git diff --check`; Svelte autofixer on every touched `.svelte` file until
clean.

**Heavy seeded state is mandatory** for Slices 1, 2, 4 (and useful for 3): drive
the capture against a workspace seeded with many projects, documents, chats,
prompts, and chains so screenshots prove scale behavior, not the empty case. Use
the documented `SHELL_CAPTURE` hook and existing evidence env controls
(`SHELL_CAPTURE_MODULE`, `SHELL_CAPTURE_DOCUMENT`, `SHELL_CAPTURE_AI_PROMPT`,
viewport/jobs/palette/sidebar/inspector controls added in prior passes). Add a
capture-hook control only when a required proof state cannot be reached with the
existing hooks, mirroring how plans 66/67 extended `capture/evidence.ts`.

Capture before/after pairs for every UI-altering slice and store them under
`workspace-agents/implementation/screenshots/` with the `uiux-fc-*` prefix.

## Closeout Checklist

- Slice 0 map + risk register recorded; contract deltas sized.
- Each slice: explorer reviewed → implemented → autofixer/typecheck/build/diff
  clean → required before/after screenshots captured at heavy state → adversarial
  QA sign-off with zero blocking findings → Outcome Log row updated.
- Contract-change gate cleared with Carlo before any schema/IPC/contract edit.
- Plan 68 Outcome Log filled with per-slice outcome, evidence paths, validation,
  QA verdicts, iteration counts, and deferrals.
- New `HANDOFF_NN.md` summarizing completed slices, evidence, and next steps.
- Commit per verified slice; push to the working branch; open/refresh the PR;
  confirm clean tree with `git status --short --branch`.

## Assumptions

- Plan number `68` follows `67` as the highest existing plan.
- Screenshot date suffix is the capture date in `YYYY-MM-DD`.
- Slice 3 may be promoted to its own sub-plan (`68a`) if Slice 0 shows the AI
  plumbing is too large for one slice; this plan stays the parent index.
- "First-class" is defined by the rubric above, judged by adversarial QA, not by
  the implementer's self-assessment.

## Outcome Log

### Status table

| Slice | State | Subagent(s) | Screenshots | QA verdict | Iterations |
|---|---|---|---|---|---|
| 0 Discovery | **done** | 4 explorers (search, stores, AI, tokens) | n/a | n/a | 1 |
| 1 Go-to-anything | code complete; **screenshots blocked by env** | worker + adversarial QA | pending (app can't launch here) | QA pass after 1 fix round | 1 |
| 2 NavView search | ready (no gate) | — | — | — | 0 |
| 3 AI unification | ready (renderer-only path) | — | — | — | 0 |
| 4 Organizing layer | awaiting contract gate | — | — | — | 0 |
| 5 Color discipline | ready (renderer-only) | — | — | — | 0 |
| 6 Clutter pass | ready (renderer-only) | — | — | — | 0 |

Baseline before any edit: `npm run typecheck` ✓ and `npm run build` ✓ (clean).

### Slice 0 — Current-state map (2026-06-26)

**Search.** Documents-only SQLite FTS5 (`documents_fts` over title+content) via
`search:query` → `src/main/core/search.ts`; renderer caps at 20
(`CommandPalette.svelte:61`); `SearchResult` is defined in
`src/shared/module-contract.ts` (extending it is a **contract change**). Chats,
prompt templates, prompt chains, and assets live in SQLite but are **not
indexed**; bookmarks and journal are settings-backed (not in SQLite); journal's
`journal-entry` is only a registered document-kind, so journal entries are
**not** FTS-searchable today (corrects an explorer assumption).

**Entity persistence.**
- SQLite: documents, `ai_conversations`, `ai_prompt_templates` (has `tagsJson`),
  assets (has `asset_tags` join table). An `ai_prompt_chains` table exists but is
  unused.
- Settings-backed JSON: workflow profiles (`modules.workflow.{ws}.state`),
  journal (`modules.journal.{ws}.state`, has `tags[]`), web bookmarks
  (`modules.web.{ws}.state`).

**AI plumbing.** Global `selectedAiProviderId/Model/Temperature` (`store/ai.ts:35-37`)
are read AND written by all four surfaces — the leak is real and confirmed
(`useRunSettings` and template-load mutate global). Runs persist in `ai_runs`
(SQLite) with `moduleId`/`originType`; `loadAiRuns(moduleId?)` already accepts an
optional module filter and `aiRuns.set()` overwrites per call. Context is
**already** a single shared store + `AiContextPicker`; the documents
editor-selection capture is merged with it server-side in `buildAiPayload`.
Output destinations differ by surface (AI Outputs folder vs. job queue vs.
in-place proposal). Document proposals are limited to 3 protected built-in
templates; nothing structural blocks an arbitrary prompt becoming a proposal
(`sourceText` is already effectively optional). Workflow "chains" are a single
prompt run as an `ai.chain.run` job — not multi-step.

### Slice 0 — Risk register

- **R1 (Slice 1):** universal search forks on architecture — backend FTS (scales,
  snippets, but touches `module-contract.ts` + schema) vs. renderer-side over
  loaded stores (no backend change, but no snippets and won't scale to
  thousands). Contract-gate decision required.
- **R2 (Slice 4):** organizing layer needs an `entity_pins` table +
  `lastAccessedAt` columns + new IPC, and migrating workflow chains from settings
  to the unused `ai_prompt_chains` table. Most invasive change; migration +
  back-compat required. Contract-gate decision required (P1 — defer the decision
  until Slices 1–3 land).
- **R3 (Slice 3):** large surface but the leaky-state fix, unified context,
  run-history filter, and arbitrary-prompt-as-proposal are all achievable
  **renderer-only** with low/no back-compat risk; `ai_runs` already carries the
  data a unified history needs. Proceed renderer-only; escalate only if a schema
  change becomes necessary.
- **R4 (Slice 2):** some lists could be large; if a NavView renders thousands of
  nodes, add windowing or log the deferral (no virtualization exists today).
- **R5 (Slice 5):** light/system themes never override the zone accents, so they
  inherit dark-theme jewel values — a pre-existing bug to fix during the color
  pass; ~98 accent usages across ~17 files; party mode is the only jewel
  consumer and must be preserved.

### Slice 1 — Outcome (2026-06-26)

Backend FTS implemented (chosen at the contract gate): FTS5 tables + sync
triggers + idempotent backfill for AI conversations, prompt templates, and
assets, alongside the existing `documents_fts`; `search.ts` UNIONs all four with
a non-FTS `recents()` empty-query fallback; `SearchResult` (module contract)
extended with `entityType`/`entityId`/`moduleId`; palette routes selection to the
right module+entity, shows entity-type badges and a visible result count, and the
20-result cap is gone (limit 50). Adversarial QA fixed one blocking bug (asset
row duplication → `EXISTS` subquery) and hardened snippet rendering (STX/ETX
sentinels + HTML-escape before `<mark>`). Static gates: `npm run typecheck` and
`npm run build` clean. Commits: `ad7a8b4` (impl), `5f51659` (QA fixes).

**Blocked on environment for screenshot/runtime proof.** The First-Class Bar
requires screenshot evidence, but the Electron app cannot launch in this remote
sandbox: the native `better-sqlite3` module cannot be built (network policy
blocks `nodejs.org` headers and GitHub release-asset prebuilds, both 403), so no
`SHELL_CAPTURE` run and no runtime SQL execution are possible here. Prior
screenshots were macOS captures, i.e. produced on a machine that can build the
app. Verification achieved here is limited to static gates + adversarial code
review. Awaiting a decision on how to satisfy the screenshot requirement (capture
locally, loosen the env network policy, or accept code-review-only for this
environment). Same constraint applies to every UI-visible slice that follows.

### Slice 0 — Contract-change deltas (for the gate)

- **Slice 1, Option A (recommended):** add FTS tables for conversations,
  templates, chains, assets; extend `SearchResult` (`module-contract.ts`) with
  `entityType`/`entityId`/`moduleId`; UNION in `search.ts`; route by type in the
  palette. **Slice 1, Option B:** renderer-side aggregation over loaded stores;
  no backend/contract change; ship now, weaker at scale.
- **Slice 4:** `entity_pins(workspaceId, entityType, entityId, pinnedAt, order)` +
  `lastAccessedAt` columns on documents/conversations/templates/assets + IPC
  `entities:{pin,unpin,listPinned,recordAccess}` + chains→SQLite migration.
