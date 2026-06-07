NOTE: Claude agent only had a screenshot of the current UI, so this feedback is based on that and general UI/UX principles for an agent browser. Some details do not apply but can be considered in terms of the user being confused about what can happen in the web browser room.

---

# Agent Browser — UI Feedback

Context: this is an **agent browser** (JOBS button, Hermes Agent in history, command palette), built on Electron + Svelte renderer + framework-agnostic TS core, macOS-first with a future iPad/LAN HTML client. Feedback is prioritized for that.

## P0 — Highest value

**Make the right panel contextual.** It currently spends premium space on debug telemetry (Protocol, Bookmark status, History index, Session). For an agent browser, that column should show agent activity: current job, step N of M, action log, target element, success/error. Default to Page Info when idle; flip to Agent Activity when a job runs. Cheap to do — core already emits this state, so it's a Svelte store rebind, not new plumbing.

**Move security state into the address bar.** Replace the "Protocol: HTTPS" row with a lock glyph inline in the URL bar. Core already knows the protocol.

**Fix the viewport clipping.** The right-edge clip / double scrollbar on the Wikipedia pane is almost certainly a BrowserView coordinate mismatch — BrowserView doesn't participate in DOM layout, so its `setBounds` rect must be recomputed on every resize/panel toggle and won't reflow with flexbox. Check the bounds math; consider migrating to WebContentsView (current supported path). Any agent overlay (e.g. highlighting the element about to be clicked) inherits the same coordinate problem.

## P1 — Structure & hierarchy

**Flat hierarchy.** PAGE INFO / TAB / CURRENT TAB HISTORY are identical weight, so nothing leads. Demote labels to a muted secondary color, tighten leading, anchor one element per group.

**Left-panel redundancy.** The icon rail and the Bookmarks/History panel overlap in purpose, and History is unbounded under Bookmarks in one scroll context — it'll dominate as it grows. Split into segmented tabs (Bookmarks | History). Keep the green active-dot; clarify the other rail icons.

**Inconsistent toolbar.** Top-right mixes five icon-only buttons with one text button (JOBS); a few glyphs are unclear (eye, command). If JOBS is the primary control, make it visually primary rather than a peer. Add tooltips.

## P2 — Polish

- Bookmark rows show full URLs (noise) and placeholder globe favicons — use favicon + title, resolve real favicons.
- Active tab doesn't connect to the toolbar beneath it — shared surface color or removed seam.
- Normalize spacing rhythm across the three panels.

## Cross-cutting — iPad/LAN client

The renderer is the only layer that travels to the future HTML client, so:

- Don't lean into macOS-native affordances; keep chrome CSS-driven and token-based.
- Give the rail and both side panels a defined **narrow-viewport collapse state now**, not later.
- Segmented Bookmarks|History and the contextual right panel both need responsive behavior.

## Stack notes

- Contextual panel + security glyph: trivial — core state already exists, renderer just rebinds.
- Clipping: BrowserView/WebContentsView bounds, not CSS — main-process concern.
- IA/hierarchy items: stack-agnostic.