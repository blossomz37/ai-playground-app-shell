import { readable } from 'svelte/store'
import {
  AssetsStateSlice,
  type AssetItem,
  type AssetsPersistenceSnapshot,
  type AssetsState
} from '@shared/state/assets-state'
import { workspaceId } from '../../store'
import { addToast } from '../../store/toasts'

export type { AssetItem }

const assetsState = new AssetsStateSlice()
let activeWorkspaceId = ''
let persistenceReady = false

function fromAssetsState<T>(selector: (state: AssetsState) => T) {
  return readable(selector(assetsState.getSnapshot()), (set) =>
    assetsState.subscribe((state) => set(selector(state)))
  )
}

export const assets = fromAssetsState(state => state.assets)
export const selectedAssetId = fromAssetsState(state => state.selectedAssetId)
export const selectedAsset = fromAssetsState(state => state.selectedAsset)

export function selectAsset(id: string): void {
  assetsState.selectAsset(id)
}

export async function copySelectedAssetPath(): Promise<void> {
  const path = assetsState.getSnapshot().selectedAsset?.filePath
  if (!path) return
  await navigator.clipboard.writeText(path)
  addToast('info', 'Asset path copied')
}

export function removeSelectedAsset(): void {
  const removed = assetsState.removeSelectedAsset()
  if (removed) addToast('info', `Removed ${removed.name}`)
}

function persistenceKey(wsId: string): string {
  return `modules.assets.${wsId}.state`
}

async function loadAssetsPersistence(wsId: string): Promise<void> {
  activeWorkspaceId = wsId
  persistenceReady = false
  const snapshot = await window.shell.settings.get(persistenceKey(wsId)) as AssetsPersistenceSnapshot | undefined
  if (activeWorkspaceId !== wsId) return
  persistenceReady = true
  assetsState.hydrate(snapshot)
}

workspaceId.subscribe((wsId) => {
  void loadAssetsPersistence(wsId)
})

assetsState.subscribe(() => {
  if (!persistenceReady || !activeWorkspaceId) return
  void window.shell.settings.set(persistenceKey(activeWorkspaceId), assetsState.persistenceSnapshot())
})
