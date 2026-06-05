// ──────────────────────────────────────────────
// File:        contextmenu.ts
// Description: Renderer-side context menu state store
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import { writable } from 'svelte/store'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: string
  args?: unknown[]
  disabled?: boolean
  separator?: boolean
}

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}

export const contextMenu = writable<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  items: []
})

export function showContextMenu(x: number, y: number, items: ContextMenuItem[]): void {
  contextMenu.set({ visible: true, x, y, items })
}

export function hideContextMenu(): void {
  contextMenu.update(s => ({ ...s, visible: false }))
}
