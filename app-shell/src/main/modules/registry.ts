import type { ActivationRule, CommandCatalogEntry, Module } from '@shared/module-contract'
import { createModuleContext, type DisposableModuleContext } from './context'
import { createSettingsStore } from '../core/settings'

// ── Types ──────────────────────────────────────────────────────────────────

interface ModuleRecord {
  module: Module
  enabled: boolean
  activated: boolean
  ctx?: DisposableModuleContext
}

/** Trigger context passed to rule evaluation. */
export type ActivationTrigger =
  | { kind: 'railClick'; moduleId: string }
  | { kind: 'command'; commandId: string }
  | { kind: 'workspaceType'; type: string }
  | { kind: 'fileType'; ext: string }

// ── State ──────────────────────────────────────────────────────────────────

const registry = new Map<string, ModuleRecord>()
const shellSettings = createSettingsStore('modules')
const ENABLED_KEY = 'enabled'

// ── Helpers ────────────────────────────────────────────────────────────────

/** Check if a single activation rule matches the given trigger. */
function ruleMatches(rule: ActivationRule, trigger: ActivationTrigger): boolean {
  switch (trigger.kind) {
    case 'railClick':
      // A rail click always satisfies userEnable (the user explicitly picked this module).
      return rule.on === 'userEnable'
    case 'command':
      return (rule.on === 'command' && rule.commandId === trigger.commandId)
          || rule.on === 'userEnable' // executing a module's command is implicit first-use
    case 'workspaceType':
      return rule.on === 'workspaceType' && rule.type === trigger.type
    case 'fileType':
      return rule.on === 'fileType' && rule.ext === trigger.ext
  }
}

/** Does the module's manifest have at least one rule matching the trigger? */
function matchesAny(rules: ActivationRule[], trigger: ActivationTrigger): boolean {
  return rules.some(r => ruleMatches(r, trigger))
}

// ── Registry API ───────────────────────────────────────────────────────────

export const moduleRegistry = {
  // ── Lifecycle ──────────────────────────────────────────────────────────

  register(module: Module): void {
    registry.set(module.manifest.id, { module, enabled: false, activated: false })
  },

  /**
   * Restore enabled-module set from persistence.
   * On first launch (no persisted state), all registered modules default to enabled.
   */
  restoreEnabledState(): void {
    const persistedEnabled = shellSettings.get<string[]>(ENABLED_KEY)
    const persistedKnown = shellSettings.get<string[]>('known_modules')
    
    if (persistedEnabled) {
      const enabledSet = new Set(persistedEnabled)
      const knownSet = persistedKnown ? new Set(persistedKnown) : enabledSet
      
      for (const [id, r] of registry) {
        if (!knownSet.has(id)) {
          r.enabled = true // New module auto-enables
        } else {
          r.enabled = enabledSet.has(id)
        }
      }
      this._persistEnabled()
    } else {
      // First launch — enable everything and persist
      for (const r of registry.values()) r.enabled = true
      this._persistEnabled()
    }
  },

  enable(id: string): void {
    const r = registry.get(id)
    if (r) {
      r.enabled = true
      this._persistEnabled()
    }
  },

  disable(id: string): void {
    const r = registry.get(id)
    if (r) {
      r.enabled = false
      this._persistEnabled()
    }
  },

  /**
   * Demand-activate a module. Idempotent — no-op if already activated.
   * Only enabled modules may be activated.
   */
  async ensureActivated(id: string): Promise<void> {
    const r = registry.get(id)
    if (!r || r.activated || !r.enabled) return
    const ctx = createModuleContext(id, { id: 'ws-default', type: 'authoring', root: process.env.HOME ?? '/' })
    r.ctx = ctx
    await r.module.activate(ctx)
    r.activated = true
  },

  /** Activate all enabled modules whose rules match a workspaceType trigger. */
  async activateByWorkspaceType(type: string): Promise<void> {
    const trigger: ActivationTrigger = { kind: 'workspaceType', type }
    for (const [id, r] of registry) {
      if (r.enabled && !r.activated && matchesAny(r.module.manifest.activation, trigger)) {
        await this.ensureActivated(id)
      }
    }
  },

  async deactivate(id: string): Promise<void> {
    const r = registry.get(id)
    if (!r || !r.activated) return
    await r.module.deactivate?.()
    r.ctx?._disposeAll()
    r.ctx = undefined
    r.activated = false
  },

  // ── Queries ────────────────────────────────────────────────────────────

  list(): Array<{ id: string; name: string; icon: string; enabled: boolean; activated: boolean }> {
    return Array.from(registry.values()).map(r => ({
      id: r.module.manifest.id,
      name: r.module.manifest.name,
      icon: r.module.manifest.contributes.zones?.railEntry?.icon ?? 'circle',
      enabled: r.enabled,
      activated: r.activated
    }))
  },

  /**
   * Declared commands across all registered modules. Per the contract, the
   * palette lists commands from the manifest before a module's code runs, so
   * this is not gated on activation.
   */
  commands(): CommandCatalogEntry[] {
    const out: CommandCatalogEntry[] = []
    for (const r of registry.values()) {
      for (const c of r.module.manifest.contributes.commands ?? []) {
        out.push({ id: c.id, title: c.title, keybinding: c.keybinding, moduleId: r.module.manifest.id })
      }
    }
    return out
  },

  /**
   * Find the module that declares a command. Used by the IPC command executor
   * to demand-activate the owning module before running the handler.
   */
  findModuleForCommand(commandId: string): string | undefined {
    for (const r of registry.values()) {
      if (r.module.manifest.contributes.commands?.some(c => c.id === commandId)) {
        return r.module.manifest.id
      }
    }
    return undefined
  },

  // ── Internal ───────────────────────────────────────────────────────────

  _persistEnabled(): void {
    const enabledIds = Array.from(registry.entries())
      .filter(([, r]) => r.enabled)
      .map(([id]) => id)
    const allIds = Array.from(registry.keys())
    
    shellSettings.set(ENABLED_KEY, enabledIds)
    shellSettings.set('known_modules', allIds)
  }
}
