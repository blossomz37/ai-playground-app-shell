# Shell Decision Questionnaire — Answers

_Exported 2026-05-29 from decision-questionnaire.html_

## Overrides vs. my leans

_None — all answers match the recommended lean._

---

## Tier 1 — Foundational

### Q1. What is the first real app you'll build on this shell?
- **Choice:** A — A specific app you already want
- **Matches lean:** yes
- **Notes:** I have apps in progress that lack cohesive design and shape. This often comes a blocker for me because the design is an afterthought.  Perhaps you could find the common thread or a good candidate.
  - 1. /Users/carlo/Github/draftwell-app (running now on http://localhost:60083/) 
    2. /Users/carlo/Github/manuscript-editing (running now on http://127.0.0.1:8765/) 
    3. /Users/carlo/Github/eaw-novel-builder 
    4. /Users/carlo/Github/author-workbench (running now on http://localhost:6173/) 
    5. /Users/carlo/Github/my-electron-app 
    6. /Users/carlo/Github/manuscript-editing 
    7.  https://hellbox-production.up.railway.app/ 


### Q2. Single app, or genuinely multi-app from day one?
- **Choice:** C — Both
- **Matches lean:** n/a
- **Notes:** I'm not sure what this means, so I put "Both". In plain language, I would want one repository that has everything I need for my standard shell. If I want to make a new app, then I use that as my template for other apps.

### Q3. Who writes modules — only you, or third parties too?
- **Choice:** A — Just you (and a small trusted circle)
- **Matches lean:** yes
- **Notes:** _none_

---

## Tier 2 — Architecture

### Q4. Desktop runtime: Tauri, Electron, or web/PWA?
- **Choice:** Electron — Electron
- **Matches lean:** yes
- **Notes:** Let's stick with Electron.

### Q5. Frontend framework?
- **Choice:** Svelte — Svelte / SvelteKit
- **Matches lean:** yes
- **Notes:** I put Svelte with the assumption that whatever my apps do now can be done with Svelte. Second assumption is that Svelte is well-documented and most frontier models can code and debug Svelte. If I'm wrong, then we need to reconsider.

### Q6. Document & persistence model?
- **Choice:** C — Hybrid
- **Matches lean:** yes
- **Notes:** I'll say hybrid because Obsidian's limitations are why I build apps in the first place.

### Q7. Panel/layout model: fixed zones or module-defined zones?
- **Choice:** A — Fixed zones
- **Matches lean:** yes
- **Notes:** Yes, fixed zones are exactly what I need. A standardization of left sidebar, main pane, inspector, top menu bar(s), and status bars is the norm with both VS Code and Obsidian, so I think that's a good model. Being able to resize zones, hide/toggle zones, assign hotkeys, have right-click context menus, collapsible trees/sections/cards. Those are features off the top of my head that make having a standard app shell with built-in features attractive to me.

### Q8. How do modules load?
- **Choice:** A — Bundled at build time
- **Matches lean:** n/a
- **Notes:** _none_

---

## Tier 3 — Refinement

### Q9. Theming contract
- **Choice:** API — Documented token API
- **Matches lean:** yes
- **Notes:** I'm not sure what this means. In plain language what I want is default light/dark/system option and the ability to build themes later that just work. Bonus if we can do things like change border widths, adjust spacing inside and between zones, and select fonts (and add new ones).

### Q10. Target platforms
- **Choice:** Mac — macOS only first
- **Matches lean:** yes
- **Notes:** We should always make it so that I am the target user on macOS. Bonus if we can anticipate an iPad shell that can share information over LAN. Or some kind of html access over LAN that has access to core features.

### Q11. Distribution & updates
- **Choice:** GitHub — GitHub releases
- **Matches lean:** yes
- **Notes:** I'm not that experienced with Github releases. I have done one app that way, and it was very complicated for me, but it did work.
