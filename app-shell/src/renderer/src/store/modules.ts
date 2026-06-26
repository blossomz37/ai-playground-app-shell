import { get } from 'svelte/store'
import { writable } from 'svelte/store'
import type { ModuleListItem } from '@shared/module-contract'
import { FALLBACK_MODULE_ID } from '@shared/module-policy'
import { activeModuleId } from './active-module'
import { loadCommands } from './commands'
import { setModulePolicySnapshot } from '../modules/module-state-registry'

export const moduleList = writable<ModuleListItem[]>([])

export const PROJECTS_MODULE_ID = 'shell.projects'

const PROJECTS_MODULE: ModuleListItem = {
  id: PROJECTS_MODULE_ID,
  name: 'Projects',
  icon: 'briefcase',
  category: 'required',
  required: true,
  canDisable: false,
  canHide: false,
  visible: true,
  enabled: true,
  activated: true
}

export async function loadModules(): Promise<ModuleListItem[]> {
  const modules = [PROJECTS_MODULE, ...await window.shell.modules.list()]
  setModulePolicySnapshot(modules)
  moduleList.set(modules)
  ensureActiveModuleAvailable(modules)
  return modules
}

export async function setModuleEnabled(id: string, enabled: boolean): Promise<void> {
  await window.shell.modules.setEnabled(id, enabled)
  await Promise.all([loadModules(), loadCommands()])
}

export async function setModuleVisible(id: string, visible: boolean): Promise<void> {
  await window.shell.modules.setVisible(id, visible)
  await loadModules()
}

export function getModuleInfo(moduleId: string | null | undefined): ModuleListItem | undefined {
  if (!moduleId) return undefined
  return get(moduleList).find(module => module.id === moduleId)
}

export function isModuleReachable(moduleId: string | null | undefined): boolean {
  const module = getModuleInfo(moduleId)
  return Boolean(module?.enabled && module.visible)
}

export function ensureActiveModuleAvailable(modules = get(moduleList)): void {
  const activeId = get(activeModuleId)
  if (activeId && modules.some(module => module.id === activeId && module.enabled && module.visible)) return

  const fallback = modules.find(module => module.id === FALLBACK_MODULE_ID && module.enabled && module.visible)
  activeModuleId.set(fallback?.id ?? modules.find(module => module.enabled && module.visible)?.id ?? null)
}
