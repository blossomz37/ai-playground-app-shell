// ──────────────────────────────────────────────
// File:        layout.ts
// Description: Layout manager — persist/restore panel sizes and visibility
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      antigravity
// ──────────────────────────────────────────────

import type { LayoutState } from '@shared/module-contract'
import { createSettingsStore } from './settings'

const SETTINGS_KEY = 'layout'

const DEFAULTS: LayoutState = {
  sidebarWidth: 240,
  inspectorWidth: 280,
  sidebarVisible: true,
  inspectorVisible: true,
  zenMode: false
}

const store = createSettingsStore('shell')

// Pre-zen visibility state — kept in memory so we can restore after exiting zen.
let preZenSidebar = true
let preZenInspector = true

/**
 * Layout manager service.
 *
 * Persists panel sizes and visibility to `shell_settings` (key: `shell.layout`).
 * The renderer reads the state on mount and applies it to the CSS grid.
 *
 * Spec: 1-shell-spec.md §2, 0-shell-platform-spec.md §4.
 */
export const layoutService = {
  /** Get the current layout state, falling back to defaults. */
  get(): LayoutState {
    const saved = store.get<LayoutState>(SETTINGS_KEY)
    return saved ? { ...DEFAULTS, ...saved } : { ...DEFAULTS }
  },

  /** Partially update layout state and persist. */
  set(partial: Partial<LayoutState>): LayoutState {
    const current = this.get()
    const next = { ...current, ...partial }
    store.set(SETTINGS_KEY, next)
    return next
  },

  /** Toggle a zone's visibility and persist. */
  toggle(zone: 'sidebar' | 'inspector'): LayoutState {
    const current = this.get()
    const key = zone === 'sidebar' ? 'sidebarVisible' : 'inspectorVisible'
    return this.set({ [key]: !current[key] })
  },

  /** Resize a zone (in px) and persist. */
  resize(zone: 'sidebar' | 'inspector', px: number): LayoutState {
    const key = zone === 'sidebar' ? 'sidebarWidth' : 'inspectorWidth'
    // Clamp to reasonable bounds
    const clamped = Math.max(120, Math.min(600, px))
    return this.set({ [key]: clamped })
  },

  /** Toggle zen mode — hide everything except the main pane, or restore. */
  toggleZen(): LayoutState {
    const current = this.get()
    if (current.zenMode) {
      // Exiting zen — restore pre-zen visibility
      return this.set({
        zenMode: false,
        sidebarVisible: preZenSidebar,
        inspectorVisible: preZenInspector
      })
    } else {
      // Entering zen — store current visibility, hide panels
      preZenSidebar = current.sidebarVisible
      preZenInspector = current.inspectorVisible
      return this.set({
        zenMode: true,
        sidebarVisible: false,
        inspectorVisible: false
      })
    }
  }
}

