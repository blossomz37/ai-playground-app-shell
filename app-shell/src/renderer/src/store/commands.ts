// Renderer-side command layer — the UI/runtime of the Commands primitive.
// Owns the command catalog (declared in module manifests), a renderer-side
// handler registry, command execution, the Cmd+K palette state, and the
// keybinding runtime.
//
// Two homes for a command handler:
//   - main handler   (ctx.commands.register in a module's activate) = programmatic
//   - renderer handler (registerCommand here, from a view)          = interactive,
//     uses live renderer state (e.g. the open editor's content)
// executeCommand() prefers a renderer handler, else falls through to main via IPC.

import { writable, derived, get } from 'svelte/store'
import type { CommandCatalogEntry, Disposable } from '@shared/module-contract'

export const commandCatalog = writable<CommandCatalogEntry[]>([])
export const paletteOpen = writable<boolean>(false)

export async function loadCommands(): Promise<void> {
  commandCatalog.set(await window.shell.commands.list())
}

// --- Renderer handler registry -------------------------------------------------

const rendererHandlers = new Map<string, (...args: unknown[]) => unknown>()

export function registerCommand(id: string, handler: (...args: unknown[]) => unknown): Disposable {
  rendererHandlers.set(id, handler)
  return { dispose() { rendererHandlers.delete(id) } }
}

export async function executeCommand(id: string, ...args: unknown[]): Promise<unknown> {
  const local = rendererHandlers.get(id)
  if (local) return local(...args)
  return window.shell.commands.execute(id, ...args)
}

// --- Keybinding runtime --------------------------------------------------------

// Canonical chord string: modifiers in fixed order + lowercased key, e.g. "meta+s".
function eventChord(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.metaKey) parts.push('meta')
  if (e.ctrlKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

function bindingChord(binding: string): string {
  const tokens = binding.split('+').map(t => t.trim().toLowerCase())
  const key = tokens.pop() ?? ''
  const mods = new Set<string>()
  for (const t of tokens) {
    if (t === 'cmd' || t === 'cmdorctrl' || t === 'command' || t === 'meta') mods.add('meta')
    else if (t === 'ctrl' || t === 'control') mods.add('ctrl')
    else if (t === 'alt' || t === 'opt' || t === 'option') mods.add('alt')
    else if (t === 'shift') mods.add('shift')
  }
  const order = ['meta', 'ctrl', 'alt', 'shift'].filter(m => mods.has(m))
  order.push(key)
  return order.join('+')
}

// chord -> command id, derived from the declared catalog.
const keymap = derived(commandCatalog, ($catalog) => {
  const map: Record<string, string> = {}
  for (const c of $catalog) {
    if (c.keybinding) map[bindingChord(c.keybinding)] = c.id
  }
  return map
})

// Global keydown dispatcher. Wired via <svelte:window> in AppShell.
export function handleGlobalKeydown(e: KeyboardEvent): void {
  // Built-in shell binding: Cmd/Ctrl+K toggles the command palette.
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    paletteOpen.update(v => !v)
    return
  }

  // While the palette is open it owns its keys.
  if (get(paletteOpen)) return

  const id = get(keymap)[eventChord(e)]
  if (id) {
    e.preventDefault()
    void executeCommand(id)
  }
}
