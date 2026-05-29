// ──────────────────────────────────────────────
// File:        toasts.ts
// Description: Renderer-side toast notification store — queue, auto-dismiss, limits
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import { writable } from 'svelte/store'

export interface Toast {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  createdAt: number
}

const MAX_TOASTS = 5
const DISMISS_MS: Record<Toast['level'], number | null> = {
  info: 4000,
  warn: 6000,
  error: null // manual dismiss only
}

let nextId = 0
const timers = new Map<string, ReturnType<typeof setTimeout>>()

export const toasts = writable<Toast[]>([])

export function addToast(level: Toast['level'], message: string): string {
  const id = `toast-${++nextId}`
  const toast: Toast = { id, level, message, createdAt: Date.now() }

  toasts.update(list => {
    const next = [...list, toast]
    // FIFO: drop oldest if over limit
    while (next.length > MAX_TOASTS) {
      const removed = next.shift()!
      clearTimer(removed.id)
    }
    return next
  })

  const ms = DISMISS_MS[level]
  if (ms !== null) {
    timers.set(id, setTimeout(() => dismissToast(id), ms))
  }

  return id
}

export function dismissToast(id: string): void {
  clearTimer(id)
  toasts.update(list => list.filter(t => t.id !== id))
}

function clearTimer(id: string): void {
  const t = timers.get(id)
  if (t !== undefined) {
    clearTimeout(t)
    timers.delete(id)
  }
}

/** Wire up the IPC listener for shell:notify events from main process. */
export function initToasts(): void {
  window.shell.notifications.onNotify((toast) => {
    addToast(toast.level, toast.message)
  })
}
