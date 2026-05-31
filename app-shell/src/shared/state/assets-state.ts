import { ObservableSlice } from './observable'
import type { AssetImportCandidate } from '../module-contract'

export interface AssetItem {
  id: string
  name: string
  type: 'image' | 'document'
  kindLabel: string
  size: string
  dimensions: string
  width: number | null
  height: number | null
  thumbnailDataUrl: string | null
  added: string
  usage: string
  filePath: string | null
}

export interface AssetsState {
  assets: AssetItem[]
  selectedAssetId: string
  selectedAsset: AssetItem | null
}

const initialAssets: AssetItem[] = [
  { id: '1', name: 'hero-banner.png', type: 'image', kindLabel: 'PNG Image', size: '1.2 MB', dimensions: '1920 x 1080', width: 1920, height: 1080, thumbnailDataUrl: null, added: '2026-05-29', usage: 'Referenced in 2 documents', filePath: null },
  { id: '2', name: 'character-ref.jpg', type: 'image', kindLabel: 'JPEG Image', size: '890 KB', dimensions: '1400 x 1800', width: 1400, height: 1800, thumbnailDataUrl: null, added: '2026-05-29', usage: 'Referenced in 1 document', filePath: null },
  { id: '3', name: 'map-sketch.png', type: 'image', kindLabel: 'PNG Image', size: '2.1 MB', dimensions: '2400 x 1600', width: 2400, height: 1600, thumbnailDataUrl: null, added: '2026-05-28', usage: 'Not referenced yet', filePath: null },
  { id: '4', name: 'notes-scan.pdf', type: 'document', kindLabel: 'PDF Document', size: '450 KB', dimensions: '8 pages', width: null, height: null, thumbnailDataUrl: null, added: '2026-05-27', usage: 'Referenced in research notes', filePath: null }
]

export interface AssetsPersistenceSnapshot {
  assets: AssetItem[]
  selectedAssetId: string
}

export class AssetsStateSlice extends ObservableSlice<AssetsState> {
  private assets = initialAssets
  private selectedAssetId = '1'

  getSnapshot(): AssetsState {
    return {
      assets: this.assets,
      selectedAssetId: this.selectedAssetId,
      selectedAsset: this.selectedAsset()
    }
  }

  selectAsset(id: string): void {
    if (!this.assets.some(asset => asset.id === id)) return
    this.selectedAssetId = id
    this.emit()
  }

  removeSelectedAsset(): AssetItem | null {
    const removed = this.selectedAsset()
    if (!removed) return null

    this.assets = this.assets.filter(asset => asset.id !== removed.id)
    this.selectedAssetId = this.assets[0]?.id ?? ''
    this.emit()
    return removed
  }

  importAssets(candidates: AssetImportCandidate[]): AssetItem[] {
    if (candidates.length === 0) return []

    const imported = candidates.map(candidate => this.assetFromImport(candidate))
    const importedPaths = new Set(imported.map(asset => asset.filePath).filter(Boolean))
    this.assets = [
      ...imported,
      ...this.assets.filter(asset => !asset.filePath || !importedPaths.has(asset.filePath))
    ]
    this.selectedAssetId = imported[0]?.id ?? this.selectedAssetId
    this.emit()
    return imported
  }

  hydrate(snapshot: AssetsPersistenceSnapshot | undefined): void {
    if (!snapshot) {
      this.emit()
      return
    }

    this.assets = snapshot.assets.length > 0
      ? snapshot.assets.map(asset => ({
        ...asset,
        width: asset.width ?? null,
        height: asset.height ?? null,
        thumbnailDataUrl: asset.thumbnailDataUrl ?? null,
        filePath: asset.filePath ?? null
      }))
      : initialAssets
    this.selectedAssetId = this.assets.some(asset => asset.id === snapshot.selectedAssetId)
      ? snapshot.selectedAssetId
      : this.assets[0]?.id ?? ''
    this.emit()
  }

  persistenceSnapshot(): AssetsPersistenceSnapshot {
    return {
      assets: this.assets,
      selectedAssetId: this.selectedAssetId
    }
  }

  private selectedAsset(): AssetItem | null {
    return this.assets.find(asset => asset.id === this.selectedAssetId) ?? this.assets[0] ?? null
  }

  private assetFromImport(candidate: AssetImportCandidate): AssetItem {
    const extension = candidate.extension || 'file'
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)
    const dimensions = candidate.image
      ? `${candidate.image.width} x ${candidate.image.height}`
      : isImage ? 'Image metadata unavailable' : 'Imported file'
    return {
      id: `asset-${candidate.importedAt}-${candidate.filePath}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
      name: candidate.name,
      type: isImage ? 'image' : 'document',
      kindLabel: `${extension.toUpperCase()} ${isImage ? 'Image' : 'Document'}`,
      size: this.formatBytes(candidate.sizeBytes),
      dimensions,
      width: candidate.image?.width ?? null,
      height: candidate.image?.height ?? null,
      thumbnailDataUrl: candidate.image?.thumbnailDataUrl ?? null,
      added: candidate.importedAt.slice(0, 10),
      usage: 'Not referenced yet',
      filePath: candidate.filePath
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }
}
