import type { Readable } from 'svelte/store'
import type { Unsubscribe } from '@shared/state/observable'

interface SettingsBackedSlice<State, Snapshot> {
  hydrate(snapshot: Snapshot | undefined): void
  persistenceSnapshot(): Snapshot
  subscribe(listener: (state: State) => void): Unsubscribe
}

interface SettingsBackedPersistenceOptions<State, Snapshot> {
  label: string
  workspaceId: Readable<string>
  slice: SettingsBackedSlice<State, Snapshot>
  settingsKey: (workspaceId: string) => string
}

export function connectSettingsBackedPersistence<State, Snapshot>(
  options: SettingsBackedPersistenceOptions<State, Snapshot>
): Unsubscribe {
  let activeWorkspaceId = ''
  let hydratedWorkspaceId = ''
  let persistenceReady = false
  let loadVersion = 0
  let disposed = false

  const unsubscribeWorkspace = options.workspaceId.subscribe((wsId) => {
    const version = ++loadVersion
    activeWorkspaceId = wsId
    hydratedWorkspaceId = ''
    persistenceReady = false

    void (async () => {
      let snapshot: Snapshot | undefined
      try {
        snapshot = await window.shell.settings.get(options.settingsKey(wsId)) as Snapshot | undefined
      } catch (error) {
        console.warn(`[${options.label}] failed to load persisted state`, error)
      }

      if (disposed || version !== loadVersion || activeWorkspaceId !== wsId) return

      options.slice.hydrate(snapshot)

      if (disposed || version !== loadVersion || activeWorkspaceId !== wsId) return

      hydratedWorkspaceId = wsId
      persistenceReady = true
    })()
  })

  const unsubscribeSlice = options.slice.subscribe(() => {
    if (!persistenceReady || !activeWorkspaceId || hydratedWorkspaceId !== activeWorkspaceId) return

    void window.shell.settings
      .set(options.settingsKey(activeWorkspaceId), options.slice.persistenceSnapshot())
      .catch((error) => {
        console.warn(`[${options.label}] failed to save persisted state`, error)
      })
  })

  return () => {
    disposed = true
    unsubscribeWorkspace()
    unsubscribeSlice()
  }
}
