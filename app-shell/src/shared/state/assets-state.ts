import { ObservableSlice } from './observable'

export interface AssetItem {
  id: string
  name: string
  type: 'image' | 'document'
  kindLabel: string
  size: string
  dimensions: string
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
  { id: '1', name: 'hero-banner.png', type: 'image', kindLabel: 'PNG Image', size: '1.2 MB', dimensions: '1920 x 1080', added: '2026-05-29', usage: 'Referenced in 2 documents', filePath: null },
  { id: '2', name: 'character-ref.jpg', type: 'image', kindLabel: 'JPEG Image', size: '890 KB', dimensions: '1400 x 1800', added: '2026-05-29', usage: 'Referenced in 1 document', filePath: null },
  { id: '3', name: 'map-sketch.png', type: 'image', kindLabel: 'PNG Image', size: '2.1 MB', dimensions: '2400 x 1600', added: '2026-05-28', usage: 'Not referenced yet', filePath: null },
  { id: '4', name: 'notes-scan.pdf', type: 'document', kindLabel: 'PDF Document', size: '450 KB', dimensions: '8 pages', added: '2026-05-27', usage: 'Referenced in research notes', filePath: null }
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

  hydrate(snapshot: AssetsPersistenceSnapshot | undefined): void {
    if (!snapshot) {
      this.emit()
      return
    }

    this.assets = snapshot.assets.length > 0
      ? snapshot.assets.map(asset => ({ ...asset, filePath: asset.filePath ?? null }))
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
}
