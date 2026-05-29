# MODULES_OVERVIEW — First-Party Modules

Skeleton. The draftwell analysis (`reference/draftwell-anchor-analysis.md`) has landed; this records the resulting module map. The precise contract per module is designed once the shell module contract exists (see CLAUDE.md "Open Design Work").

## 1. First module-set
- The first real app is a local-first, AI-assisted authoring workbench.
- Reference implementation: `draftwell` (Carlo's recurring app — rebuilt as draftwell, eaw-novel-builder, Fountain AI Editor).
- It becomes the shell's first module-set, bundled at build time.

## 2. Module map (from draftwell's eight "rooms")
draftwell's rooms are the candidate module boundaries. Mapping to first-party modules:

| draftwell room | Module | Notes |
|---|---|---|
| Write + Plan | **Documents** | Core: manuscript tree, rich editor, save + version history, planning materials |
| Today | **Journal** | Diary entries, today plan, tasks, calendar items |
| Assets | **Assets** | Image upload/register, prompt/generation metadata, usage links |
| Export | **Workflow Runner** + Jobs | Markdown/HTML/PDF/EPUB export jobs + profiles |
| Manage | **Table View** + calendar/board | Calendar/board/graph views over work items |
| (AI layer, cross-cutting Write) | **AI Chat** / **Prompt Studio** | Context preview, workflows, runs, proposals (accept/reject), mock vs. live |
| Library | shell **Workspace** mgmt | Project list/open/duplicate/archive — folds into shell, not a module |
| Settings | shell **Settings** | Folds into shell |

## 3. What stays shell-owned (not modules)
Chrome + primitives: activity rail, zone layout/resize/toggle/persistence, zen state, top-bar workspace switcher, theming token service, status bar, command palette + keybindings + context menus, Jobs queue, document open/save pipeline + version history, the local API/service split. See `reference/draftwell-anchor-analysis.md` §6.

## 4. Next
- The per-module contribution interface (rail entry, nav/main/inspector views, state slice, commands) is blocked on the **shell module contract** being designed first.
- Documents (Write) is the natural first module to spec once the contract exists.
