# Session Handoff — App Shell Project

_Last session: 2026-05-29 · Status: pre-implementation, foundational decisions resolved_

This is the "start here" note for the next session. Read it, then `CLAUDE.md` for the durable orientation. Everything below is recorded authoritatively in the spec files — this doc is the snapshot of *where we stopped and what to do next*.

---

## 1. What this project is (one line)
A reusable, extensible **desktop shell** (Obsidian/VS Code mental model) — a stable core of primitives that purpose-built modules fill. One repo is the standard shell; copy it as a template to make a new app. The first app built on it is a **local-first, AI-assisted authoring workbench**.

## 2. What happened this session
Started from three skeletal spec docs (ideation only). By end of session:
- Reviewed the background research (now in `archive/`), flagged that it conflated *scaffold-shell* with *platform-shell* (we want the latter).
- Built an **interactive decision questionnaire** (`archive/decision-questionnaire.html`) covering 11 foundational choices; Carlo filled it in (`archive/decision-answers.md`).
- Resolved all 11 decisions, including two that diverged from the form's defaults (see Gotchas).
- Ran a **prior-art teardown** of Obsidian + VS Code extensibility (`reference/obsidian-vscode-extensibility-teardown.md`).
- Did a **teardown of the reference app `draftwell`** to anchor the shell's zones and modules in something real (`reference/draftwell-anchor-analysis.md`).
- Locked all decisions into the spec files; cleaned up titles and stale sections.
- Restructured the workspace: `ideas/` → `reference/` (forward-looking only) + new `archive/` (spent decision-phase artifacts).

## 3. Committed decisions (the foundation — don't relitigate)
Full Q1–Q11 detail in `0-shell-platform-spec.md` §12. Summary:
- **Runtime:** Electron. **UI:** Svelte/SvelteKit.
- **Architecture rule:** core logic (persistence, AI, file handling) lives in framework-agnostic TS **outside the renderer** — Svelte is UI-only. This is what enables the future LAN/iPad client and keeps logic reusable.
- **Persistence:** **SQLite is the source of truth**; files are import provenance (`sourcePath`/`sourceChecksum`) + export targets. (This *supersedes* the questionnaire's initial files-as-truth lean — see Gotchas.)
- **Layout:** fixed named zones (activity rail, left sidebar, main pane, inspector, top bar, status bar); modules fill them, can't carve new ones.
- **Theming:** documented token API (color + spacing + border + font); light/dark/system + user themes later.
- **Modules:** bundled at build time; manifest carries permission declarations from day one (unenforced for now — single trusted author).
- **Platform:** macOS-first, nothing platform-specific in core.
- **Distribution:** GitHub releases, deferred.

## 4. The open decision the next session should resolve first
At session end I asked Carlo to choose between two next directions; **he pivoted to this handoff before answering**, so it's still open:

> **(A) Design the module contract** — the manifest + per-module contribution interface (rail entry, nav/main/inspector views, state slice, commands). This is the keystone: it's what turns draftwell's 2,470-line `App.tsx` monolith into a shell. Until it exists, "shell" is just a layout.
>
> **(B) Scaffold the repo first** — stand up Electron + Svelte + local API + SQLite as a thin vertical slice to prove the architecture, then design the contract against working code.

**My recommendation: (A)**, because the contract is the highest-leverage artifact and everything else (first module, zone APIs) follows from it. But (B) is defensible if Carlo prefers to validate the stack hands-on first. **Ask which he wants before diving in.**

## 5. Remaining design work (decisions done; these are design, not choice)
1. **Module contract** (see §4A) — the keystone.
2. **Shell-provided primitives draftwell lacks** — command palette, keybindings, right-click context menus. draftwell has *none* of these; the shell must supply them as primitives.
3. **Status bar zone** — net-new (draftwell only has an API health dot). Good home for word count, save state, job progress.
4. **Document schema** — start from draftwell's `documents` + `document_versions` tables (fields listed in `0-shell-platform-spec.md` §12 "Canonical document model").

## 6. Gotchas / non-obvious context
- **Svelte was chosen despite all of Carlo's existing apps being React.** It's a deliberate clean break — his React apps (draftwell, Fountain editor) are **design/feature references, not code to port**. Don't suggest reusing their React components.
- **Persistence flipped from the questionnaire default.** The form leaned files-as-truth; after seeing draftwell actually edits a SQLite copy, Carlo chose DB-as-truth + file provenance for executability. The spec was corrected in three places (§8, §12 Q6, `1-shell-spec.md` §3). If you see "files are the source of truth" anywhere, it's stale.
- **draftwell is the thesis, not just a reference.** Its monolithic `App.tsx` (~2,470 lines, ~40 state hooks, one ~100-prop `RoomSidePanel`) IS the problem the shell solves. Keep that framing.
- **Carlo's working style** (from global CLAUDE.md): explain before doing; keep it simple; avoid decision overwhelm; offer options on creative calls rather than deciding unilaterally; confirm destructive actions. He moves fast and values artifacts that save re-research.
- **Reference app location:** `/Users/carlo/Github/draftwell-app` (pnpm monorepo — `apps/web` React UI, `apps/api` Hono API, `packages/{data,cli,config}`). Other prior attempts live in `/Users/carlo/Github/` (eaw-novel-builder, manuscript-editing, author-workbench, my-electron-app).

## 7. File map
**Specs (root, authoritative):**
- `0-shell-platform-spec.md` — primary spec; §12 = resolved decisions
- `1-shell-spec.md` — SHELL_SPEC: stack, layout, persistence, theming, manifest
- `2-modules-overview.md` — MODULES_OVERVIEW: first module-set + room→module map
- `CLAUDE.md` — durable orientation for any session
- `session-handoffs/HANDOFF_NN.md` — per-session handoffs (this is `HANDOFF_01.md`; read the highest-numbered first)

**Reference (`reference/` — informs the work ahead):**
- `draftwell-anchor-analysis.md` — reference-app teardown → shell zones/modules
- `obsidian-vscode-extensibility-teardown.md` — prior-art for the module system (note: written from knowledge, not live docs — version numbers unverified)
- `single-file-css.md` — CSS technique for the theming/chrome implementation

**Archive (`archive/` — spent decision-phase artifacts; safe to skip, see `archive/README.md`):**
- `decision-questionnaire.{md,html}` + `decision-answers.md` — how the decisions were made
- `application-categories.md`, `boilerplate-shells.md`, `app_shell_*.html` — superseded background research
