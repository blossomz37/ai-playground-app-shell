import { derived, writable } from 'svelte/store'

export interface AssetItem {
  id: string
  name: string
  type: 'image' | 'document'
  kindLabel: string
  size: string
  dimensions: string
  added: string
  usage: string
}

export const assets = writable<AssetItem[]>([
  { id: '1', name: 'hero-banner.png', type: 'image', kindLabel: 'PNG Image', size: '1.2 MB', dimensions: '1920 x 1080', added: '2026-05-29', usage: 'Referenced in 2 documents' },
  { id: '2', name: 'character-ref.jpg', type: 'image', kindLabel: 'JPEG Image', size: '890 KB', dimensions: '1400 x 1800', added: '2026-05-29', usage: 'Referenced in 1 document' },
  { id: '3', name: 'map-sketch.png', type: 'image', kindLabel: 'PNG Image', size: '2.1 MB', dimensions: '2400 x 1600', added: '2026-05-28', usage: 'Not referenced yet' },
  { id: '4', name: 'notes-scan.pdf', type: 'document', kindLabel: 'PDF Document', size: '450 KB', dimensions: '8 pages', added: '2026-05-27', usage: 'Referenced in research notes' }
])

export const selectedAssetId = writable('1')

export const selectedAsset = derived(
  [assets, selectedAssetId],
  ([$assets, $id]) => $assets.find(asset => asset.id === $id) ?? $assets[0] ?? null
)

export function selectAsset(id: string): void {
  selectedAssetId.set(id)
}
