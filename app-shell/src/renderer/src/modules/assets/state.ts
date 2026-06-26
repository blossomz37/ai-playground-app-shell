import { get, readable } from 'svelte/store'
import {
  AssetsStateSlice,
  formatAssetBytes,
  primaryAssetMetadata,
  type AssetItem,
  type AssetsState
} from '@shared/state/assets-state'
import type { AssetRecord, AssetUpdatePatch } from '@shared/module-contract'
import { workspaceId } from '../../store'
import { addToast } from '../../store/toasts'
import { getModuleState } from '../module-state-registry'

export type { AssetItem }
export { formatAssetBytes, primaryAssetMetadata }

interface AssetsCaptureDbSmokeParams {
  importFilePaths: string[]
  exportDir: string
}

const assetsState = getModuleState<AssetsStateSlice>('shell.assets', 'assets')

function fromAssetsState<T>(selector: (state: AssetsState) => T) {
  return readable(selector(assetsState.getSnapshot()), (set) =>
    assetsState.subscribe((state) => set(selector(state)))
  )
}

export const assets = fromAssetsState(state => state.assets)
export const archivedAssets = fromAssetsState(state => state.archivedAssets)
export const selectedAssetId = fromAssetsState(state => state.selectedAssetId)
export const selectedAsset = fromAssetsState(state => state.selectedAsset)

let loadedWorkspaceId = ''
workspaceId.subscribe((id) => {
  if (!id || id === loadedWorkspaceId) return
  loadedWorkspaceId = id
  void assetsState.loadWorkspace(id)
})

export function selectAsset(id: string): void {
  assetsState.selectAsset(id)
}

/** Ensure the current workspace's assets are loaded (e.g. before navigating to one). */
export async function loadAssetsWorkspace(): Promise<void> {
  const id = get(workspaceId)
  if (!id) return
  await assetsState.loadWorkspace(id)
}

export async function renameAsset(id: string, name: string): Promise<void> {
  await assetsState.renameAsset(id, name)
}

export async function updateAssetDetails(id: string, patch: AssetUpdatePatch): Promise<void> {
  await assetsState.updateAsset(id, patch)
}

export async function addProjectLink(assetId: string, workspaceId: string, role: string): Promise<void> {
  await assetsState.addWorkspaceLink({ assetId, workspaceId, role })
}

export async function updateProjectLink(assetId: string, workspaceId: string, fromRole: string, toRole: string): Promise<void> {
  await assetsState.updateWorkspaceLink({ assetId, workspaceId, fromRole, toRole })
}

export async function removeProjectLink(assetId: string, workspaceId: string, role: string): Promise<void> {
  await assetsState.removeWorkspaceLink({ assetId, workspaceId, role })
}

export async function addDocumentLink(assetId: string, documentId: string, relationType: string): Promise<void> {
  await assetsState.addDocumentLink({ assetId, documentId, relationType })
}

export async function updateDocumentLink(assetId: string, documentId: string, fromRelationType: string, toRelationType: string): Promise<void> {
  await assetsState.updateDocumentLink({ assetId, documentId, fromRelationType, toRelationType })
}

export async function removeDocumentLink(assetId: string, documentId: string, relationType: string): Promise<void> {
  await assetsState.removeDocumentLink({ assetId, documentId, relationType })
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
  await assetsState.reveal(path)
}

export async function importAssets(filePaths?: string[]): Promise<AssetRecord[]> {
  const wsId = get(workspaceId)
  const imported = await assetsState.importAssets(wsId, filePaths)
  if (imported.length > 0) {
    addToast('info', `Imported ${imported.length} asset${imported.length === 1 ? '' : 's'}`)
  }
  return imported
}

export async function exportAsset(id: string): Promise<void> {
  const result = await assetsState.exportAssets([id])
  addToast('info', `Exported ${result.filesWritten.length} asset file${result.filesWritten.length === 1 ? '' : 's'}`)
}

export async function archiveAsset(id: string): Promise<void> {
  const archived = await assetsState.archiveAsset(id)
  if (archived) addToast('info', `Archived ${archived.label}`)
}

export async function restoreAsset(id: string): Promise<void> {
  const restored = await assetsState.restoreAsset(id)
  if (restored) addToast('info', `Restored ${restored.label}`)
}

export async function removeSelectedAsset(): Promise<void> {
  const selected = assetsState.getSnapshot().selectedAsset
  if (!selected) return
  await assetsState.deleteAsset(selected.id)
  addToast('info', `Removed ${selected.label}`)
}

async function runAssetsCaptureDbSmoke(params: AssetsCaptureDbSmokeParams) {
  const wsId = get(workspaceId)
  await assetsState.loadWorkspace(wsId)
  const imported = await assetsState.importAssets(wsId, params.importFilePaths)
  const first = imported[0] ?? null
  const second = imported[1] ?? null

  if (first) {
    await assetsState.updateAsset(first.id, {
      comments: 'Capture smoke comment',
      tags: ['capture', 'library']
    })
  }

  const afterUpdate = first ? await window.shell.assets.open(first.id) : null
  const listAfterUpdate = await window.shell.assets.list({ workspaceId: wsId, includeArchived: true })
  const exportResult = await assetsState.exportAssets(imported.slice(0, 2).map(asset => asset.id), {
    targetDir: params.exportDir
  })

  if (second) await assetsState.archiveAsset(second.id)
  const afterArchive = await window.shell.assets.list({ workspaceId: wsId, includeArchived: true })
  const hiddenAfterArchive = second ? !afterArchive.some(asset => asset.id === second.id && !asset.archivedAt) : false
  const archivedAfterArchive = second ? afterArchive.some(asset => asset.id === second.id && asset.archivedAt) : false
  const restored = second ? await assetsState.restoreAsset(second.id) : null
  const afterRestore = await window.shell.assets.list({ workspaceId: wsId, includeArchived: true })
  const visibleAfterRestore = second ? afterRestore.some(asset => asset.id === second.id && !asset.archivedAt) : false

  if (second) await assetsState.archiveAsset(second.id)

  const deleteCandidate = imported[imported.length - 1] ?? null
  const deletedSourcePath = deleteCandidate?.filePath ?? null
  if (deleteCandidate) {
    await window.shell.assets.delete(deleteCandidate.id)
    await assetsState.loadWorkspace(wsId)
  }
  const afterDelete = deleteCandidate
    ? await window.shell.assets.list({ workspaceId: wsId, includeArchived: true })
    : []

  return {
    workspaceId: wsId,
    importedIds: imported.map(asset => asset.id),
    importedCount: imported.length,
    importedExtensions: imported.map(asset => asset.extension).sort(),
    firstImported: afterUpdate,
    workspaceLinked: imported.every(asset => asset.workspaceLinks.some(link => link.workspaceId === wsId)),
    metadataPersisted: imported.some(asset => Object.keys(asset.metadata).length > 0),
    checksumPersisted: imported.every(asset => Boolean(asset.checksum)),
    fileStatsPersisted: imported.every(asset => asset.sizeBytes > 0 && Boolean(asset.fileCreatedAt) && Boolean(asset.fileModifiedAt)),
    commentsPersisted: afterUpdate?.comments === 'Capture smoke comment',
    tagsPersisted: Boolean(afterUpdate?.tags.includes('capture') && afterUpdate.tags.includes('library')),
    persistedAfterRelist: Boolean(listAfterUpdate.find(asset => asset.id === first?.id)?.tags.includes('capture')),
    exportResult,
    hiddenAfterArchive,
    archivedAfterArchive,
    restored: Boolean(restored),
    visibleAfterRestore,
    dbDeleted: deleteCandidate ? !afterDelete.some(asset => asset.id === deleteCandidate.id) : false,
    deletedSourcePath,
    screenshotArchivedId: second?.id ?? null
  }
}

if (typeof window !== 'undefined') {
  const captureWindow = window as typeof window & {
    __assetsCaptureDbSmoke?: (params: AssetsCaptureDbSmokeParams) => Promise<unknown>
    __assetsCaptureDeleteAssets?: (ids: string[]) => Promise<void>
    __assetsCaptureRefresh?: (workspaceId: string, assetId?: string) => Promise<void>
  }
  captureWindow.__assetsCaptureDbSmoke = runAssetsCaptureDbSmoke
  captureWindow.__assetsCaptureDeleteAssets = async (ids) => {
    for (const id of ids) {
      await window.shell.assets.delete(id)
    }
    const wsId = get(workspaceId)
    if (wsId && wsId !== 'ws-default') await assetsState.loadWorkspace(wsId)
  }
  captureWindow.__assetsCaptureRefresh = async (wsId, assetId) => {
    if (!wsId || wsId === 'ws-default') return
    await assetsState.loadWorkspace(wsId)
    if (assetId) assetsState.selectAsset(assetId)
  }
}
