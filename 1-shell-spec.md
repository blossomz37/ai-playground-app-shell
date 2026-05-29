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

Canonical document model: database-backed documents with file provenance + export. Schema designed 2026-05-29 against draftwell (slice 02), below.

### Document schema (shell-owned)

The `documents` and `document_versions` tables are the shell's `ctx.documents` pipeline — owned by the core, not any module. Kept **app-neutral**: modules contribute the `kind` *values* (e.g. Documents → `folder|chapter|scene|plan`), but the table shape carries no authoring assumptions.

`documents` — shell-universal columns:

| column | notes |
|---|---|
| `id` | text PK |
| `workspaceId` | FK → workspace (the shell's term for draftwell's `projectId`) |
| `parentId` | nullable; the tree edge |
| `kind` | text; value contributed by a module's `documentTypes` |
| `title` | |
| `sortOrder` | sibling ordering |
| `content` | the live edited content (DB-as-truth) |
| `contentFormat` | e.g. `markdown` |
| `sourcePath` | nullable; import provenance |
| `sourceChecksum` | nullable; import provenance |
| `createdAt` / `updatedAt` | |
| `archivedAt` | nullable; soft-delete/archive |

`document_versions` — shell-universal: `id`, `documentId` (FK), `content`, `contentFormat`, `createdAt`, `label` (nullable note).

**Shell-universal vs. module-extension split.** Draftwell columns that encode *authoring-specific* structure do **not** enter the shell model:
- `manuscriptId` — draftwell groups docs under a manuscript; that's an authoring concept → lives at **module level** (a module-namespaced table/relation), designed when the schema's module-extension mechanism is built.
- `wordCount` — derived/cacheable, not source data; a module computes and caches it (Documents shows it in the status bar), not a shell column.
- `importId` — batch-import provenance; shell-optional, added if/when a shell import pipeline needs it.

This keeps the shell's document model reusable across non-authoring forks. See `modules/documents.md` §5.

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
