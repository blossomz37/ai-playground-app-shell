import type { Module, ModuleContext } from '@shared/module-contract'
import { createModuleContext } from './context'

interface ModuleRecord {
  module: Module
  enabled: boolean
  activated: boolean
  ctx?: ModuleContext
}

const registry = new Map<string, ModuleRecord>()

export const moduleRegistry = {
  register(module: Module): void {
    registry.set(module.manifest.id, { module, enabled: false, activated: false })
  },

  enable(id: string): void {
    const r = registry.get(id)
    if (r) r.enabled = true
  },

  async activate(id: string): Promise<void> {
    const r = registry.get(id)
    if (!r || r.activated) return
    const ctx = createModuleContext(id, { id: 'ws-default', type: 'authoring', root: process.env.HOME ?? '/' })
    r.ctx = ctx
    await r.module.activate(ctx)
    r.activated = true
  },

  async deactivate(id: string): Promise<void> {
    const r = registry.get(id)
    if (!r || !r.activated) return
    await r.module.deactivate?.()
    r.activated = false
  },

  list(): Array<{ id: string; name: string; icon: string; enabled: boolean; activated: boolean }> {
    return Array.from(registry.values()).map(r => ({
      id: r.module.manifest.id,
      name: r.module.manifest.name,
      icon: r.module.manifest.contributes.zones?.railEntry?.icon ?? 'circle',
      enabled: r.enabled,
      activated: r.activated
    }))
  }
}
