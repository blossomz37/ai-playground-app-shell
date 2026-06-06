A **three-pane desktop application shell** — the canonical "IDE layout" (think VS Code, Obsidian, or a native macOS document editor). It's organized as a stable outer *chrome* (persistent framing) wrapping a flexible working area. Here's the vocabulary they'd reach for, region by region:

**Title bar / top chrome** — The traffic-light controls on the left mark this as a macOS-native or Electron window. The band splits into three zones: window controls, an app/document title (centered), and a global controls cluster on the right.

**Secondary bar / context strip** — The second row is a sub-header carrying *navigational context*: a mode or workspace switcher ("MODE/ROOM"), a **breadcrumb** trail showing location within the hierarchy, and an inspector toggle. Designers call this the command/context bar — it tells you *where you are* and *what mode you're in*.

**Left sidebar — primary navigation** — A **source list** or file-tree pane (the "navigator" in IDE terms). Your annotations describe its behavior precisely: collapsible, resizable (draggable splitter), independently scrollable, open by default. This is the persistent wayfinding rail.

**Center — editing canvas** — The **primary workspace** or document canvas, topped by a contextual **editing toolbar** (formatting/actions scoped to the content). It's the focal region — resizable, scrollable, always visible. Everything else is subordinate chrome around this.

**Right sidebar — inspector / utility panel** — A contextual **inspector** (Apple's term) or properties/utility panel surfacing "information & options" for the current selection. Collapsible and *closed by default*, which signals it's progressive-disclosure: summoned when needed, hidden otherwise to keep the canvas dominant.

**Status bar / bottom chrome** — A persistent footer split into three: settings access, live document metrics (word count and stats), and a connection/activity indicator. Classic **status bar** pattern — ambient, glanceable state that never demands attention.

The shorthand: a **navigator–canvas–inspector triptych** bracketed by a title bar and status bar, with both side rails collapsible/resizable and the canvas as the anchored focal point. It's a *focus-preserving* layout — chrome and panels flex around a protected central writing surface, which is exactly what you want for a long-form editor.

