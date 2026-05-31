# MODULE_CONTRACT — How a Plugin Plugs Into the Shell

_The keystone. Defines the single contract by which an optional plugin contributes capability to the core shell. Anchors: `0-shell-platform-spec.md` §3/§5/§6, `reference/draftwell-anchor-analysis.md` §6. Decisions recorded in `implementation/plans/01-module-contract.md`._

> **Terminology.** This doc says **module**; Obsidian says *plugin*, VS Code says *extension* — same concept. Synonyms throughout. A global rename is cosmetic if ever wanted.

---

## 1. What this is, in one breath

The shell is a **core build with defaults** — it owns the chrome (zones, command system, settings, jobs, the document pipeline) and works on its own with zero modules. A **module** is an optional add-on that fills the core's slots and calls the core's services. The **module contract** is nothing more than the agreed rules for that: what a module must say about itself, what it's allowed to do, and how the core hands it the slots and services.

A module never reaches into shell internals. It only ever:
- **declares** itself (a manifest),
- **provides** contributions (views, commands, jobs, a state slice) through a lifecycle, and
- **receives** a context object — the only door to the shell's services.

Those three are the whole contract. The rest of this doc makes each concrete.

---

## 2. The three faces

| Face | What it is | Analogy |
|---|---|---|
| **Declares** — `ModuleManifest` | Static data: identity, when to activate, the *shape* of its contributions, permissions. Readable without running module code. | VS Code's `package.json` `contributes` |
| **Provides** — `ModuleContributions` + `activate()/deactivate()` | The live goods: Svelte view components, command handlers, job runners, a core-side state slice — wired up when activated. | VS Code's `extension.ts` `activate()` |
| **Receives** — `ModuleContext` | The shell's services, handed to `activate()`. The module's only door to the core. | VS Code's `vscode` API namespace |

Why split declare vs. provide? Because the shell must know a module exists and what it offers (to draw its rail icon, list its commands in the palette, show its settings) **before** running a line of its code. Declaration is inert; provision is live.

---

## 3. Face 1 — the manifest (declares)

```ts
interface ModuleManifest {
  id: string;                 // reverse-DNS, stable, unique. e.g. "shell.documents"
  name: string;               // human label. e.g. "Documents"
  version: string;            // semver of this module
  requiredShellVersion: string; // semver range the module needs. e.g. "^1.0.0"

  activation: ActivationRule[];   // when the shell should activate this module (§6)
  permissions: Capability[];      // declared, unenforced for now (Q3) — see §8

  // The *shape* of what it contributes — inert declarations, not handlers.
  // Lets the shell render the rail entry / list commands / show settings
  // without activating the module.
  contributes: {
    zones?: ZoneContributionDecl;     // which fixed zones it fills (§4 of shell spec)
    commands?: CommandDecl[];         // id + title + optional default keybinding + enablement
    documentTypes?: DocumentTypeDecl[];
    jobs?: JobTypeDecl[];
    settings?: SettingsSchema;        // namespaced under the module id
  };
}

type ActivationRule =
  | { on: "userEnable" }              // PRIMARY: user toggles it on (state persists, §6/§8)
  | { on: "workspaceType"; type: string }
  | { on: "fileType"; ext: string }
  | { on: "command"; commandId: string };

type Capability =
  | "fs.read" | "fs.write"
  | "documents.read" | "documents.write"
  | "secrets.read"
  | "ai.invoke" | "net.fetch" | "jobs.submit";
```

**Zone declarations** name which fixed zones (shell spec §2: activity rail, left sidebar, main pane, inspector, status bar) the module fills. This is declaration only — the actual components live in Face 2.

```ts
interface ZoneContributionDecl {
  railEntry?: { icon: string; label: string };  // activity-rail button
  navigation?: { title: string };               // left-sidebar view
  main?: { title: string };                      // main-pane view
  inspector?: { title: string };                 // right inspector view (may host multiple sections — §4)
  statusBar?: { id: string }[];                  // status-bar items (Flag B: net-new zone)
}
```

---

## 4. Face 2 — contributions + lifecycle (provides)

The live half. The shell calls `activate(ctx)` when an activation rule fires; the module wires up its goods and is torn down by `deactivate()`.

```ts
interface Module {
  manifest: ModuleManifest;

  // View components per zone. Component *references* may sit here inertly
  // (they don't run until rendered), which keeps activation lazy without
  // needing lazy module loading (everything's bundled, Q8).
  views?: {
    navigation?: SvelteComponent;
    main?: SvelteComponent;
    inspector?: SvelteComponent | InspectorSection[]; // one view, or named collapsible sections
    statusBar?: Record<string, SvelteComponent>;      // keyed by the ids declared in the manifest
  };

  activate(ctx: ModuleContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

interface InspectorSection { id: string; title: string; component: SvelteComponent; }
```

Inside `activate(ctx)` the module does its live wiring:
- registers command **handlers** (`ctx.commands.register`) for the command ids it declared,
- registers **job runners** (`ctx.jobs.defineRunner`) for its declared job types,
- creates main-process state/services for command, job, and event behavior; renderer-resident UI state is registered by module id in the renderer module-state registry,
- subscribes to events / document changes it cares about.

**Renderer state registry (implemented 2026-05-31).** Electron splits the module across main and renderer processes, so renderer UI state cannot literally be constructed inside the main-process `activate(ctx)`. The implemented equivalent is `app-shell/src/renderer/src/modules/module-state-registry.ts`: each module's renderer slice is registered by module id and state key, and module-local renderer `state.ts` files are Svelte adapters over those plain TypeScript slices. Main-process `activate(ctx)` still owns command/job/event wiring; renderer components never own module logic directly.

**The internal/external boundary (D2).** The state slice and all module logic are plain framework-agnostic TypeScript. The Svelte views are thin subscribers that reach that logic through the module's renderer state adapter and slice subscribe interface — never by owning logic inside a component. Held that way, the logic runs outside Svelte today and can move behind the local API for a LAN/iPad client later (Q10) by relocating it, not rewriting it.

---

## 5. Face 3 — the ModuleContext (receives)

The single object the shell passes to `activate()`. It is the module's *entire* allowed surface area against the shell — there is no other door. This is what enforces "modules may not patch shell internals" (spec §3): they simply have nothing else to call.

```ts
interface ModuleContext {
  moduleId: string;

  commands: {
    register(id: string, handler: (...args: unknown[]) => unknown): Disposable;
    execute(id: string, ...args: unknown[]): Promise<unknown>;  // call any command, incl. other modules'
  };

  settings: {                                   // auto-namespaced under moduleId
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    onChange<T>(key: string, cb: (v: T) => void): Disposable;
  };

  secrets: {                                    // OS-keychain-backed (Electron safeStorage), main-process only
    get(name: string): Promise<string | undefined>;  // gated by the "secrets.read" capability
    list(): Promise<string[]>;                        // user-defined names only — never returns values
  };

  jobs: {
    defineRunner(jobType: string, run: JobRunner): Disposable;
    submit(jobType: string, payload: unknown): JobHandle;     // queued, cancellable, progress-streamed
  };

  events: {                                     // the shell event bus — how modules talk w/o direct calls
    on(event: string, cb: (payload: unknown) => void): Disposable;
    emit(event: string, payload: unknown): void;
  };

  documents: {                                  // the shell-owned open/save/version pipeline (DB-as-truth, Q6)
    open(id: string): Promise<Doc>;
    save(id: string, content: unknown): Promise<void>;
    versions(id: string): Promise<DocVersion[]>;
    onChanged(cb: (id: string) => void): Disposable;
  };

  notify(toast: { level: "info" | "warn" | "error"; message: string }): void;

  theme: { token(name: string): string };      // resolve a design token (Q9 token API)

  workspace: { id: string; type: string; root: string };
}

type Disposable = { dispose(): void };          // everything registered is cleaned up on deactivate
```

---

## 6. Lifecycle & activation

```
installed (in bundle, Q8)
   │
   ▼
declared ───────────► shell reads manifest: draws rail entry, lists commands in palette,
   │                  shows settings schema. No module code has run yet.
   │
   │  user toggles ON  (or workspaceType / fileType / command rule fires)
   ▼
enabled  ───────────► on/off state persisted as shell-level data (§8 module registry state).
   │                  Survives restarts. STILL no activate() — lazy (§6).
   │
   │  first actual use (open its view / run its command)
   ▼
activated ──────────► activate(ctx): handlers, runners, subscriptions live;
   │                  renderer state resolves through module-state-registry.
   │
   │  user toggles OFF / shell shutdown
   ▼
deactivated ────────► deactivate(): all Disposables disposed; state slice released.
```

- **Off by default.** Nothing activates at startup; the core build stands alone.
- **Enabled ≠ activated.** Enabling persists intent; activation is deferred to first use, so a long list of enabled modules costs nothing at launch.

---

## 7. Worked example — the Documents (Write) module

The contract's job is to dissolve draftwell's 2,470-line `App.tsx` and its 100-prop `RoomSidePanel`. Here is the Write room mapped, with no leftover bucket:

| draftwell responsibility | Home in the contract |
|---|---|
| `.room-rail` "Write" icon button | manifest `contributes.zones.railEntry` `{ icon: "pen", label: "Write" }` |
| `ProjectNavigationPane` — manuscript tree (folder/chapter/scene), collapsible | `views.navigation` (Svelte) reading the tree from the state slice |
| TipTap rich editor | `views.main` (Svelte) |
| `RoomSidePanel` content for Write — version history, doc meta | `views.inspector` as `InspectorSection[]`: `{history}`, `{metadata}` |
| Word count, save state in header/rail-status | `contributes.zones.statusBar` + `views.statusBar` items |
| ~40 `useState` hooks: current doc, dirty flag, tree expansion, selection | a **plain TypeScript state slice** registered by module id; views subscribe through the renderer adapter |
| Save / new chapter / new scene / rename / move / archive / delete | declared `contributes.commands` (ids + titles + default keybindings) → handlers registered in `activate()` via `ctx.commands.register` |
| chapter / folder / scene kinds | `contributes.documentTypes` |
| open / save / version history persistence | **not the module's** — `ctx.documents.*` (shell-owned pipeline, DB-as-truth) |
| "Run AI Review" button (only in Write) | a command the Documents module *invokes* (`ctx.commands.execute("ai.review")`) but the **AI module owns** the handler + the run/proposal logic. Cross-cutting concern crosses via the command + event bus, not a direct call — this is precisely the `App.tsx` tangle the contract untangles. |

Every Write-room responsibility lands in a named slot. **The contract passes.**

---

## 8. Deferred (declared now, built later — no contract change required)

- **Permission enforcement.** Capabilities are declared in the manifest today but unenforced (Q3, single trusted author). A future enforcement layer reads the same field — no manifest migration.
- **Externalizing logic for LAN/iPad (Q10).** The clean `ctx` + state-slice boundary (§4) is what makes this a relocation, not a rewrite. Not built in v1.
- **Runtime / from-disk module loading.** Bundled at build time for now (Q8); the contract is kept clean enough that disk-loaded modules could be added without reshaping it.
- **Status-bar zone (Flag B).** The `statusBar` contribution point is defined here; the zone's own visual/layout design is a separate slice.
- **Managed persistent web-surface (for the Web module).** The current Web module uses an Electron `<webview>` with persistent partition `persist:app-shell-web`. A shell-level `ModuleContext` web-surface API is still deferred until a second consumer warrants it (`0-shell-platform-spec.md` §12 Q13).

## 9. What this unblocks

- **Plan `02-documents-module.md`** — the first real module, specced directly against §7.
- `2-modules-overview.md` §4 (was blocked on this contract).
- The shell-provided primitives draftwell lacks — command palette, keybindings, context menus — now have a clear job: they are the *UI/runtime* of the Commands primitive that modules register into via `ctx.commands`.
