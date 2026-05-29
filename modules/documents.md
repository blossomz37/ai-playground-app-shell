# Documents Module

_The first real module — draftwell's **Write** room (with **Plan** folded in, F2). Instantiates the three faces of `3-module-contract.md` to prove the contract on the hardest case (the worst of draftwell's `App.tsx` monolith). Plan + rationale: `implementation/plans/02-documents-module.md`._

> This is a **design spec**, not running code — the repo is unscaffolded. TS below is the target shape, not compiled.

---

## 0. Responsibilities

Manuscript tree (folder / chapter / scene + planning materials), the rich-text editor, save + version history, word count. Persistence is **not** here — it belongs to the shell (`ctx.documents`, DB-as-truth). This module is views + commands + a state slice over that pipeline.

---

## 1. Face 1 — Manifest (declares)

```ts
const manifest: ModuleManifest = {
  id: "shell.documents",
  name: "Documents",
  version: "0.1.0",
  requiredShellVersion: "^1.0.0",

  activation: [{ on: "userEnable" }],          // default-on in this build; still lazy (no activate() until first use)
  permissions: ["documents.read", "documents.write"],

  contributes: {
    zones: {
      railEntry: { icon: "pen", label: "Write" },
      navigation: { title: "Manuscript" },
      main:       { title: "Editor" },
      inspector:  { title: "Document" },
      statusBar:  [{ id: "wordCount" }, { id: "saveState" }],
    },
    commands: [
      { id: "documents.save",       title: "Save Document", defaultKeybinding: "Cmd+S" },
      { id: "documents.newChapter", title: "New Chapter" },
      { id: "documents.newScene",   title: "New Scene" },
      { id: "documents.newFolder",  title: "New Folder" },
      { id: "documents.rename",     title: "Rename",  when: "documents.hasSelection" },
      { id: "documents.move",       title: "Move",    when: "documents.hasSelection" },
      { id: "documents.archive",    title: "Archive", when: "documents.hasSelection" },
      { id: "documents.delete",     title: "Delete",  when: "documents.hasSelection" },
    ],
    documentTypes: [
      { kind: "folder" },
      { kind: "chapter" },
      { kind: "scene" },
      { kind: "plan" },                          // F2: planning materials are just another kind
    ],
    settings: {
      "editor.fontFamily": { type: "string", default: "serif" },
      "editor.fontSize":   { type: "number", default: 18 },
      "editor.spellcheck": { type: "boolean", default: true },
    },
  },
};
```

---

## 2. Face 2 — Contributions + lifecycle (provides)

### Views (per zone)
- `navigation` — manuscript tree: collapsible folder/chapter/scene, drag-reorder, selection. Reads the tree + expansion from the state slice.
- `main` — the rich-text editor. **Editor-agnostic (F1):** the component reads/writes the active document's content through the slice + `ctx.documents`; the concrete engine (likely TipTap/ProseMirror in a thin Svelte wrapper) is a scaffolding decision and never leaks past this view.
- `inspector` — `InspectorSection[]`:
  - `{ id: "history", title: "Version History" }` — lists `ctx.documents.versions(id)`, restore.
  - `{ id: "metadata", title: "Details" }` — kind, word count, source provenance, timestamps.
  - `{ id: "plan", title: "Planning" }` — linked planning-material docs (F2).
- `statusBar` — `wordCount` and `saveState` items, driven by the slice.

### Core-side state slice (plain TS — the home for draftwell's ~40 `useState` hooks)
```ts
interface DocumentsState {
  activeDocumentId: string | null;
  dirty: boolean;
  treeExpansion: Set<string>;      // which folders are open
  selection: string[];             // selected tree nodes
  wordCount: number;

  subscribe(listener: () => void): Disposable;   // views re-read on change
}
```
Plain framework-agnostic TS (D2 boundary): views reach it only through `ctx` + this subscribe interface, never by importing it into a component. That's what lets it move behind the local API for LAN/iPad later without a rewrite.

### Lifecycle
```ts
const module: Module = {
  manifest,
  views: { navigation: ManuscriptTree, main: EditorView,
           inspector: [HistorySection, MetadataSection, PlanningSection],
           statusBar: { wordCount: WordCountItem, saveState: SaveStateItem } },

  activate(ctx) {
    const state = createDocumentsState();

    ctx.commands.register("documents.save", async () => {
      if (!state.activeDocumentId) return;
      await ctx.documents.save(state.activeDocumentId, currentEditorContent());
      state.dirty = false;
    });
    ctx.commands.register("documents.newChapter", () => createDoc(ctx, "chapter"));
    // …newScene / newFolder / rename / move / archive / delete similarly

    // keep the slice in sync with the shell pipeline
    ctx.documents.onChanged((id) => { if (id === state.activeDocumentId) refresh(state, ctx); });
  },

  deactivate() { /* all ctx.* registrations are Disposables — auto-disposed by the shell */ },
};
```

---

## 3. Face 3 — ModuleContext usage (receives)

| Service | Used for |
|---|---|
| `ctx.documents.open/save/versions/onChanged` | all persistence (shell-owned pipeline, DB-as-truth) — the module stores no documents itself |
| `ctx.commands.register` | the eight command handlers above |
| `ctx.commands.execute("ai.review", { documentId })` | cross-cutting "Run AI Review" — **handler owned by the AI module**; Documents only invokes it |
| `ctx.settings.get/onChange` | editor prefs (font, size, spellcheck) |
| `ctx.events.emit("documents.activeChanged", id)` | lets other modules (AI, Table View) react to the active doc without a direct call |
| `ctx.theme.token` | editor/tree styling from the token API |

---

## 4. The proof — draftwell Write room → this module (no leftovers)

| draftwell responsibility | Home |
|---|---|
| "Write" rail button | `manifest.contributes.zones.railEntry` |
| `ProjectNavigationPane` tree (folder/chapter/scene) | `views.navigation` reading the slice |
| TipTap editor | `views.main` (editor-agnostic) |
| `RoomSidePanel` (Write): history + meta | `views.inspector` sections `history`, `metadata` |
| word count / save state (header + rail-status) | `views.statusBar` items |
| ~40 `useState` hooks (active doc, dirty, expansion, selection, word count) | `DocumentsState` slice |
| save / new chapter / new scene / rename / move / archive / delete | declared commands → handlers in `activate()` |
| chapter / folder / scene kinds | `contributes.documentTypes` |
| **Plan** room (planning materials, relate to docs) | `kind: "plan"` + `inspector` `plan` section (F2) |
| open / save / version persistence | `ctx.documents.*` (shell, not module) |
| "Run AI Review" button | `ctx.commands.execute("ai.review", …)` (AI module owns it) |

**No "miscellaneous" bucket. The contract holds — no contract change was required.**

---

## 5. Document schema note

The `documents` + `document_versions` tables are **shell-owned** (the `ctx.documents` pipeline), defined in `1-shell-spec.md` §3. This module contributes only the `kind` values (`folder|chapter|scene|plan`). Authoring-specific grouping (draftwell's `manuscriptId`) stays **module-level**, not in the shell's universal document model — see §3 of the shell spec for the shell-universal vs. module-extension split.

---

## 6. Open / deferred

- **Editor engine (F1)** — concrete choice at scaffolding, after a fresh ecosystem check; spec stays agnostic.
- **AI Review** — the AI module owns the `ai.review` command, runs, and proposals; this module only invokes and renders results.
- **Drag-reorder / move semantics** — tree manipulation details firm up against the real editor + schema at scaffold.
- **`manuscriptId` grouping** — designed when the schema's module-extension mechanism is built.
