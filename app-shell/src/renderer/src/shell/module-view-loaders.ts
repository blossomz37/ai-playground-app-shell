import type { Component } from 'svelte'

type Zone = 'navigation' | 'main' | 'inspector'
type ModuleComponent = Component<Record<string, never>>
type Loader = () => Promise<{ default: ModuleComponent }>

const loaders: Record<Zone, Record<string, Loader>> = {
  navigation: {
    'shell.projects': () => import('./projects/ProjectsNavView.svelte'),
    'shell.documents': () => import('../modules/documents/NavView.svelte'),
    'shell.journal': () => import('../modules/journal/NavView.svelte'),
    'shell.assets': () => import('../modules/assets/NavView.svelte'),
    'shell.workflow': () => import('../modules/workflow/NavView.svelte'),
    'shell.aichat': () => import('../modules/aichat/NavView.svelte'),
    'shell.web': () => import('../modules/web/NavView.svelte'),
    'shell.promptstudio': () => import('../modules/promptstudio/NavView.svelte')
  },
  main: {
    'shell.projects': () => import('./projects/ProjectsMainView.svelte'),
    'shell.documents': () => import('../modules/documents/MainView.svelte'),
    'shell.journal': () => import('../modules/journal/MainView.svelte'),
    'shell.assets': () => import('../modules/assets/MainView.svelte'),
    'shell.workflow': () => import('../modules/workflow/MainView.svelte'),
    'shell.tableview': () => import('../modules/tableview/MainView.svelte'),
    'shell.aichat': () => import('../modules/aichat/MainView.svelte'),
    'shell.web': () => import('../modules/web/MainView.svelte'),
    'shell.promptstudio': () => import('../modules/promptstudio/MainView.svelte')
  },
  inspector: {
    'shell.projects': () => import('./projects/ProjectsInspectorView.svelte'),
    'shell.documents': () => import('../modules/documents/InspectorView.svelte'),
    'shell.journal': () => import('../modules/journal/InspectorView.svelte'),
    'shell.assets': () => import('../modules/assets/InspectorView.svelte'),
    'shell.workflow': () => import('../modules/workflow/InspectorView.svelte'),
    'shell.tableview': () => import('../modules/tableview/InspectorView.svelte'),
    'shell.aichat': () => import('../modules/aichat/InspectorView.svelte'),
    'shell.web': () => import('../modules/web/InspectorView.svelte'),
    'shell.promptstudio': () => import('../modules/promptstudio/InspectorView.svelte')
  }
}

const cache = new Map<string, ModuleComponent | null>()

export async function loadModuleView(moduleId: string | null, zone: Zone): Promise<ModuleComponent | null> {
  if (!moduleId) return null

  const cacheKey = `${zone}:${moduleId}`
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null

  const loader = loaders[zone][moduleId]
  if (!loader) {
    cache.set(cacheKey, null)
    return null
  }

  const component = (await loader()).default
  cache.set(cacheKey, component)
  return component
}
