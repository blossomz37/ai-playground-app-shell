# Shell Platform Spec

## 1. Purpose
Define a reusable desktop shell for local-first workspace apps.
The shell is not a writing app, chat app, or workflow app.
It provides universal primitives that multiple modules can use.

## 2. Design principles
- Local-first.
- Module-first, not feature-sprawl.
- Stable core, replaceable modules.
- Same mental model across apps.
- Core shell must remain useful even with zero optional modules enabled. [web:68]

## 3. Universal primitives

### Workspace
Definition: A top-level container for one user project.
Shell owns: open/close workspace, recent workspaces, metadata, file root, lifecycle events.
Modules may: store scoped data, register workspace views, react to workspace events.
Modules may not: redefine workspace identity or bypass workspace permissions.

### Documents
Definition: File-backed or virtual content objects inside a workspace.
Shell owns: document IDs, open/save pipeline, dirty state, search indexing hooks.
Modules may: define document types, viewers, editors, derived artifacts.
Modules may not: replace the global document contract.

### Panels
Definition: Persistent UI regions for navigation, content, inspector, and utilities.
Shell owns: layout grid, docking, resizing, persistence.
Modules may: contribute views to approved panel zones.
Modules may not: create arbitrary fullscreen shell replacements.

### Commands
Definition: Invokable actions addressable by ID.
Shell owns: registry, command palette, shortcut binding, enable/disable state.
Modules may: register commands with metadata and handlers.
Modules may not: bind conflicting reserved shortcuts.

### Settings
Definition: Typed configuration for shell and modules.
Shell owns: settings store, validation, defaults, UI rendering patterns.
Modules may: contribute namespaced settings schemas.
Modules may not: write outside their namespace.

### Jobs
Definition: Background or long-running tasks.
Shell owns: job queue, status, logs, cancellation, retries.
Modules may: submit jobs and stream progress.
Modules may not: run unmanaged background work outside the job system.

### Module registration
Definition: The contract by which a module contributes capability to the shell.
Shell owns: manifest schema, lifecycle, compatibility checks, activation.
Modules may: declare views, commands, settings, jobs, document types.
Modules may not: patch shell internals directly. [web:50][web:73][web:76]

## 4. Core services
- File system service.
- Search/index service.
- Event bus.
- Command registry.
- Layout manager.
- Settings manager.
- Job runner.
- Notification/toast service.
- Theme/token service.
- Permission/capability service. [cite:1]
- Secrets/credentials service — OS-keychain-backed (Electron `safeStorage`), user-named values (e.g. `OPENAI_API_KEY`); never plaintext in SQLite. See §12 Q12.

## 5. Module contract
Every module must define:
- id
- name
- version
- required shell version
- activation rules
- contributed commands
- contributed views
- contributed settings schema
- contributed document types
- contributed jobs
- permissions required

## 6. Activation model
Modules activate by explicit user enablement, workspace type, file type, or command invocation.
Activation must be lazy where possible to reduce startup cost. [web:71][web:76]

## 7. Feature gating
Use feature flags only for rollout and experimental behavior, not as a permanent substitute for module boundaries. Long-lived flags create debt, so modules should be the main unit of optionality. [web:69][web:72]

## 8. Data boundaries
Shell data:
- app settings
- layout state
- recent workspaces
- module registry state

Workspace data:
- documents (SQLite as source of truth; files = import provenance + export targets — see §12 Q6)
- module workspace state
- jobs/history
- indexes/cache

Note: workspace document state follows the DB-as-truth model — SQLite is the source of truth, files are import provenance + export targets (per §12, Q6).

Module data:
- namespaced settings
- namespaced cache
- namespaced artifacts

## 9. UX rules
- Compact, keyboard-first shell.
- Consistent panel grammar across modules.
- Commands always reachable through the palette.
- Settings always namespaced and searchable.
- Jobs always visible through a common progress model. [cite:4]

## 10. Non-goals
The shell will not contain:
- AI-chat-specific logic
- manuscript-specific workflow rules
- prompt-runner-specific execution logic
- graph-editor-specific semantics

These belong in modules, not in the shell. [cite:1][cite:5]

## 11. First-party starter modules
- Documents
- Journal
- AI Chat
- Prompt Studio
- Workflow Runner
- Table View
- Web (bundled, default-on in this build; Chrome-like persistent browsing — see §12 Q13)

## 12. Resolved decisions (2026-05-29)

### Q1 — First app
- The first real app is a local-first, AI-assisted authoring workbench (Carlo's recurring app — rebuilt several times as draftwell, eaw-novel-builder, Fountain AI Editor).
- The shell is the missing stable foundation; this workbench becomes its first module-set.
- Reference implementation: `draftwell`.

### Q2 — App strategy
- Build-time fork / template model. One repo is the standard shell; to make a new app, copy it as a template.
- Not runtime user-toggled modules — but the module contract stays clean enough that runtime loading could be added later without a rewrite.

### Q3 — Module authors
- Author + small trusted circle only. No security sandbox for now; modules run with full access.
- Permission/capability declarations must exist in the module manifest from day one, so enforcement can be added later without a manifest change.

### Q4 — Desktop runtime
- Electron.

### Q5 — Frontend framework
- Svelte / SvelteKit for the UI layer.
- Core logic (file handling, persistence, AI calls) lives in framework-agnostic TypeScript outside the renderer. Svelte governs only the UI. Keeps logic reusable and enables the future LAN/iPad client (Q10).

### Q6 — Persistence (revised 2026-05-29 after draftwell analysis)
- **SQLite is the source of truth**; files on disk are import provenance + export targets.
- Each document records its origin file (`sourcePath` + `sourceChecksum`); the live, edited copy and version history live in the database.
- This is draftwell's proven model — chosen over files-as-truth for executability (no write-back/file-watching/conflict layer needed). Trade-off: the live manuscript lives in the app DB, not directly-editable files, until exported.
- Resolves "which state belongs in files vs database." (Supersedes the initial questionnaire lean of files-as-truth.)

### Q7 — Panel / layout
- Fixed zones. Shell defines named zones (left sidebar, main pane, inspector, top menu bar(s), status bar); modules fill them, cannot carve arbitrary new zones.
- Built-in zone features: resize zones, hide/toggle zones, assign hotkeys, right-click context menus, collapsible trees/sections/cards.
- Resolves "can modules add custom panel zones or only fill existing ones" — fill existing only.

### Q8 — Module loading
- Bundled at build time (cohesive with Q2).
- Resolves "are modules loaded from disk, bundled, or both" — bundled, for now.

### Q9 — Theming
- Documented token API. Design tokens are a published, module-facing contract — not a private stylesheet — so re-theming a fork propagates to every module.
- Tokens cover color, spacing, border, and font dimensions (not just color).
- Light/dark/system out of the box; user-buildable themes later that "just work."

### Q10 — Platforms
- macOS-first. Keep nothing platform-specific in the core; keep core logic out of the renderer so a future iPad/LAN HTML client can reach core features over the local network.

### Q11 — Distribution
- GitHub releases, deferred until there is something to ship. Auto-updater later if/when there are outside users.

### Canonical document model
- Database-backed documents (SQLite as source of truth) with file provenance (`sourcePath`/`sourceChecksum`) and export targets, per Q6.
- The precise document schema is still to be designed against the first app (draftwell) — draftwell's `documents` table (id, projectId, manuscriptId, parentId, kind, title, sortOrder, content, contentFormat, sourcePath, sourceChecksum, importId, wordCount, timestamps) + `document_versions` is the starting point.

### Q12 — Secrets management (added 2026-05-29)
- The shell owns a **secrets/credentials service** (core, not a module): user-named secret values like `OPENAI_API_KEY`.
- Rationale: cross-cutting (AI Chat / Prompt Studio / Workflow Runner all need keys — a shared need is a shell primitive, not a module other modules secretly depend on); security-sensitive (stored via Electron `safeStorage`/OS keychain, never plaintext in SQLite, main-process only).
- Surfaces: a manage-secrets UI in shell Settings (add/edit/delete named entries); `ctx.secrets.get(name)`/`list()` on the module contract, gated by the new `secrets.read` capability (declared, enforced later — Q3). `list()` returns names only, never values.
- Recorded in `docs/architecture/module-contract.md` (§5 `ctx.secrets`, §3 capability list).

### Q13 — Web browser (added 2026-05-29)
- A **Web module** (first-party, bundled, **default-on in this build**) provides Chrome-like browsing with persistent sessions — mirroring Obsidian's *Web viewer*, which is itself a core *plugin*, not kernel. The browsing experience (address bar, tabs, history, bookmarks) is a feature → it lives in a module (§10), not the shell core.
- The one genuinely shell-level piece — a **managed persistent web-surface** (Electron `session`/partition keeping cookies/logins across restarts; partition security is a main-process concern) — is added to the shell when the Web module is built and a second consumer warrants it, not speculatively now (avoids over-engineering a primitive ahead of need).
- Recorded as a deferred hook in `docs/architecture/module-contract.md` §8 and the module map in `docs/architecture/modules-overview.md`.