import { writable } from 'svelte/store'
import type { WorkspaceStatus } from '@shared/module-contract'

export const PROJECT_TYPES = ['authoring', 'research', 'default'] as const
export const PROJECT_STATUSES: WorkspaceStatus[] = ['active', 'paused', 'draft']

export type ProjectsSortMode = 'recent' | 'name' | 'type' | 'words'
export type ProjectsStatusFilter = 'all' | WorkspaceStatus | 'archived'

export const selectedProjectId = writable<string | null>(null)
export const projectsSearchQuery = writable('')
export const projectsTypeFilter = writable<string>('all')
export const projectsStatusFilter = writable<ProjectsStatusFilter>('all')
export const projectsSortMode = writable<ProjectsSortMode>('recent')
export const projectsEditMode = writable(false)
export const projectsCreateMode = writable(false)
export const projectsReturnModuleId = writable<string | null>(null)

export function setProjectsReturnModule(id: string | null): void {
  if (id && id !== 'shell.projects') {
    projectsReturnModuleId.set(id)
  }
}

export function startProjectCreate(): void {
  projectsCreateMode.set(true)
  projectsEditMode.set(false)
}

export function startProjectEdit(id: string): void {
  selectedProjectId.set(id)
  projectsCreateMode.set(false)
  projectsEditMode.set(true)
}

export function selectProject(id: string): void {
  selectedProjectId.set(id)
  projectsCreateMode.set(false)
  projectsEditMode.set(false)
}
