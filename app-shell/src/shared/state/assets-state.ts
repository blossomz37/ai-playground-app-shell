import type {
  AssetExportParams,
  AssetExportResult,
  AssetImportParams,
  AssetListParams,
  AssetRecord,
  AssetUpdatePatch
} from '../module-contract'
import { ObservableSlice } from './observable'

export type AssetItem = AssetRecord

export interface AssetsPort {
  list(params: AssetListParams): Promise<AssetRecord[]>
  open(id: string): Promise<AssetRecord | null>
  importFiles(params: AssetImportParams): Promise<AssetRecord[]>
  update(id: string, patch: AssetUpdatePatch): Promise<AssetRecord>
  archive(id: string): Promise<AssetRecord>
  restore(id: string): Promise<AssetRecord>
  delete(id: string): Promise<{ id: string }>
  exportAssets(ids: string[], params?: AssetExportParams): Promise<AssetExportResult>
  reveal(path: string): Promise<void>
}

export interface AssetsState {
  assets: AssetRecord[]
  archivedAssets: AssetRecord[]
  selectedAssetId: string
  selectedAsset: AssetRecord | null
}

export class AssetsStateSlice extends ObservableSlice<AssetsState> {
  private assets: AssetRecord[] = []
  private archivedAssets: AssetRecord[] = []
  private selectedAssetId = ''
  private workspaceId: string | null = null

  constructor(private readonly port: AssetsPort) {
    super()
  }

  getSnapshot(): AssetsState {
    return {
      assets: this.assets,
      archivedAssets: this.archivedAssets,
      selectedAssetId: this.selectedAssetId,
      selectedAsset: this.selectedAsset()
    }
  }

  async loadWorkspace(workspaceId: string): Promise<void> {
    this.workspaceId = workspaceId
    await this.refresh()
    this.selectedAssetId = this.assets[0]?.id ?? this.archivedAssets[0]?.id ?? ''
    this.emit()
  }

  selectAsset(id: string): void {
    if (![...this.assets, ...this.archivedAssets].some(asset => asset.id === id)) return
    this.selectedAssetId = id
    this.emit()
  }

  async renameAsset(id: string, label: string): Promise<AssetRecord | null> {
    const nextLabel = label.trim()
    if (!nextLabel) return null
    return this.updateAsset(id, { label: nextLabel })
  }

  async updateAsset(id: string, patch: AssetUpdatePatch): Promise<AssetRecord | null> {
    const updated = await this.port.update(id, patch)
    this.upsertAsset(updated)
    this.emit()
    return updated
  }

  async importAssets(workspaceId: string, filePaths?: string[]): Promise<AssetRecord[]> {
    const imported = await this.port.importFiles({ workspaceId, filePaths })
    await this.refresh()
    this.selectedAssetId = imported[0]?.id ?? this.selectedAssetId
    this.emit()
    return imported
  }

  async archiveAsset(id: string): Promise<AssetRecord | null> {
    const archived = await this.port.archive(id)
    await this.refresh()
    this.selectedAssetId = this.assets[0]?.id ?? archived.id
    this.emit()
    return archived
  }

  async restoreAsset(id: string): Promise<AssetRecord | null> {
    const restored = await this.port.restore(id)
    await this.refresh()
    this.selectedAssetId = restored.id
    this.emit()
    return restored
  }

  async deleteAsset(id: string): Promise<void> {
    await this.port.delete(id)
    await this.refresh()
    if (this.selectedAssetId === id) {
      this.selectedAssetId = this.assets[0]?.id ?? this.archivedAssets[0]?.id ?? ''
    }
    this.emit()
  }

  async exportAssets(ids: string[], params?: AssetExportParams): Promise<AssetExportResult> {
    return this.port.exportAssets(ids, params)
  }

  async reveal(path: string): Promise<void> {
    return this.port.reveal(path)
  }

  private async refresh(): Promise<void> {
    if (!this.workspaceId) return
    const rows = await this.port.list({ workspaceId: this.workspaceId, includeArchived: true })
    this.assets = rows.filter(asset => !asset.archivedAt)
    this.archivedAssets = rows.filter(asset => asset.archivedAt)
    if (this.selectedAssetId && !rows.some(asset => asset.id === this.selectedAssetId)) {
      this.selectedAssetId = rows[0]?.id ?? ''
    }
  }

  private selectedAsset(): AssetRecord | null {
    const rows = [...this.assets, ...this.archivedAssets]
    return rows.find(asset => asset.id === this.selectedAssetId) ?? rows[0] ?? null
  }

  private upsertAsset(asset: AssetRecord): void {
    const target = asset.archivedAt ? this.archivedAssets : this.assets
    const other = asset.archivedAt ? this.assets : this.archivedAssets
    const index = target.findIndex(item => item.id === asset.id)
    if (index >= 0) {
      target[index] = asset
    } else {
      target.unshift(asset)
    }
    const otherIndex = other.findIndex(item => item.id === asset.id)
    if (otherIndex >= 0) other.splice(otherIndex, 1)
  }
}

export function formatAssetBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function primaryAssetMetadata(asset: AssetRecord): string {
  if (asset.mediaType === 'image' && typeof asset.metadata.width === 'number' && typeof asset.metadata.height === 'number') {
    return `${asset.metadata.width} x ${asset.metadata.height}`
  }
  if (asset.mediaType === 'pdf' && typeof asset.metadata.pageCount === 'number') {
    return `${asset.metadata.pageCount} page${asset.metadata.pageCount === 1 ? '' : 's'}`
  }
  return asset.extension ? asset.extension.toUpperCase() : asset.mediaType
}
