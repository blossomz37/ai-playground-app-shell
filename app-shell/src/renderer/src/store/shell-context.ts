import { derived, writable } from 'svelte/store'

export interface ShellContextTrailItem {
  id: string
  label: string
  commandId?: string
}

export interface ShellContextAction {
  id: string
  label: string
  commandId: string
  disabled?: boolean
}

export interface ShellContextDescriptor {
  moduleId: string
  primaryLabel?: string
  secondaryLabel?: string
  trail?: ShellContextTrailItem[]
  actions?: ShellContextAction[]
}

export const shellContextDescriptors = writable<Record<string, ShellContextDescriptor>>({})

export function setShellContextDescriptor(descriptor: ShellContextDescriptor): void {
  shellContextDescriptors.update((current) => ({
    ...current,
    [descriptor.moduleId]: descriptor
  }))
}

export function clearShellContextDescriptor(moduleId: string): void {
  shellContextDescriptors.update((current) => {
    const next = { ...current }
    delete next[moduleId]
    return next
  })
}

export function activeShellContextDescriptor(moduleId: string | null) {
  return derived(shellContextDescriptors, ($descriptors) => moduleId ? $descriptors[moduleId] ?? null : null)
}
