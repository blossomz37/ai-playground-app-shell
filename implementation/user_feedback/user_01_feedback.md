# UI Design Punch-List

**USER_01:**

_Review date: 2026-06-04 · Build: App Shell v0.1.0 · Scope: AI Chat + Documents (dark/light, inspector on/off)_

**Severity key:** `P0` ship-blocker / credibility · `P1` high-friction · `P2` polish · `P3` nice-to-have
**Effort key:** `S` small · `M` medium · `L` large

---

## P0 — Redundancy cascade in the header

| # | Severity | Effort | Location | Issue | Fix |
|---|----------|--------|----------|-------|-----|
| 1 | P0 | S | Top-left floating pill | "My Workspace · authoring" renders twice, stacked within ~50px (bordered pill + tab row). The pill is the heaviest bordered element on screen yet the most redundant. | Remove the pill **or** the tab-row label. Keep one workspace identifier. |
| 2 | P0 | M | Header + status bar | Doc title "Chapter 1 — The Arrival" appears 4× (H1 band, breadcrumb, inspector TITLE, status bar). | One title in the H1 band, one in the inspector. Drop from breadcrumb + status bar. |
| 3 | P0 | S | Breadcrumb + inspector + status bar | Word count "104" appears 3×. | Single source of truth: status bar only. Remove from breadcrumb; keep inspector WORDS only if inspector is the "facts" panel. |
| 4 | P0 | S | Breadcrumb + status bar | Save status appears 2× ("saved" / "✓ saved"). | Status bar owns save state. Remove from breadcrumb. |
| 5 | P0 | S | Header breadcrumb vs status bar | Breadcrumb and status bar print the identical `title · words · saved` string. | One of them is decoration — delete the duplication. Breadcrumb = navigation; status bar = document state. |

---

## P0 — Dev language leaking into shipping UI

| # | Severity | Effort | Location | Issue | Fix |
|---|----------|--------|----------|-------|-----|
| 6 | P0 | S | AI Chat header | "No active object" — *object* is engineer-speak. | "No document open" or hide entirely. |
| 7 | P0 | S | Status bar (bottom-right) | "App Shell v0.1.0" — framework scaffolding term. | Use product name + version, or move to About/Settings. |
| 8 | P0 | S | AI Chat avatar | Raw OS emoji 🤖 as assistant avatar — renders inconsistently across platforms, clashes with the serif aesthetic. | Ship a designed avatar glyph (matches Prism Nib / jewel-tone language). |

---

## P1 — Breadcrumb architecture

| # | Severity | Effort | Location | Issue | Fix |
|---|----------|--------|----------|-------|-----|
| 9 | P1 | M | Header breadcrumb | Centered + floating; breadcrumbs belong top-left where the eye hunts for location. | Left-align to the content's optical left edge. |
| 10 | P1 | M | Breadcrumb (inspector open) | Collapses to `M... / Chap...` — a 2-level breadcrumb truncated to single letters. Navigation is the first thing sacrificed. | Never truncate nav below readable. Truncate the longest segment last; protect hierarchy. |
| 11 | P1 | S | Breadcrumb | Mixes navigation (`Manuscript / Chapter 1`) with metadata (`chapter · 104 words · saved`) at identical weight/color/size. | Visually separate the two categories or move metadata out (see #2–5). |

---

## P1 — Contrast & legibility (dark mode)

| # | Severity | Effort | Location | Issue | Fix |
|---|----------|--------|----------|-------|-----|
| 12 | P1 | S | Left rail | Inactive icons are gray-on-near-black, near-invisible. Only the active green pen reads. | Raise inactive icon contrast to a comfortable hours-of-use level; add clear hover state. |
| 13 | P1 | S | Top-right toolbar | `SAVE` / `JOBS` dimmed to the point of reading as dead/disabled. | Give idle, disabled, and active distinct treatments. Don't let "saved" look like "dead." |
| 14 | P1 | S | Top-right toolbar | Bare `⌘` glyph + eye + fullscreen icons unlabeled, no visible tooltips. | Add tooltips at minimum; label the command palette trigger. |

---

## P1 — Duplicate / ambiguous entry points

| # | Severity | Effort | Location | Issue | Fix |
|---|----------|--------|----------|-------|-----|
| 15 | P1 | S | Rail bottom-left + toolbar top-right | Two settings gears, no clear distinction. | Consolidate, or differentiate (e.g., app settings vs. document settings) with labels. |
| 16 | P1 | S | "authoring" label | Appears 3× (pill, tab row, status bar) and never explains its meaning. | Show once; clarify what the mode communicates, or drop it. |

---

## P2 — Spacing & alignment

| # | Severity | Effort | Location | Issue | Fix |
|---|----------|--------|----------|-------|-----|
| 17 | P2 | M | Title band vs content column | Sticky title sits at one left edge; H1 + body sit further right. Two competing left margins break vertical rhythm. | Align title band and content to one optical left. |
| 18 | P2 | M | Editor (inspector closed) | ~250px empty left gutter reads as lonely dead space, not intentional margin. | Recentre content with deliberate, symmetric margins when inspector closes. |
| 19 | P2 | S | Light-mode canvas | Grayish gradient smudge top-left reads as a render artifact, not a flourish. | Clip/commit the aurora gradient so it looks intentional in light mode. |
| 20 | P2 | S | AI Chat body | ~600px void between greeting and input. | Fill with suggested prompts / onboarding affordances. |

---

## P2 — Inconsistent treatment of like elements

| # | Severity | Effort | Location | Issue | Fix |
|---|----------|--------|----------|-------|-----|
| 21 | P2 | S | Inspector | KIND is a chip ("CHAPTER"); FORMAT is plain text ("markdown"). Both are enum metadata. | Treat both the same — chips or both plain. |
| 22 | P2 | M | Tables (dark vs light) | Heavily bordered/high-contrast in dark; faint/borderless in light. Same component, two personalities. | Unify table border + header weight across themes via shared tokens. |
| 23 | P2 | S | Global casing | No codified system: `SAVE`/`JOBS` caps, breadcrumb sentence-case, "Jobs Idle" title-case, section labels caps. | Define one casing scale (e.g., all-caps = section labels only) and enforce. |

---

## P3 — Polish

| # | Severity | Effort | Location | Issue | Fix |
|---|----------|--------|----------|-------|-----|
| 24 | P3 | S | Inspector | DOCUMENT ▾ / HISTORY ▾ collapsibles are over-engineering for a 6-row block. | Remove disclosure triangles; show flat. |
| 25 | P3 | S | Inspector (dark) | Almost no left divider — panel bleeds into editor, floats ambiguously. | Add a clearer boundary. |
| 26 | P3 | S | Manuscript panel | `⊞` icon unexplained (board view?). | Tooltip / label. |

---

## Top-ROI sequence

1. **Demolish header redundancy** (#1–5): one workspace label, one title, status in exactly one place.
2. **Fix the breadcrumb** (#9–11): left-align, never truncate to a letter, split nav from metadata.
3. **Raise dark-mode contrast** (#12–14): rail icons + SAVE/JOBS + tooltips.
4. **Purge dev language + emoji avatar** (#6–8).

These four alone move the feel from 0.1 to 1.0.



---

**ME:** 

For the "Top-left floating pill" issue. That was supposed to be the workspace/project selector, so it shows the name of the project that we are actively in. Perhaps that is not the correct place to put the selector? It obviously looks redundant because "My Workspace: Authoring" now appears in two places. What's your advice here? I don't know what an app designer would do.

---



**USER_01:**

Good instinct to question it — but the location isn't actually the problem. The redundancy is that the workspace name is being *rendered by two independent components*: the selector pill **and** the tab strip. A project selector living top-left is completely conventional (Linear, Notion, Slack, VS Code all anchor it there). The bug is that something downstream is echoing the name. So the fix isn't "move the selector," it's "make the selector the single component that's allowed to say the project's name."

Here's the mental model that untangles it. You have **three independent levels of "where am I,"** and right now levels 1 and 2 are fused:

1. **Workspace / project** — *which* book you're in (My Workspace, Dead Acre, False Start). Changes rarely.
2. **Module** — Documents vs. AI Chat vs. Images vs. Terminal. Your left rail already owns this.
3. **Document** — Chapter 1 — The Arrival. Your breadcrumb/title owns this.

Your tab strip is currently trying to show level 1 *and* level 2 in the same row ("My Workspace · authoring" sitting right next to "Documents"/"AI Chat"). That's the collision. The tab strip should be **module-only**. Strip the workspace label out of it, and the duplication vanishes — the top-left selector becomes the only place the name appears, which is exactly what you want.

So my actual recommendation, in order of how clean it is:

**Best — selector at the top of the left rail, name-on-demand (Slack/Linear pattern).** Put a single project tile at the very top of the icon rail: a small jewel-tone square or the project's initial. Click it → popover with the project name + a switcher list. The name lives in the popover, not permanently on the chrome. This dedupes completely, scales to fifty projects, and respects your thin rail. Downside: the name isn't always visible at a glance, which matters if you switch projects constantly.

**Good — keep it in the top-left bar, but make it canonical (Figma/VS Code pattern).** Your Electron frameless title strip is mostly a dead drag region anyway, so a project switcher there is legitimate. Keep the pill, give it a chevron so it reads as a switcher (right now it reads as a static label because it's bordered like an input), and delete the workspace label from the tab strip. Best choice if you want the project name permanently visible.

**Avoid — top of the secondary panel.** That panel is module-scoped (Conversations under AI Chat, Manuscript under Documents). A project selector there would visually appear to belong to "Conversations," which is a category error. Don't.

I'd go with the **second option** for you specifically — novelists juggling Dead Acre / False Start / Pemberley want the project name in their face, not hidden behind an icon. Keep the pill, add the chevron, kill the tab-strip echo.

One Electron-specific gotcha if you keep it in that top strip: that band is almost certainly `-webkit-app-region: drag` for window-dragging, which will *eat clicks* on the selector. The selector needs `-webkit-app-region: no-drag` explicitly, and on macOS it has to be offset right of ~78px so it clears the traffic-light buttons. Worth checking — a switcher that won't open because the drag region swallowed the click is a maddening bug to track down.

Want me to mock up the "keep the pill, add chevron, module-only tab strip" version as a quick visual so you can see the dedupe?

---

ME: Yes, please.

---

USER_01:

Here's the corrected top chrome — the dedupe made visible. The "before" strip up top shows the collision; the "after" shows the three nav levels each owning their own band, with the project name appearing exactly once.The moves that fix it:

- **The pill stays but gains a chevron** so it now *reads* as a switcher, not a static label. Click → project list. It's offset right of the traffic lights (your `no-drag` region inside the drag strip).
- **The tab strip lost the workspace echo.** It's purely module navigation now (Documents / AI Chat). That's the line that kills the duplication.
- **The breadcrumb is left-aligned and nav-only** — `Manuscript › Chapter 1`. Document metadata (`104 words · saved`) lives in exactly one spot, right-aligned on the same band. Pick either here or the status bar as its permanent home; I put it here and slimmed the status bar down to just `Jobs idle` to prove the point.
- **Toolbar contrast bumped** so Save and the icons don't read as dead.

The colored spines are just teaching aids for the three levels — they wouldn't ship. If you want, I can do a second pass showing the *full* window (rail + panel + editor + inspector) with these corrections applied, or spec the switcher's open/popover state.
