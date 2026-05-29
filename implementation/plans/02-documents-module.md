# Plan 02 — The Documents Module

_Status: DRAFT — awaiting alignment before execution._
_Anchor: `3-module-contract.md` §7 (the Write-room mapping is this module's skeleton); `reference/draftwell-anchor-analysis.md` §2 (Write/Plan rooms) + §3 (data model)._

## Goal & scope

Spec the **first real module — Documents** — against the contract, to prove the contract works end-to-end on the hardest case (the room that was the worst of draftwell's `App.tsx` monolith). Documents covers draftwell's **Write** room: the manuscript tree, the rich-text editor, save + version history, word count. Deliverable is a **module design spec** (TS instantiation of the three faces + the document schema it needs), not running code — the repo is still unscaffolded.

Success test: a complete, no-gaps instantiation of all three contract faces for Documents, such that scaffolding could build it directly and the contract needs no changes to accommodate it. (If the contract *does* need a change, that's a valuable finding — we fix the contract.)

## Approach (build order of the spec)

1. **Manifest** — `id: "shell.documents"`, activation `[{ on: "userEnable" }]` (default-on in this build), permissions `["documents.read", "documents.write"]`, and the zone/command/doc-type declarations:
   - `zones.railEntry` = `{ icon, label: "Write" }`
   - `zones.navigation` = manuscript tree
   - `zones.main` = editor
   - `zones.inspector` = version-history + metadata sections
   - `zones.statusBar` = word-count + save-state items
   - `contributes.documentTypes` = `chapter | folder | scene`
   - `contributes.commands` = save, new chapter, new scene, rename, move, archive, delete (+ default keybindings)
2. **Contributions** — the live half:
   - `views.navigation` (Svelte tree), `views.main` (editor), `views.inspector` (`InspectorSection[]`: history, metadata), `views.statusBar`.
   - **Core-side state slice**: current document id, dirty flag, tree expansion set, selection — the homes for draftwell's ~40 `useState` hooks. Plain TS, subscribe interface for the views.
   - `activate(ctx)`: register command handlers, subscribe to `ctx.documents.onChanged`.
3. **ModuleContext usage** — persistence is *not* the module's; it calls `ctx.documents.open/save/versions`. Editor prefs via `ctx.settings`. Cross-cutting "Run AI Review" via `ctx.commands.execute("ai.review", …)` (handler owned by the AI module).
4. **Document schema** — resolve the "Document schema" open-design-work item here, from draftwell's `documents` + `document_versions` tables. **Note the ownership split:** the `documents` *table* is **shell-owned** (it's the `ctx.documents` pipeline, DB-as-truth, Q6); the Documents *module* only contributes the `kind` values (`chapter|folder|scene`). So the schema lands as a shell artifact this slice triggers, not as module-private data.

## Key design decisions (RESOLVED w/ Carlo 2026-05-29)

- **F1 — Rich-text editor: spec editor-agnostic now; lock the engine at scaffold.** Clarification recorded: TipTap is *not* React — its ProseMirror core is framework-agnostic; draftwell only used TipTap's React *binding*. "Svelte-native" means the view/reactivity is Svelte's (either a thin wrap of ProseMirror/TipTap like `svelte-tiptap`, or a lighter ground-up markdown editor like Carta). For manuscripts (version history, future inline AI annotations) ProseMirror-class robustness matters, so the **likely engine is TipTap/ProseMirror in a thin Svelte wrapper** — but the module spec stays agnostic (main view reads/writes via the slice + `ctx.documents`), so the contract isn't bet on it. Concrete engine chosen at scaffolding, after a fresh ecosystem check (fast-moving area).

- **F2 — Plan folds into Documents.** Planning materials = another document `kind` + an inspector view. Split into its own module later only if it grows. (Confirmed.)

- **F3 — Where things live:** per-module specs get a new top-level `modules/` dir (`modules/documents.md`); the **document schema** (shell-owned) lands in `1-shell-spec.md` §3. (Confirmed.)

## Files / areas touched

- **New:** the Documents module spec — likely `implementation/plans/02-documents-module.md` carries the plan, and the module spec itself lands as `modules/documents.md` (new top-level `modules/` dir for per-module specs) **or** folded into `2-modules-overview.md`. Recommend a new `modules/documents.md` so each module gets its own durable spec. **← confirm the location convention; it sets the pattern for all future modules.**
- **Updated:** `1-shell-spec.md` §3 (document schema), `2-modules-overview.md` §4 (Documents now specced), `CLAUDE.md` open-design-work (schema + Documents done).

## Risks & unknowns

- **F1 editor** — the only choice with contract-leak potential; mitigated by speccing editor-agnostic.
- **Contract stress** — this slice's *job* is to stress the contract; if Documents needs something the contract lacks (e.g. inspector needs to react to main-pane selection), we amend the contract and note it. That's success, not failure.
- **Schema scope** — draftwell's `documents` table has app-specific columns (`manuscriptId`, `importId`). Decide which are shell-universal vs. draftwell-specific; don't bake authoring assumptions into the shell document model.

## Validation

No scaffold yet ⇒ **no screenshots** (AGENTS.md screenshot rule is for UI changes; N/A). Validation is **contract-completeness**: every Write-room responsibility from contract §7 has a concrete home in the Documents instantiation, and the contract required no unplanned change (or the change is recorded). Screenshots come in the later scaffolding slice.

## Out of scope

- Scaffolding / runtime code (Option B / later).
- The AI module (owns "Run AI Review"; Documents only invokes it).
- Other modules (Journal, Assets, Export, Table View, Web).
- The concrete editor engine (F1 → scaffolding) and command-palette/keybinding UI (separate shell-primitive slice).
