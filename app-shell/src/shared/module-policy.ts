export type ModuleCategory = 'required' | 'core' | 'custom'

export interface ModulePolicy {
  category: ModuleCategory
  required: boolean
  canDisable: boolean
  canHide: boolean
}

const REQUIRED_MODULE_IDS = new Set(['shell.tableview'])
const CORE_MODULE_IDS = new Set([
  'shell.documents',
  'shell.journal',
  'shell.assets',
  'shell.web'
])

export const FALLBACK_MODULE_ID = 'shell.tableview'

export function getModulePolicy(moduleId: string): ModulePolicy {
  if (REQUIRED_MODULE_IDS.has(moduleId)) {
    return {
      category: 'required',
      required: true,
      canDisable: false,
      canHide: false
    }
  }

  if (CORE_MODULE_IDS.has(moduleId)) {
    return {
      category: 'core',
      required: false,
      canDisable: false,
      canHide: true
    }
  }

  return {
    category: 'custom',
    required: false,
    canDisable: true,
    canHide: false
  }
}

export function normalizeModuleEnabled(moduleId: string, enabled: boolean): boolean {
  const policy = getModulePolicy(moduleId)
  return policy.canDisable ? enabled : true
}

export function normalizeModuleVisible(moduleId: string, visible: boolean, enabled = true): boolean {
  const policy = getModulePolicy(moduleId)
  if (policy.required) return true
  if (policy.canHide) return visible
  return enabled
}
