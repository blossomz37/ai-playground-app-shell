# SHELL_SPEC — Platform Primitives & Shell-Side Contract

Shell-side contract for platform primitives. Skeleton — future sessions flesh out concrete APIs. Records only what the 2026-05-29 decisions settled (see `0-shell-platform-spec.md` §12).

## 1. Stack
- Desktop runtime: Electron.
- UI layer: Svelte / SvelteKit (renderer only).
- Core logic: framework-agnostic TypeScript, outside the renderer.
  - File handling, persistence, AI calls live in core, not in Svelte components.
  - Keeps logic reusable and lets a future iPad/LAN HTML client reach core features over the local network.
- macOS-first; nothing platform-specific in core.

## 2. Layout model
Fixed zones. The shell defines the named zones; modules fill them and cannot carve arbitrary new ones.

Named zones:
- left sidebar
- main pane
- inspector
- top menu bar(s)
- status bar

Built-in zone features the shell must support:
- resize zones
- hide / toggle zones
- assign hotkeys
- right-click context menus
- collapsible trees / sections / cards

## 3. Persistence
Database-as-truth model (revised 2026-05-29 after draftwell analysis):
- A local SQLite database is the source of truth for documents and workspace data.
- Files on disk are import provenance (`sourcePath` + `sourceChecksum`) and export targets — not the live editing surface.
- Version history lives in the database (`document_versions`).

Canonical document model: database-backed documents with file provenance + export. Precise schema TBD against the first app (draftwell); draftwell's `documents` + `document_versions` tables are the starting point.

## 4. Theming
Documented token API — a published, module-facing contract, not a private stylesheet. Re-theming a fork propagates to every module.

Tokens must cover:
- color
- spacing
- border
- font

Modes:
- light / dark / system out of the box.
- user-buildable themes later that "just work."

## 5. Module manifest
- The module manifest must carry permission / capability declarations from day one.
- No enforcement yet (author + small trusted circle; modules run with full access), but declarations exist so enforcement can be added later without a manifest change.
- Modules are bundled at build time (build-time fork / template model). Keep the contract clean enough that runtime loading could be added later without a rewrite.
