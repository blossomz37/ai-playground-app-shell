# Shell Decision Questionnaire

The job of this document is to convert research into committed specs. Each question isolates one decision, states why it matters, lays out the realistic options with their trade-off, and records a lean (my recommendation given what I know about how you work — fast iteration, local-first, indie, existing Electron/Svelte experience). Cross out the lean and write your own answer; the answer is what becomes spec.

Work top-down. **Tier 1 gates everything below it** — don't answer Tier 3 before Tier 1 is settled, or you'll redo it.

---

## Tier 1 — Foundational (these constrain every later choice)

### Q1. What is the *first real app* you'll build on this shell?
**Why it matters:** A shell built in the abstract grows features nothing uses. Building one concrete app *through* the shell is what reveals which primitives are real. The spec already leans toward a writing/AI workspace — name the actual first product.
- **A.** A specific app you already want (e.g. an NPE story-development workspace, a prompt-sequencing studio).
- **B.** A generic "demo" app just to exercise the shell.

> **Lean: A.** Pick the app you'd build anyway. The shell falls out of it. B produces a shell that fits nothing.

**Your answer:**

---

### Q2. Single app, or genuinely multi-app from day one?
**Why it matters:** This is the core promise in your brief — "fork the shell into a different app." It decides your repo structure and whether "which modules ship" is a build-time or runtime concern.
- **A. Build-time forks.** One core package; each app is a separate build that bundles a chosen module set. Forking = a new build config. Simpler; apps can't reconfigure themselves.
- **B. Runtime modules.** One app binary; modules are enabled/disabled live by the user (the Obsidian/VS Code model). Far more powerful; far more architecture (loading, sandboxing, API versioning).
- **C. Both** — runtime modules, *and* you can also produce a stripped build that hardcodes a module set.

> **Lean: start A, design toward B.** Ship build-time forks first (fast), but keep the module contract clean enough that runtime loading is a later addition, not a rewrite. C is the honest end state.

**Your answer:**

---

### Q3. Who writes modules — only you, or third parties too?
**Why it matters:** This single answer decides whether you need a security sandbox at all. Trusted-author-only modules can run with full access (simple). Third-party modules mean untrusted code, which forces a permission/isolation model — the hardest part of the whole system.
- **A. Just you (and maybe a small trusted circle).** No sandbox needed; modules get full access.
- **B. Third-party / community modules.** Requires the permission + capability service in the spec to be real, with teeth.

> **Lean: A for now.** Obsidian itself runs community plugins with *full* renderer access and accepts the risk; you can defer sandboxing until you actually open the doors. But write the permission *declarations* into the manifest from day one (Q-module-contract) so the data exists when you need to enforce it.

**Your answer:**

---

## Tier 2 — Architecture (settle once Tier 1 is fixed)

### Q4. Desktop runtime: Tauri, Electron, or web/PWA?
**Why it matters:** Decides bundle size, native file-system access, the security model, and how much Rust you touch. The architecture configurator in `ideas/` covers the basics; the security angle (Q3) is the tiebreaker the configurator misses.
- **Electron** — Node.js everywhere, huge ecosystem, you already know it, consistent rendering. Heavy bundle; broad attack surface if you ever run untrusted modules.
- **Tauri** — tiny bundle, Rust core, capability-based security allowlist (a natural fit if Q3→B). Steeper if you don't write Rust; uses the OS webview so rendering varies by platform.
- **Web/PWA** — no desktop runtime, but file-system access is heavily restricted — likely disqualifying for a local-first file-backed workspace.

> **Lean: Electron now, given your existing fluency and that Q3 leans single-author.** Revisit Tauri *if and when* you commit to third-party modules — its capability model would do real work there.

**Your answer:**

---

### Q5. Frontend framework?
**Why it matters:** It's the language your modules' UI is written in, so it's a contract, not just a preference — hard to change later without breaking every module.
- **Svelte/SvelteKit** — lean, fast, you have tooling for it; smaller component ecosystem.
- **React** — largest ecosystem and hiring pool, most prior-art shells; heavier.
- **Vue / Vanilla** — viable but less aligned with your existing work.

> **Lean: Svelte**, matching your current stack — unless you expect to lean heavily on existing React component libraries inside modules.

**Your answer:**

---

### Q6. Document & persistence model? *(spec open question)*
**Why it matters:** Shapes search, sync, conflict handling, and how "local-first" actually feels. This is the decision most likely to be expensive to reverse.
- **A. Files-as-source-of-truth** (Obsidian model) — documents are real files on disk; the app is a viewer/editor over them. Maximally portable, user owns the data, plays well with git/Obsidian/other tools you use.
- **B. Database-backed** (Notion model) — a local DB (SQLite) is the truth; files are exports. Richer relations/queries; data is locked in the app's format.
- **C. Hybrid** — files are truth, a DB is a rebuildable *index/cache* over them for search and relations.

> **Lean: C.** Files stay the truth (fits your Obsidian/indie-publishing world and the local-first principle), with SQLite as a disposable index. Best of both; the index can be deleted and rebuilt without data loss.

**Your answer:**

---

### Q7. Panel/layout model: fixed zones or module-defined zones? *(spec open question)*
**Why it matters:** Determines how much layout freedom modules get vs. how consistent the shell stays. Total freedom → every module reinvents layout and the "same mental model across apps" principle dies.
- **A. Fixed zones.** Shell defines slots (sidebar / main / inspector / bottom utility); modules fill them. Consistent, constrained — the VS Code approach.
- **B. Module-defined zones.** Modules can carve new regions. Flexible, but consistency and persistence get hard.

> **Lean: A.** Fixed, named zones. It directly serves your "consistent panel grammar" UX rule. Revisit only if a concrete module genuinely can't fit.

**Your answer:**

---

### Q8. How do modules load? *(spec open question)*
**Why it matters:** Bundled = simplest and most secure; from-disk = the real plugin experience but needs discovery, validation, and versioning.
- **A. Bundled at build time** (pairs with Q2→A).
- **B. Loaded from a plugins folder at runtime** (pairs with Q2→B; the Obsidian model).
- **C. Both.**

> **Lean: follow Q2.** If Q2 is "start A, design toward B," then load bundled now but define the manifest + lifecycle as if disk-loading already existed.

**Your answer:**

---

## Tier 3 — Refinement (safe to defer; revisit after a first build)

### Q9. Theming contract
Are design tokens a private stylesheet, or a documented, module-facing API (so a fork's re-theme propagates to every module)? *(Lean: a documented token API — see the reframing of `single-file-css.md`. This is what makes the "fork into a new app" promise visible.)*

**Your answer:**

### Q10. Target platforms
macOS only first, or cross-platform (Win/Linux) from the start? *(Lean: macOS-first to move fast; keep nothing platform-specific in the core so cross-platform stays cheap later.)*

**Your answer:**

### Q11. Distribution & updates
How does an app ship and update — manual, GitHub releases, auto-updater? *(Lean: defer. GitHub releases for early builds; add an auto-updater once you have outside users.)*

**Your answer:**

---

## How to use the answers

Once Tier 1 + Tier 2 are filled in, they replace the "Open questions" sections in `docs/architecture/shell-platform-spec.md` and seed the detail in `docs/architecture/shell-spec.md` (the shell contract) and `docs/architecture/modules-overview.md` (the first module set, anchored to your Q1 answer).
