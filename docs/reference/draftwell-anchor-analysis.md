# draftwell → Shell Anchor Analysis

> Reading the first real app (Q1) to design the shell's fixed zones, module contract, and first module-set against something real instead of in the abstract.
> Source: `/Users/carlo/Github/draftwell-app` (pnpm monorepo — `apps/web` React UI, `apps/api` Hono API, `packages/{data,cli,config}`).

## TL;DR — draftwell *is* the argument for the shell

draftwell is a working local-first author workbench, and its `apps/web/src/App.tsx` is **~2,470 lines with ~40 `useState` hooks**, feeding a single `RoomSidePanel` component that takes **~100 props**. Every "room" is hardwired into one monolithic component; adding a feature means editing the mega-file. This is exactly the cohesion problem Carlo described ("apps lack shape; design is an afterthought"). **The shell's job is to decompose this**: the shell owns the chrome and the zones; each room becomes a module that fills them. draftwell already contains, in embryo, every primitive in `docs/architecture/shell-platform-spec.md` — it just has no boundary enforcing them.

---

## 1. Panel grammar draftwell already uses → shell fixed zones (Q7)

From `AppShellChrome.tsx`, the layout is already a clean fixed-zone grammar:

| draftwell element | Shell zone (Q7) | Notes |
|---|---|---|
| `.room-rail` → `.rail-primary` icon nav | **Activity rail** (far-left) | Icon+label buttons, one per room; `is-active` state. This is the VS Code "activity bar." |
| `.context-sidebar` (`ProjectNavigationPane`) | **Left sidebar / navigation** | Resizable **176–380px**, drag handle **+ arrow-key resize**, width persisted to `localStorage`, toggle to hide. |
| `.workspace-header` | **Top menu bar** | Project picker, open button, word-count, sidebar/inspector toggles, room-specific primary action (e.g. "Review" only in Write). |
| `.workspace > children` (`RoomEditorPane`) | **Main pane** | The editor / primary room content. |
| `RoomSidePanel` | **Inspector** (right) | Toggleable; **swaps content per room**. |
| `.rail-status` (Local API dot) | **Status bar** (partial) | Only an API health dot today — see Flag B. |
| `.zen-mode` class + Esc to exit | **Zen / distraction-free state** | Already a root-class state-driven layout (matches `single-file-css.md`). |

**Built-in zone features (Q7 checklist) — what draftwell already has vs. gaps:**
- ✅ Resize zones (pointer + keyboard, persisted)
- ✅ Hide/toggle zones (sidebar, inspector, zen)
- ✅ Collapsible trees (manuscript tree: folder / chapter / scene)
- ❌ **Command palette / hotkey system** — none; actions are buttons only
- ❌ **Right-click context menus** — none; tree ops (rename/move/archive/delete) are buttons
→ The shell should provide palette + keybindings + context menus as **built-in primitives**, so no module reinvents them (this is the Commands primitive in the spec).

---

## 2. Rooms & feature set (the candidate module boundaries)

Eight rooms + an Import action (`App.tsx` `rooms[]`):

| Room | Does | Maps to first-party module |
|---|---|---|
| **Library** | Project list, open/duplicate/archive/restore/delete, cover image, tags | Shell **Workspace** mgmt + a Projects module |
| **Manage** | Calendar/board/graph views over work items | **Table View** + a calendar/board module |
| **Today** | Diary entries, today plan, tasks, calendar items | **Journal** module |
| **Write** | Manuscript tree, rich editor (TipTap), save + **version history**, run AI Review | **Documents** module (the core) |
| **Plan** | Planning materials (chapter plans etc.), tag + relate to documents | Planning module (or part of Documents) |
| **Assets** | Upload/register images, prompt/generation metadata, usage links, approval status | **Assets** module |
| **Export** | Markdown / HTML / PDF / EPUB export jobs + profiles, artifact preview | **Workflow Runner** + the **Jobs** primitive |
| **Settings** | Local data, theme, backup, API | Shell **Settings** |

The AI layer cuts across Write: context preview with toggleable candidates, workflows (`revision-plan`), runs, prompt-chain steps, tool calls, proposals (pending/accept/reject), **mock vs. live mode**. → This is **AI Chat + Prompt Studio + Workflow Runner** in embryo.

---

## 3. Data model (validates Q6 — with one real caveat)

SQLite via Drizzle (`packages/data/src/schema.ts`), migrations `0000`–`0009`. The `documents` table:

```
id, projectId, manuscriptId, parentId, kind (chapter|folder|scene),
title, sortOrder, content, contentFormat (markdown),
sourcePath, sourceChecksum, importId, wordCount, timestamps
```

Plus `document_versions` (history), and entities for manuscripts, diary, planning materials, calendar items, today plans/tasks, assets, ai runs/proposals/prompt-chain-steps/tool-calls, tags, entity relations, export jobs/profiles.

- **Hybrid evidence:** `sourcePath` + `sourceChecksum` link each doc back to its origin file; import copies a folder "without changing the original files."
- **Flag A — truth-source tension (Q6): RESOLVED 2026-05-29.** After import, editing/saving happens against the **SQLite copy** (`content` column + version history), with the original file kept only as provenance. Decision: the shell adopts **DB-as-truth + file provenance** (draftwell's model), superseding the initial files-as-truth lean. SQLite is the source of truth; files are import provenance + export targets. Spec updated (§12 Q6, §8, `docs/architecture/shell-spec.md` §3).

---

## 4. Theming (strongly validates Q9)

`apps/web/src/styles/` is already the documented-token model from Q9:
- `tokens.css` — `--font-sans`/`--font-serif`, `--space-1..8`, `--radius-1/2` (so **color + spacing + border + font** dimensions already exist — exactly the Q9 requirement).
- `themes.css` — **five named themes** via `[data-theme="…"]`: `inkwell-light`, `inkwell-dark`, `sepia-light`, `sapphire-nightfall`, `lapis-velvet`. `data-theme` is set on the root element; preset persisted to `localStorage`.
- Also `layout.css`, `surfaces.css`, `typography.css`, `utilities.css`.

→ The Q9 token API is **not speculative** — draftwell proves the pattern works and is the right contract. The shell formalizes these tokens as the published module-facing surface, and "build themes later that just work" is already true here.

---

## 5. LAN / iPad (validates Q10 bonus — and shows the right architecture)

- `pnpm dev` "prints local **and LAN** URLs"; there's a `smoke:ipad` script (`DRAFTWELL_SMOKE_IPAD=1`).
- The **web/API split** (React renderer ↔ Hono API ↔ SQLite) is what makes LAN access possible: the core logic lives in `apps/api` + `packages/data`, **not in the renderer**.
→ This is precisely the Q10 constraint ("keep core logic out of the renderer"). draftwell's architecture is the template: **Electron wraps a local web UI + a local API/service**, and the same API answers a LAN/iPad client. Adopt this split in the shell from the start.

---

## 6. Recommended shell decomposition

**Shell owns (the chrome + primitives):** activity rail, zone layout/resize/toggle/persistence, zen state, top-bar workspace/project switcher, theme token service + theme switching, status bar, command palette + keybindings + context menus, the Jobs queue (export + AI runs), document open/save pipeline + version history, the local API/service split.

**A module contributes (per room):** a rail entry (icon+label), a navigation-pane view, a main-pane (editor) view, an inspector view, its own state slice, its commands, and its document types. That single contract dissolves the `App.tsx` monolith and the 100-prop `RoomSidePanel`.

**First module-set (anchored to draftwell):** Documents (Write+Plan), Journal (Today), Assets, Export/Jobs (Workflow Runner), Manage (Table/calendar), plus the cross-cutting AI (Chat/Prompt Studio/Workflow Runner). Library + Settings fold into shell-level Workspace/Settings.

---

## Flags to resolve before building

- **Flag A (high priority):** Q6 says files-as-truth + SQLite index; draftwell actually edits the SQLite copy with files as provenance. Decide which one the shell enforces — it changes the persistence layer materially.
- **Flag B (low):** draftwell has only a health-dot "status bar." If the shell promises a real status bar zone, that's net-new (good place for word count, save state, job progress, API health).
- **Built-ins gap:** command palette, keybindings, and context menus don't exist in draftwell — the shell must supply them as primitives, not leave them to modules.
