import { readable } from 'svelte/store'
import {
  AssetsStateSlice,
  type AssetItem,
  type AssetsState
} from '@shared/state/assets-state'
import { workspaceId } from '../../store'
import { addToast } from '../../store/toasts'
import { getModuleState } from '../module-state-registry'
import { connectSettingsBackedPersistence } from '../settings-backed-persistence'

export type { AssetItem }

const assetsState = getModuleState<AssetsStateSlice>('shell.assets', 'assets')

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

export function renameAsset(id: string, name: string): void {
  assetsState.renameAsset(id, name)
}

export async function copySelectedAssetPath(): Promise<void> {
  const path = assetsState.getSnapshot().selectedAsset?.filePath
  if (!path) return
  await navigator.clipboard.writeText(path)
  addToast('info', 'Asset path copied')
}

export async function revealSelectedAsset(): Promise<void> {
  const path = assetsState.getSnapshot().selectedAsset?.filePath
  if (!path) return
  await window.shell.assets.reveal(path)
}

export async function importAssets(): Promise<void> {
  const imported = assetsState.importAssets(await window.shell.assets.importFiles())
  if (imported.length > 0) {
    addToast('info', `Imported ${imported.length} asset${imported.length === 1 ? '' : 's'}`)
  }
}

export function removeSelectedAsset(): void {
  const removed = assetsState.removeSelectedAsset()
  if (removed) addToast('info', `Removed ${removed.name}`)
}

function persistenceKey(wsId: string): string {
  return `modules.assets.${wsId}.state`
}

connectSettingsBackedPersistence({
  label: 'shell.assets',
  workspaceId,
  slice: assetsState,
  settingsKey: persistenceKey
})
