# App Shell — UI/UX Product Assessment (2026-06)

## Scope

A product-level UI/UX assessment of the App Shell renderer, framed around the
qualities requested for a novel-authoring tool with AI integration: effective
use of color, UI clutter and redundancy, a smooth and accessible workflow, icon
vs. word buttons, and — critically — how the product feels once a power user has
**dozens of projects and many chats, prompts, and prompt chains**.

This is a strategic assessment, not a slice plan. It complements the tactical
work already shipped in:

- `workspace-agents/implementation/ui-ux-audit-2026-06-26/APP_SHELL_UI_UX_REVIEW.md`
- `workspace-agents/implementation/plans/66-ui-ux-audit-resolution.md`
- `workspace-agents/implementation/plans/67-ui-ux-next-pass.md`

Evidence is drawn from the renderer source under
`app-shell/src/renderer/src/` and the design tokens in
`app-shell/src/renderer/src/styles/tokens.css`.

## Verdict

The bones are good. The shell/module architecture, the token system,
accessibility, and the two recent density passes are solid craft. But the
product is currently designed for **one project with a modest number of things
in it**. The stated future — dozens of projects, hundreds of documents, many
chats, prompts, and chains — breaks it in three predictable ways:

1. A **flat-list information architecture** that does not survive scale.
2. **Four overlapping AI tools** where a novelist wants one mental model.
3. A **color strategy that spends its whole budget on decoration** rather than
   meaning.

Fix them in that order.

## What's Working — Protect It

- **Architecture and tokens.** Clean "shell owns primitives" model; a real
  theme-invariant + per-theme token system (4 palettes) in `tokens.css`.
- **Accessibility and state.** Icon buttons carry `aria-label`s and tooltips;
  active states toggle icon weight (e.g. `ActivityRail.svelte`).
- **Good instincts already shipped.** Drag-to-reorder rail, collapsible
  inspector sections, a consistent archive pattern, and the hierarchy/density
  cleanup from plans 66 and 67.

Do not reopen the work those passes completed except on regression.

## 1. Color — Spend It On Meaning, Not On Zones

The "jewel palette" assigns a different accent hue per zone: emerald nav,
sapphire editor, amethyst inspector, citrine status (`tokens.css:55-58`).
It is tasteful today because it is applied at 7–30% opacity via `color-mix()`.
Strategically, it is backwards:

- **The user already knows which panel they are in** from position and layout.
  Coloring zones by hue spends the scarcest visual resource — a saturated
  accent — on information the user does not need.
- **The tell:** the gray theme collapses all four accents to a single blue
  (`tokens.css:218-221`) and loses nothing functional. If removing the
  color-coding costs no meaning, the color-coding was not carrying meaning.
- **It does not scale.** As modules and AI features multiply, per-zone hues
  become rainbow creep. When everything is gently tinted, nothing can stand
  out, and there is no headroom left for the elements that should.

**Recommendation.** Collapse to **one brand accent** for primary
action/active/focus, reserve **success/warn/danger** for genuine state, and add
**one dedicated "AI" color** so AI-generated content, proposals, and running
jobs are instantly distinguishable from human-authored text. For a writing
tool, "this came from the model" is the semantic distinction worth a color.
Keep the jewel palette (and party mode) as an opt-in decorative theme; get it
out of the structural chrome.

## 2. Scale Is The Existential Issue

The information architecture is **flat lists nearly everywhere**.

| Surface | Organizing primitive today | Breaks around |
|---|---|---|
| Projects (`WorkspaceSwitcher`) | flat menu, no search | ~30 |
| AI chats (`aichat/NavView`) | flat list + archive | ~20 |
| Prompts (`promptstudio/NavView`) | single-value tag filter, no text search | ~50 |
| Prompt chains (`workflow/NavView`) | flat list, nothing else | ~10 |
| Assets / bookmarks | flat list | ~30–50 |
| Documents (`documents/NavView`) | tree + sort + search (the good one) | ~200 (search caps out) |

Three compounding weak points:

1. **There is no "go to anything."** The Command Palette searches commands, but
   content search is document-only and hard-capped at 20 results
   (`CommandPalette.svelte:61`) with no count and no "show more." It cannot jump
   to a chat, prompt, chain, or asset. A fast universal find/jump is the
   single highest-leverage feature available — it makes flat lists survivable
   even before they are fixed.
2. **No lightweight organizing layer.** No favorites, pins, recents, multi-tag,
   or folders outside Documents. This is flat at the **data layer** (chats,
   prompts, chains are plain arrays), so it is a model change, not just CSS.
3. **Most sidebars have no search at all** (chats, workflows, assets, journal).
   Archive is the only secondary axis, and it is binary.

Also note: `ActivityRail.svelte:28-37` hardcodes 8 modules with no overflow
handling. Fine now, but it is a wall if third-party modules ever enter the
product. Decide whether plugins are in the future before that list grows.

**Recommendation, in order.** (a) A real universal palette/search — every entity
type indexed, ranked, with recents on empty query; (b) inline filter/search in
every NavView (cheap, high return); (c) a shared pin + tag primitive in the data
model that every list reads.

## 3. The AI Story Is Four Tools Where Users Want One

A novelist who wants to rewrite a paragraph has three valid paths today (Chat,
Prompt Studio, the document "Rewrite" button) and a fourth tool (Workflow
"chains") whose purpose is unexplained. They overlap badly:

- **Model selection is split and leaky.** Prompt Studio uses presets
  (Drafting/Revision/Analysis); Chat and Workflow use manual provider/model/temp
  — but both write the **same global state** (`store/ai.ts`). Picking "Revision"
  in Prompt Studio silently changes what Chat does next.
- **"Where did my output go?" has three answers:** Chat/Prompt auto-save to an
  "AI Outputs" folder, Workflow queues a job, Documents create an in-place
  proposal.
- **Context attaches three different ways** (the context picker, the editor
  selection, workflow checkboxes) with no unified view of what the model sees.
- **"Chain" is a misnomer** — it shows a single prompt and runs an async job
  with cryptic options ("Create proposal" on what document?). Run history is
  per-module, so there is no single view of AI activity.

**Recommendation.** Pick one spine: **prompts are the reusable unit** (the
library); **chat is open-ended exploration**; **document proposals are the
universal apply surface** (any prompt — including custom ones — runnable on a
selection, instead of three canned actions). Make model/temperature a property
of the prompt or the run, not hidden global state. Unify context into one
reviewable tray and run history into one cross-module log. Then either give
chains a real multi-step reason to exist or fold them into prompts. The goal: a
novelist should never have to ask "which AI tool do I use for this?"

## 4. Clutter And Redundancy — Make The Page The Hero

- **Jobs status appears twice** — a badge in `ContextStrip` and a clickable item
  in `StatusBar` — same information, competing for the same glance. Keep one.
- **Double headers stack** in Documents/Journal (title header + formatting
  toolbar ≈ 80px); total chrome runs ~18–20% of the editor viewport. For a tool
  whose hero is prose, push harder: collapse to a single header, move formatting
  into the existing selection bubble toolbar, and consider a true
  distraction-free width.
- **Icon vs. word buttons.** The stated principle ("no word button if an icon
  suffices") is violated in Journal's `H1 H2 B I UL 1.` text buttons and the
  Assets action row (`Copy Path`, `Open in Finder`, `Export`, `Archive`,
  `Remove`). Convert these to icon buttons with tooltips. Conversely, keep words
  on ambiguous or destructive actions ("Run Chain", "Remove Record"). Icons win
  for frequent, learnable actions; words win for rare or dangerous ones.

## 5. Smooth UX / Workflow Clarity

The friction is consistency and predictability, not missing features: global
state that mutates behind the user's back (§3), output landing in three
different places, the most-integrated AI flow (document proposals) being the
least discoverable, and no unified sense of what the model is doing now or just
did. Fixing §3 resolves most of this. The smaller win: a consistent "what
happened" surface (unified run history + a clear output destination) so the app
never feels like it swallowed the user's work.

## Prioritized Roadmap

- **P0 — Scale spine.** Universal "go to anything" search/palette (all entity
  types, recents, no silent 20-cap); inline search in every NavView.
- **P0 — AI coherence.** One mental model; model/temp as a run/prompt property,
  not leaky global state; unified output destination + run history.
- **P1 — Color discipline.** Single accent + semantic colors + one "AI" color;
  demote jewel hues to an optional theme.
- **P1 — Organizing layer.** Pins/tags/recents in the data model, surfaced
  consistently across lists.
- **P2 — Clutter pass.** De-dupe Jobs UI; single editor header + bubble-only
  formatting; icon-ify the flagged button clusters; reclaim canvas width.

## Method

Findings are grounded in direct reads of the renderer source and design tokens,
plus three focused code explorations covering (1) navigation, information
architecture, and scale; (2) control patterns, color application, and
redundancy; and (3) the coherence of the AI integration across modules. File and
line references above point to the current renderer tree under
`app-shell/src/renderer/src/`.
