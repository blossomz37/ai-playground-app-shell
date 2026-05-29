# Plan 01 — The Module Contract

_Status: DRAFT — awaiting alignment before execution._
_Anchor: `0-shell-platform-spec.md` §3 (Module registration primitive), §5 (Module contract), §6 (Activation); `reference/draftwell-anchor-analysis.md` §6 (the per-room contract that dissolves `App.tsx`)._

## Goal & scope

Design the **module contract**: the single interface by which a module contributes capability to the shell. This is the keystone — until it exists, "shell" is just a layout. The deliverable is a **design specification** (TypeScript interface sketches + prose), not running code (the repo is not scaffolded; that's the deferred Option B). The contract must be concrete enough that the next slice — the Documents module — can be specced directly against it, and that scaffolding builds *to* it.

Success test: walk draftwell's **Write** room (the worst offender in the 2,470-line `App.tsx` / 100-prop `RoomSidePanel`) through the contract and show every responsibility has a declared home — no leftover "and the rest lives in the mega-component."

## The framing: a contract has three faces

A module is defined by what it **declares**, what it **provides**, and what it **receives**. Naming these three up front is the spine of the whole doc.

1. **Declares — the manifest (static data).** Per spec §5: `id`, `name`, `version`, `requiredShellVersion`, activation rules, and the *shape* of its contributions (which zones it fills, which commands/settings/document-types/jobs it brings, permissions required). Pure data — readable without running module code. The shell needs this to render e.g. a rail entry *before* the module is activated.

2. **Provides — the contributions + lifecycle (runtime).** The actual Svelte view components, command handlers, job runners, and a core-side state slice, wired up in an `activate(ctx)` / `deactivate()` lifecycle. This is what runs when an activation rule fires.

3. **Receives — the `ModuleContext` (host API).** The services the shell hands the module so it never patches shell internals (spec §3 "may not patch shell internals"): command registry, settings store, job queue, event bus, document service, notification/toast, theme tokens. A module only ever talks to the shell *through* this object.

## Approach (build order of the spec doc)

1. **State the three faces** (above) as the doc's organizing model.
2. **Manifest schema** — TS interface for the declarative half. Activation rules as a typed union (`onUserEnable` | `onWorkspaceType` | `onFileType` | `onCommand`). Permissions as a typed capability list (declared, unenforced per Q3). Contribution *declarations* keyed by the fixed zones (Q7): activity rail entry, navigation view, main view, inspector view, status-bar contribution.
3. **Contribution interface** — for each zone, what a module supplies (component ref + metadata). Plus non-view contributions: commands (id, title, handler, default keybinding, enablement), document types, jobs, settings schema.
4. **`ModuleContext` (host API)** — the surface the shell exposes: `commands.register`, `settings.get/set/onChange` (namespaced), `jobs.submit`, `events.on/emit`, `documents.*` (open/save/version via the shell pipeline), `notify`, `theme.tokens`. This is the inverse contract — the shell's promise to the module.
5. **Lifecycle & activation** — the sequence: register manifest → (rule fires) → `activate(ctx)` → contributions live → `deactivate()` tears down. Make explicit that **view component refs may live in the manifest (inert until rendered) while live wiring — subscriptions, DB queries, AI clients — happens only in `activate()`**, which is how we get lazy *activation* (§6) without lazy module *loading* (unnecessary under build-time bundling, Q8).
6. **Worked example — Documents/Write** — instantiate the contract for the Write room and map draftwell's hooks/props into manifest + contributions + state slice. This is both the validation and the bridge to plan `02-documents-module.md`.

## Key design decisions (made explicit — flagging the real forks)

- **D1 — Contract shape: declarative manifest + imperative `activate(ctx)`** (VS Code's model, not Obsidian's single-class model). Rationale: keeps the inert/declarative part (what zones, what commands exist) separable from live wiring, which we need for rail-before-activation and lazy activation. **← Want your nod on this shape before I commit the doc to it.**

- **D2 — Logic runs in-process now; the boundary stays clean so it can externalize later (RESOLVED w/ Carlo 2026-05-29).** Whether a plugin's logic runs in the same process as the UI or behind the local API is a *deployment* choice, not a *code* choice — provided the logic is written as plain framework-agnostic TypeScript that talks to its Svelte view only through a defined boundary (`ctx` + the state slice's subscribe interface), never tangled into the components. Decision: **keep it internal for v1; hold the boundary discipline; externalize whatever needs LAN reach (Q10) in a later build by moving code, not rewriting it.** This retires the reactivity-bridge "spike" risk entirely — we don't build the bridge now, we just don't foreclose it.

- **D-activation — Plugins are off by default; enabled-state persists (RESOLVED w/ Carlo 2026-05-29).** A plugin ships dormant; the user toggles it on; that on/off state is shell-level data (§8 "module registry state") persisted across sessions. `onUserEnable` is the primary activation rule; lazy activation means a toggled-on plugin still doesn't run `activate()` until actually used, so startup stays cheap.

- **D3 — Where the contract doc lands:** a new root spec `3-module-contract.md`, joining the numbered source-of-truth set; this plan stays the record of *why*. (My recommendation — say the word if you'd rather it fold into `1-shell-spec.md` §5, which is currently a stub.)

- **D4 — View granularity:** one primary view per zone, but the inspector may register multiple named collapsible sections (matches draftwell's per-room `RoomSidePanel` with sections). Decided; minor.

- **D5 — Permissions:** typed capability strings (`fs.read`, `fs.write`, `documents.write`, `ai.invoke`, `net.fetch`). Present but unenforced (Q3), so enforcement bolts on later with no manifest change. Decided; minor.

## Files / areas touched

- **New:** `3-module-contract.md` (the contract spec — the actual deliverable).
- **This plan:** `implementation/plans/01-module-contract.md`.
- **Light updates after:** `1-shell-spec.md` §5 (point to the contract doc), `2-modules-overview.md` §4 (unblock Documents), `CLAUDE.md` "Open Design Work" (mark the contract done), a new `session-handoffs/HANDOFF_02.md`.

## Risks & unknowns

- **The core↔renderer reactivity bridge (D2)** — the one real unknown. Mitigation: specify the contract shape, defer the mechanism to a scaffolding spike; don't let it block the contract.
- **Over-design** — the contract could balloon. Mitigation: anchor every interface to a draftwell responsibility; if draftwell doesn't need it, it's out of scope for v1.
- **Inspector multiplicity (D4)** — draftwell's `RoomSidePanel` is content-rich; risk of under-specifying. The worked example forces this out.

## Validation

No UI yet, so **no screenshots** this slice (the AGENTS.md screenshot rule applies to UI changes — N/A here). Validation is the **Documents/Write worked example**: a table mapping draftwell's Write-room state hooks and `RoomSidePanel` props to a home in the contract (manifest field / contribution / core state slice / `ModuleContext` call). The contract passes if that mapping is complete with no "miscellaneous" bucket.

## Out of scope

- Scaffolding the repo / any runtime code (that's Option B / a later slice).
- The full Documents module spec (plan 02 — this only proves the contract against it).
- Shell-provided primitives that aren't the contract itself: command palette UI, keybinding resolver, context-menu system (they're *consumers* of the Commands primitive; the contract defines how modules *register into* them, not their internals).
- Theming token catalog, status-bar zone design (separate slices).
