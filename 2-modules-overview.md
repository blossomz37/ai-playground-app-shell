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

**Beyond draftwell's rooms:** a **Web** module (bundled, default-on in this build) provides Chrome-like persistent browsing — mirroring Obsidian's *Web viewer* core plugin. Its one shell-level hook (a managed persistent web session/partition) is specced when the module is built. See `0-shell-platform-spec.md` §12 Q13.

## 3. What stays shell-owned (not modules)
Chrome + primitives: activity rail, zone layout/resize/toggle/persistence, zen state, top-bar workspace switcher, theming token service, status bar, command palette + keybindings + context menus, Jobs queue, document open/save pipeline + version history, secrets/credentials service (OS-keychain-backed — §12 Q12), the local API/service split. See `reference/draftwell-anchor-analysis.md` §6.

## 4. Current implementation status
- ✅ Module contract designed — `3-module-contract.md`.
- ✅ Documents (Write + Plan) specced against it — `modules/documents.md` (plan `implementation/plans/02-documents-module.md`). Per-module specs now live in `modules/`.
- ✅ Document schema (shell-owned) designed — `1-shell-spec.md` §3.
- ✅ Runnable Electron + Svelte + SQLite scaffold exists in `app-shell/`.
- ✅ First-party starter modules are scaffolded and registered: Documents, Journal, Assets, Workflow Runner, Table View, AI Chat, Prompt Studio, and Web.
- ✅ Shared AI orchestration now supports both `mock-local` and `openai-responses`, with persisted runs/context packs and provider selectors in AI-facing modules.
- ✅ Shell workspace switching/creation and visible persistent jobs are implemented for the practical alpha slice.

Remaining larger architecture work should start from the newest handoff and the numbered implementation plans, not from older "what's next" sections in historical handoffs.
