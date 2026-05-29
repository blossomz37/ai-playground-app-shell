# Obsidian vs. VS Code: Extensibility Teardown

> Working reference for designing a new extensible desktop "platform shell" (stable core + runtime-loaded modules).
> Mechanism-focused, not marketing-level. Both apps are Electron-based, which matters a lot for the security axis.

**Sourcing note:** Live web fetch was unavailable in this session, so this is written from established knowledge of both systems with canonical doc URLs cited. The *architecture* described is stable and well-documented; **version-pinned numbers** (e.g., exact current `engines.vscode` baselines, newest API additions) should be spot-checked against the live docs before you rely on them. Primary sources:
> - VS Code Extension API: https://code.visualstudio.com/api
> - VS Code manifest reference: https://code.visualstudio.com/api/references/extension-manifest
> - VS Code contribution points: https://code.visualstudio.com/api/references/contribution-points
> - VS Code activation events: https://code.visualstudio.com/api/references/activation-events
> - VS Code extension host / capabilities: https://code.visualstudio.com/api/advanced-topics/extension-host
> - VS Code Workspace Trust: https://code.visualstudio.com/docs/editor/workspace-trust
> - Obsidian developer docs: https://docs.obsidian.md
> - Obsidian plugin anatomy: https://docs.obsidian.md/Plugins/Getting+started/Anatomy+of+a+plugin
> - Obsidian manifest: https://docs.obsidian.md/Reference/Manifest
> - Obsidian plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
> - Obsidian API (typed): https://github.com/obsidianmd/obsidian-api

---

## 0. One-paragraph framing

VS Code and Obsidian sit at opposite ends of the extensibility design space, and the split is deliberate. **VS Code** treats third-party code as untrusted by default and pays real engineering cost to isolate it: extensions run in a **separate Node process (the extension host)**, talk to the UI over an async RPC boundary, and can never touch the DOM directly. It leans heavily on **declarative contribution** (you describe capabilities in `package.json`; the core wires up UI before your code ever runs) and **lazy activation** to keep startup fast across thousands of installed extensions. **Obsidian** treats plugins as trusted, first-class citizens of the renderer: plugins are **JavaScript loaded straight into the renderer process with full Node/Electron access**, manipulate the real DOM, and call a rich typed API synchronously. It trades the safety boundary for simplicity, power, and zero IPC latency — and pushes safety onto a **human review process** and explicit user "trust this plugin" gating instead of a technical sandbox.

---

## 1. Extension/Plugin Manifest

| Axis | VS Code | Obsidian |
|---|---|---|
| **File** | `package.json` (standard npm manifest + VS Code-specific keys) | `manifest.json` (dedicated, VS Code-style fields not reused from npm) |
| **Entry code** | `main` → CommonJS module exporting `activate()`/`deactivate()` | `main.js` → CommonJS module whose default export is a `Plugin` subclass |
| **Required fields** | `name`, `version`, `publisher`, `engines.vscode` | `id`, `name`, `version`, `minAppVersion`, `description`, `author` |
| **Notable optional fields** | `displayName`, `categories`, `activationEvents`, `contributes`, `main`, `browser` (web build), `extensionDependencies`, `extensionPack`, `capabilities` | `authorUrl`, `fundingUrl`, `isDesktopOnly` (true ⇒ can use Node/Electron-only APIs; blocks load on mobile) |
| **Versioning of the spec** | npm semver for the extension; `engines.vscode` for host compat | plain semver string; `minAppVersion` is the host gate |
| **Discovery** | Scans `~/.vscode/extensions/<id>/` (+ bundled). Reads every `package.json` at startup to build the contribution registry **without running extension code**. | Scans `<vault>/.obsidian/plugins/<id>/`. Each plugin folder must contain `manifest.json` + `main.js` (+ optional `styles.css`, `data.json`). |
| **Validation** | Manifest JSON-schema validated; bad `contributes` entries are logged and skipped. Marketplace also validates at publish time. | Manifest fields validated on load; `id` must be unique and match folder; community-list entry separately reviewed. |
| **Core's pre-run knowledge** | High: the entire `contributes` block is known before activation, so menus/commands/views exist in the UI before any JS runs. | Low: manifest carries only identity/compat metadata. **Almost everything is registered imperatively at runtime** inside `onload()`. |

**Key divergence:** VS Code's manifest is *thick* (it's a static description of capabilities); Obsidian's manifest is *thin* (identity + compat only, capabilities come from running code).

---

## 2. Contribution Points — Declarative vs. Imperative

### VS Code: declarative-first

The `contributes` object in `package.json` statically declares capability. The core reads it at startup and builds UI/registry entries *before* activation. Major contribution points:

- `commands` — id + title + category + icon (handler is bound later in code via `registerCommand`)
- `menus` — place commands into menus/context menus, gated by `when` clauses (context-key expressions)
- `keybindings` — default key + `when` clause
- `views` / `viewsContainers` — sidebar/panel tree views and the containers that hold them
- `configuration` — settings schema (types, defaults, descriptions, scopes)
- `languages`, `grammars`, `themes`, `iconThemes`, `snippets`
- `customEditors` — claim file globs for a custom editor (webview-based)
- `jsonValidation`, `problemMatchers`, `taskDefinitions`, `debuggers`, `walkthroughs`, etc.

The **declarative half describes**; the **imperative half (runtime) binds behavior**: `commands.registerCommand`, `window.registerTreeDataProvider`, `languages.registerCompletionItemProvider`, `workspace.registerTextDocumentContentProvider`, etc. Pattern: *declare the surface statically so the UI is instant and inspectable; attach the logic lazily.*

### Obsidian: imperative-first

There is essentially no declarative contribution block. Inside `onload()` you call registration methods on your `Plugin` instance, and the framework auto-cleans them on unload:

- `this.addCommand({ id, name, callback / editorCallback / checkCallback, hotkeys })`
- `this.addRibbonIcon(icon, title, callback)` — left ribbon button
- `this.addStatusBarItem()` — status bar element you own
- `this.addSettingTab(new MySettingTab(this.app, this))`
- `this.registerView(VIEW_TYPE, leaf => new MyView(leaf))` — custom panes
- `this.registerEvent(...)`, `this.registerDomEvent(...)`, `this.registerInterval(...)` — lifecycle-bound listeners
- `this.registerMarkdownPostProcessor(...)`, `this.registerMarkdownCodeBlockProcessor(...)`, `this.registerEditorExtension(...)` (CodeMirror 6 extensions)
- `this.registerObsidianProtocolHandler(...)` — `obsidian://` URI handling

**Key divergence:** VS Code can show a command in the palette or a view in the sidebar *without loading the extension*, because the contribution is static metadata. Obsidian cannot — the command/view doesn't exist until the plugin's `onload()` has executed. This is the direct consequence of thin-manifest + always-load.

---

## 3. Activation & Lazy Loading

| Axis | VS Code | Obsidian |
|---|---|---|
| **Default load model** | **Lazy.** Extension code is NOT loaded until an activation event fires. | **Eager (for enabled plugins).** Every enabled plugin is loaded at startup. |
| **Trigger** | `activationEvents` in manifest (or implicit, see below) | App startup loads all enabled plugins; user enable toggles load on demand |
| **Lifecycle** | `activate(context)` → use `context.subscriptions` for disposables → `deactivate()` | `onload()` → register things on `this` (auto-disposed) → `onunload()` |
| **Cleanup** | Push disposables into `context.subscriptions`; host disposes on deactivate | Use `this.register*` helpers; framework disposes on unload. Manual DOM/listeners you add outside helpers must be cleaned in `onunload()` |
| **Startup cost mgmt** | Core philosophy. Activation events + "extension bisect" + startup performance reports (`Developer: Startup Performance`) + activation timing in the Running Extensions view | Mostly on the plugin author + reviewers; Obsidian shows per-plugin load time and warns about slow plugins. Heavy work should be deferred (e.g., `app.workspace.onLayoutReady`) |

**VS Code activation events (representative):**
- `onCommand:<id>` — *now mostly implicit*: if a command is in `contributes.commands`, recent VS Code auto-activates on its invocation without you listing it.
- `onLanguage:<langId>` — file of that language opened
- `onView:<viewId>` — a contributed view becomes visible
- `workspaceContains:<glob>` — workspace has a matching file (great for project-type detection)
- `onFileSystem:<scheme>`, `onUri`, `onDebug`, `onCustomEditor:<viewType>`, `onNotebook:<type>`
- `onStartupFinished` — activate soon after startup but *off* the critical path (preferred over `*`)
- `*` — eager activation on startup (discouraged; flagged in reviews)

**Implicit activation** is the modern trend: VS Code increasingly derives activation events from the `contributes` block (commands, views, etc.) so authors don't hand-maintain them. Net effect: declare your surface, and the host both shows it *and* knows when to wake you.

**Key divergence:** VS Code's whole startup story is "thousands of extensions installed, near-zero startup cost because almost none are running." Obsidian's is "you installed it, you want it, load it" — simpler, but startup degrades roughly linearly with plugin count, and a single bad plugin can block/janky the renderer.

---

## 4. API Surface & Versioning

| Axis | VS Code | Obsidian |
|---|---|---|
| **Shape** | Single `vscode` module injected at runtime (not a real npm dep — `@types/vscode` provides types only). Namespaced: `window`, `workspace`, `commands`, `languages`, `env`, `debug`, `tasks`, `extensions`, `scm`, `notebooks`, etc. | Single `obsidian` module (typed via the `obsidian` npm package / `obsidian-api` repo). Classes: `App`, `Plugin`, `Workspace`, `Vault`, `MetadataCache`, `Editor`, `ItemView`, `Modal`, `Setting`, `Notice`, etc. |
| **Typing/docs** | `@types/vscode` (DefinitelyTyped-style), full API reference site, exhaustive JSDoc | Hand-maintained `.d.ts` in `obsidianmd/obsidian-api` with JSDoc; no separate generated reference site of equal depth |
| **Host-version declaration** | `engines.vscode` (semver range, e.g. `^1.90.0`). Host won't load extensions requiring a newer API. | `minAppVersion` (single floor). Plus `versions.json` in releases maps plugin version → min app version for back-installs |
| **Backward compat** | Very strong. Stable API is **append-only**; breaking changes essentially never ship to stable. New/experimental surface goes through **Proposed API** (opt-in via `enabledApiProposals`, only usable in dev/insiders, not publishable to marketplace until finalized). | Compat maintained by convention + review. Some surface is **undocumented/"internal"** (`app.*` internals) that plugins use anyway and that *can* break across releases. Documented API is reasonably stable. |
| **Deprecation** | Marked `@deprecated` in types, kept working, removed rarely/slowly with long runway | `@deprecated` JSDoc tags; community communication via dev forum/Discord; less formal runway |
| **Stable-yet-evolving mechanism** | **Proposed API gate** is the key trick: experiment freely behind a flag, finalize only when proven, never break stable. | **Append + review + minAppVersion floor**: add APIs, discourage internal-API use, let `minAppVersion` fence off plugins from too-old hosts. |

**Key divergence (this is axis (b) in the brief):** VS Code keeps a stable API by *physically separating* experimental surface (Proposed API, flagged, unpublishable) from stable surface (append-only). Obsidian keeps stability mostly by *social contract*: a documented stable surface, a discouraged-but-tolerated internal surface, plugin review, and a version floor. VS Code's approach scales to a huge third-party ecosystem with low coordination; Obsidian's is lighter to maintain but leaks (plugins reach into internals and occasionally break on updates).

---

## 5. Security / Trust Boundary

| Axis | VS Code | Obsidian |
|---|---|---|
| **Where code runs** | **Separate extension host process** (Node.js), not the renderer. Web/remote variants run in a web worker or remote host. | **Renderer process**, same context as the app UI. |
| **DOM access** | None directly. UI is contributed through APIs/webviews; the renderer is off-limits to extension code. | **Full, direct DOM access** to the entire app. |
| **Node/Electron access** | Full Node in the (desktop) extension host, but mediated by the API for editor actions; UI is reached only via async RPC. | **Full Node + Electron** (`require('fs')`, `child_process`, network, etc.) when not mobile/`isDesktopOnly`-blocked. |
| **Isolation cost** | Async-only RPC boundary; a hung/crashed extension can't freeze the editor UI; misbehaving extension is contained to its process. | None. A plugin can freeze the UI, read/modify any vault file, exfiltrate data, run arbitrary native code. |
| **Permission system** | No fine-grained per-capability permissions, BUT **Workspace Trust**: in an *untrusted* workspace, extensions run in a restricted mode (many disabled or limited); extensions declare `capabilities.untrustedWorkspaces`. Marketplace also signs/scans. | No permission system at all. Trust is **all-or-nothing per plugin**, gated by a one-time **"this plugin can access your system / third-party plugins are not vetted"** consent dialog when you first enable community plugins. |
| **Trust model for 3rd-party code** | Process isolation + Workspace Trust + marketplace signing/malware scanning + verified publishers | **Human review** of every community plugin's source on first submission + open-source requirement + user consent gate. No ongoing technical sandbox. |

**Key divergence (this is axis (a) in the brief):**
- **Obsidian's "full-access renderer" simplicity:** synchronous rich API, zero IPC, plugins do anything the app can (touch DOM, files, network, native). Massively productive for plugin authors; near-zero framework overhead. Cost: **no containment** — a malicious or buggy plugin has the keys to everything, and safety rests entirely on review + user vigilance. Acceptable because Obsidian is local-first, single-user, and plugins are open-source + reviewed.
- **VS Code's isolated-extension-host safety:** extensions can't crash the UI, can't touch the DOM, and untrusted workspaces are degraded automatically. Cost: **everything is async**, the API must mediate all UI, webviews need a postMessage protocol, and the framework is far more complex. Worth it because VS Code routinely opens *untrusted code from the internet* (cloned repos) and runs at enormous scale.

---

## 6. UI Integration

| Axis | VS Code | Obsidian |
|---|---|---|
| **How UI is contributed** | Through framework primitives only (extensions never touch the DOM): **Tree Views** (`TreeDataProvider`), **Webviews** (sandboxed iframe + postMessage), **Webview Views** (webview in the sidebar), **Status Bar Items**, **Custom Editors**, **Quick Picks**, **Notebooks**. View *containers* and views are declared in `contributes`. | **Direct DOM.** `ItemView`/`View` give you a real `containerEl` you populate with HTML. Plus `addRibbonIcon`, `addStatusBarItem`, `Modal`, `Setting` builder, `Notice`, `Menu`. CodeMirror 6 editor extensions for in-editor UI. |
| **Arbitrary HTML/JS in main UI** | Not in the core UI — only inside the **webview sandbox** (isolated iframe, CSP-restricted, no direct Node, talks to extension via messages). | Yes, everywhere. You build DOM nodes directly in your view/modal/settings. |
| **Theming/styling contract** | Use **theme color tokens** (`var(--vscode-...)` CSS variables) and product icon/codicon set. Webviews must opt into theme via injected CSS variables and respect `vscode-*` classes. Hardcoding colors breaks under themes. | Use Obsidian's **CSS variables** (`--text-normal`, `--background-primary`, `--interactive-accent`, etc.) and built-in classes so plugins inherit the active theme. Ship `styles.css`; avoid hardcoded colors. Guidelines explicitly require theme-compatible styling. |
| **Latency** | Async (RPC) for everything; webview is its own document. | Synchronous, native-feeling — no boundary. |

**Key divergence:** VS Code's UI contract is "describe a view, give us a data provider or a sandboxed webview, never touch our DOM." Obsidian's is "here's a div, here are our CSS variables, go nuts." The former is safer and themeable-by-construction but constrained; the latter is unlimited but relies on authors voluntarily following the styling contract.

---

## 7. Settings & Persistence

| Axis | VS Code | Obsidian |
|---|---|---|
| **Settings schema** | Declared in `contributes.configuration` (JSON schema: type, default, enum, scope, markdownDescription). Core renders the Settings UI automatically. | No declarative schema. You build a `PluginSettingTab` imperatively with the `Setting` builder; you render every control yourself. |
| **Read/write config** | `workspace.getConfiguration('myExt').get/update(...)`; scoped to user / workspace / folder | `this.loadData()` / `this.saveData(obj)` — reads/writes a single JSON blob |
| **Where it lives** | User settings `settings.json` (per-OS user dir); workspace settings `.vscode/settings.json`; merged by scope. Extension *state* via `context.globalState` / `context.workspaceState` (key-value) and `context.globalStorageUri` / `storageUri` / `secrets` (secret storage via OS keychain) | `<vault>/.obsidian/plugins/<id>/data.json`. Everything (config + plugin data) typically lives there; secrets have no special store (a real weakness). |
| **Namespacing** | By configuration prefix (`myExt.*`) and per-extension storage dirs/state buckets | By plugin folder; the `data.json` is yours alone |
| **Sync** | Settings Sync syncs user settings + selected extension state across machines | Settings live in the vault, so they sync with whatever syncs the vault (Obsidian Sync, Git, Dropbox) |

**Key divergence:** VS Code separates **config (schema-declared, scoped, merged)** from **state (key-value, secret store, per-extension storage dir)** and renders settings UI for you. Obsidian gives you one JSON file and a UI builder — simpler, but you reinvent rendering and have no secret store or scope merging.

---

## 8. Command System

| Axis | VS Code | Obsidian |
|---|---|---|
| **Registry** | Global command registry. `commands.registerCommand(id, handler)` binds behavior; `contributes.commands` declares id/title/icon. Commands are also a public RPC: any extension can `executeCommand(id, ...args)`. | Per-plugin commands via `this.addCommand({...})`. Internally a global registry keyed by `<pluginId>:<commandId>`. Commands fire through callbacks; `checkCallback` lets a command conditionally appear/run. |
| **Command palette** | `Ctrl/Cmd+Shift+P`. Shows declared commands filtered by `when` clauses on the `commandPalette` menu. | `Ctrl/Cmd+P`. Shows all registered commands; conditional visibility via `checkCallback` returning false. |
| **Keybindings** | `contributes.keybindings` (default key + `when` clause). User overrides in `keybindings.json`. | `hotkeys` array in `addCommand` is a *suggested default* (Obsidian historically ships plugin commands with **no default hotkey** to avoid conflicts); user assigns hotkeys in Settings → Hotkeys. |
| **Conflict handling** | Layered resolution by `when` context + specificity; last-wins for identical context; user keybindings override defaults. Conflicts are silent but inspectable in the Keyboard Shortcuts editor. | Obsidian avoids conflicts mostly by **not assigning defaults**; if two commands share a hotkey the user resolves it in the Hotkeys UI. |

**Key divergence:** VS Code's command system is a first-class IPC bus (commands are how extensions call each other and the core). Obsidian's commands are more UI-facing (palette + hotkeys) and less of an inter-plugin RPC mechanism. VS Code resolves keybinding conflicts via rich `when`-context layering; Obsidian sidesteps conflicts by shipping no defaults.

---

## 9. Distribution

| Axis | VS Code | Obsidian |
|---|---|---|
| **Package format** | `.vsix` (zip of the extension + manifest), built with `vsce`/`@vscode/vsce` | Plain folder / GitHub release containing `manifest.json`, `main.js`, optional `styles.css` |
| **Marketplace** | **Visual Studio Marketplace** (Microsoft-hosted), or Open VSX (open alternative used by VSCodium/forks). Publisher accounts, verified publishers. | **Community Plugins** browser inside the app, backed by a central `obsidian-releases` GitHub repo (`community-plugins.json`) that points at each plugin's GitHub releases. |
| **Submission/review** | Self-publish to Marketplace; automated malware/secret scanning + policy checks; no mandatory human code review for every release | **Mandatory human review** of the source on *first* submission (PR to `obsidian-releases`), open-source requirement, guideline checklist. Subsequent updates are author-pushed GitHub releases (not re-reviewed each time). |
| **Discovery** | In-app Extensions view (search, ratings, install counts, categories) | In-app Community Plugins browser (search, downloads, by-author) |
| **Install** | One click; downloads `.vsix`, unpacks to extensions dir, registers contributions | One click; downloads release assets into `.obsidian/plugins/<id>/`, then user must **enable** + accept the third-party consent gate |
| **Updates** | Auto-update by default against Marketplace versions; respects `engines.vscode` | In-app update check against the releases repo; `versions.json` + `minAppVersion` decide which version a given app build may install |

**Key divergence:** VS Code = centralized marketplace, self-publish, automated scanning, frictionless auto-update. Obsidian = GitHub-backed list, **human source review on entry**, open-source mandate, user-enable + consent gate. Obsidian buys trust with human review *because* it has no sandbox; VS Code buys it with isolation + scanning *because* it can't human-review at its scale.

---

## Design lessons for a new shell

Opinionated takeaways for a **local-first** extensible desktop shell. Where the two diverge, I name which way to lean and why.

1. **Manifest: go thick (VS Code-style), not thin.** Declare contributions statically in the manifest so the core can build menus/commands/views/settings UI *before any extension code runs*. This gives you instant, inspectable UI, lets you wake extensions lazily, and makes the system auditable. Obsidian's thin manifest is simpler to write but forfeits lazy loading and pre-run introspection. **Lean VS Code.**

2. **Split "describe" from "do."** Declarative contribution points for *surface* (this command exists, this view exists, this setting exists), imperative registration for *behavior* (here's the handler/provider). This single decision is what makes lazy activation, conflict detection, and a stable UI possible. **Lean VS Code, hard.**

3. **Lazy activation is the startup-cost answer — adopt activation events.** Even local-first shells accumulate plugins. Derive activation events *implicitly* from the manifest (modern VS Code does this) so authors don't hand-maintain them, and provide an `onStartupFinished`-style off-critical-path slot plus a discouraged `*`/eager mode. Obsidian's eager-load model degrades linearly and lets one plugin jank the whole UI. **Lean VS Code**, but keep the *authoring* as ergonomic as Obsidian's `onload`.

4. **Decide the trust boundary on day one — it dictates everything else (axis a).** This is the central fork:
   - **Obsidian model (full-access renderer):** synchronous rich API, zero IPC, plugins touch the DOM and Node directly. Maximum author productivity and performance; **zero containment.** Viable only if (a) you're truly local-first/single-user, (b) plugins are open-source + human-reviewed, and (c) users accept an explicit "third-party code runs with full access" consent gate.
   - **VS Code model (isolated extension host):** separate process, async RPC, no DOM access, Workspace Trust degradation. Containment and crash isolation; **high framework complexity, everything async.**
   - **Recommendation:** For a local-first author/creator tool, start **Obsidian-leaning** (renderer-loaded, full-access, human-reviewed, consent-gated) for speed of building the ecosystem — but **architect the API as if a boundary exists**: keep DOM access behind framework primitives (give plugins a `containerEl` and CSS-variable contract, not free reign over your shell chrome), route all capability through your API rather than letting plugins reach internals. That preserves the *option* to insert a process/worker boundary later for untrusted extensions without breaking the API. Don't paint yourself into Obsidian's "plugins use undocumented internals" corner.

5. **Keep the API stable by physically gating experiments (axis b).** Adopt VS Code's **Proposed API** pattern: stable surface is **append-only and never breaks**; anything experimental lives behind an opt-in flag, is usable only in dev builds, and is **unpublishable** until finalized. This lets you evolve aggressively without ecosystem breakage and without relying on social contract. Obsidian's "documented stable + tolerated internal" approach leaks and breaks plugins on updates — avoid it. **Lean VS Code.** Provide a single typed module (`@types/yourshell`) injected at runtime; never make the host API a real npm dependency.

6. **Use a host-version floor AND a range.** Combine Obsidian's `minAppVersion` (clear floor, with a `versions.json`-style map for back-installs) with VS Code's `engines.<host>` semver range so the core refuses to load extensions that need newer API. Cheap insurance against "works on my version" support load.

7. **UI: give a div + a CSS-variable theming contract, and make theme-compliance the path of least resistance.** Both apps converge here: expose design tokens as CSS variables (`--text-normal`, `--accent`, `--bg-primary`...) and ship base classes so plugins inherit theming for free. For anything you want sandboxed or that comes from untrusted sources, use a **webview/iframe + postMessage** (VS Code) rather than direct DOM. **Blend:** Obsidian-style direct DOM for trusted first-party-ish plugins, VS Code-style webview for untrusted/marketplace ones.

8. **Settings: separate config (schema-declared, scoped, auto-rendered UI) from data and secrets.** Adopt VS Code's split — declarative `configuration` schema that the core renders into a settings UI, plus a separate key-value state store and a **real secret store backed by the OS keychain**. Obsidian's single `data.json` with no secret store is a known weakness; don't repeat it. Namespace everything per-extension and store plugin data under a predictable per-extension dir. For local-first, keep config in a location that rides along with the user's data so it syncs naturally (Obsidian's one genuinely good idea here).

9. **Command system = make it an internal RPC bus, not just a palette.** Follow VS Code: a global command registry where commands are how extensions call the core *and each other* (`executeCommand`). This becomes your primary inter-extension integration mechanism and keeps coupling loose. Pair with a command palette and `when`-context-gated visibility.

10. **Keybindings: ship no defaults, then resolve by context.** Borrow Obsidian's "no default hotkeys for plugin commands" to avoid the conflict explosion, but implement VS Code's `when`-context layered resolution + a user-facing shortcut editor for the cases where defaults *are* worth shipping (first-party/core commands). Conflicts should be silent-but-inspectable, never silently broken.

11. **Distribution: centralized list + human review on entry is the right local-first default.** At small/medium scale, Obsidian's model wins: a Git-backed plugin index, **open-source requirement**, **human source review on first submission**, author-pushed updates, and an in-app browser. It substitutes human review for a sandbox you may not have yet. Add VS Code-style touches as you grow: automated secret/malware scanning on each release, verified publishers, and an Open-VSX-style open index so forks/self-hosters aren't locked out. Always gate first-enable behind an explicit consent dialog given the full-access trust model.

12. **Provide a deactivation/cleanup contract and enforce it.** Both apps converge on disposables (VS Code `context.subscriptions`, Obsidian `this.register*`). Make the framework own teardown: every registration returns/records a disposable that the core auto-disposes on unload, so hot-reload and disable/enable are clean. This is non-negotiable for a runtime-module shell — without it, enable/disable leaks listeners and DOM nodes.

### The two divergences in one line each
- **(a) Full-access renderer vs. isolated host:** Obsidian trades all containment for simplicity/perf and pays for safety with human review + consent; VS Code trades simplicity for crash/security isolation and pays with async complexity. A local-first shell can *start* Obsidian-style but should keep the API boundary-ready so it can grow toward VS Code-style isolation for untrusted code.
- **(b) Stable-yet-evolving API:** VS Code physically fences experiments behind an unpublishable Proposed-API flag and keeps stable append-only; Obsidian relies on a documented-stable + tolerated-internal social contract that leaks. Choose VS Code's mechanism — it's the difference between an ecosystem that survives your refactors and one that breaks every release.
