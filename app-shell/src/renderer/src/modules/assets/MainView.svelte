<!-- Assets MainView — asset preview/detail -->
<script lang="ts">
  import { MagnifyingGlassPlusIcon, XIcon } from 'phosphor-svelte'
  import InlineRename from '../../shell/InlineRename.svelte'
  import { addToast } from '../../store/toasts'
  import {
    archiveAsset,
    copySelectedAssetPath,
    exportAsset,
    formatAssetBytes,
    primaryAssetMetadata,
    removeSelectedAsset,
    renameAsset,
    restoreAsset,
    revealSelectedAsset,
    selectedAsset
  } from './state'

  let asset = $derived($selectedAsset)
  let hasFilePath = $derived(Boolean(asset?.filePath))
  let imagePreviewAssetId = $state<string | null>(null)
  let canPreviewImage = $derived(Boolean(asset?.thumbnailDataUrl && asset.mediaType === 'image'))
  let showImagePreview = $derived(Boolean(asset && canPreviewImage && imagePreviewAssetId === asset.id))
  let renamingAsset = $state(false)

  async function commitRename(id: string, name: string): Promise<void> {
    if (!name) {
      addToast('warn', 'Asset label cannot be blank.')
      renamingAsset = false
      return
    }
    await renameAsset(id, name)
    renamingAsset = false
  }

  function closeImagePreview(): void {
    imagePreviewAssetId = null
  }
</script>

<svelte:window onkeydown={(event) => {
  if (event.key === 'Escape' && showImagePreview) closeImagePreview()
}} />

<div class="main-view">
  {#if asset}
    <header class="zone-header asset-header">
      {#if renamingAsset}
        <InlineRename
          value={asset.label}
          ariaLabel="Rename asset label"
          onCommit={(name) => void commitRename(asset.id, name)}
          onCancel={() => renamingAsset = false}
        />
      {:else}
        <button type="button" class="asset-title" onclick={() => renamingAsset = true}>
          {asset.label}
        </button>
      {/if}
      <span class="asset-kind">{asset.mediaType.toUpperCase()} · {asset.extension.toUpperCase()}</span>
    </header>
    <div class="preview-area">
      <div class:preview-card={asset.thumbnailDataUrl} class:placeholder-img={!asset.thumbnailDataUrl}>
        {#if canPreviewImage && asset.thumbnailDataUrl}
          <button
            type="button"
            class="asset-preview-trigger"
            aria-label={`Enlarge ${asset.label}`}
            onclick={() => imagePreviewAssetId = asset.id}
          >
            <img class="asset-preview" src={asset.thumbnailDataUrl} alt={asset.label} />
            <span class="preview-affordance" aria-hidden="true">
              <MagnifyingGlassPlusIcon size={18} weight="bold" />
            </span>
          </button>
        {:else if asset.thumbnailDataUrl}
          <img class="asset-preview" src={asset.thumbnailDataUrl} alt={asset.label} />
        {:else}
          <span class="placeholder-icon">{asset.mediaType === 'image' ? '🖼' : asset.mediaType === 'audio' ? '♪' : '📄'}</span>
        {/if}
        <span class="placeholder-text">{asset.originalName}</span>
        <span class="placeholder-meta">{primaryAssetMetadata(asset)} · {asset.mimeType} · {formatAssetBytes(asset.sizeBytes)}</span>
      </div>
    </div>
    <div class="asset-actions">
      <button class="action-btn" disabled={!hasFilePath} title={hasFilePath ? 'Open the source file location' : 'No source file path recorded'} onclick={() => void revealSelectedAsset()}>Open in Finder</button>
      <button class="action-btn" disabled={!hasFilePath} title={hasFilePath ? 'Copy source file path' : 'No source file path recorded'} onclick={() => void copySelectedAssetPath()}>Copy Path</button>
      <button class="action-btn" disabled={!hasFilePath} title="Export this asset and metadata manifest" onclick={() => void exportAsset(asset.id)}>Export</button>
      {#if asset.archivedAt}
        <button class="action-btn" title="Restore this asset record" onclick={() => void restoreAsset(asset.id)}>Restore</button>
      {:else}
        <button class="action-btn" title="Archive this asset record" onclick={() => void archiveAsset(asset.id)}>Archive</button>
      {/if}
      <button class="action-btn danger" title="Remove this database record only; source files are not deleted" onclick={() => void removeSelectedAsset()}>Remove Record</button>
    </div>

    {#if showImagePreview && asset.thumbnailDataUrl}
      <div class="image-modal-backdrop" role="presentation" onclick={closeImagePreview}>
        <div
          class="image-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Image preview: ${asset.label}`}
          tabindex="-1"
          onclick={(event) => event.stopPropagation()}
          onkeydown={(event) => event.stopPropagation()}
        >
          <header class="image-modal-header">
            <div class="image-modal-title">
              <span>{asset.label}</span>
              <span>{primaryAssetMetadata(asset)} · {formatAssetBytes(asset.sizeBytes)}</span>
            </div>
            <button class="modal-close" type="button" title="Close preview" aria-label="Close preview" onclick={closeImagePreview}>
              <XIcon size={18} weight="bold" />
            </button>
          </header>
          <img class="image-modal-img" src={asset.thumbnailDataUrl} alt={asset.label} />
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .asset-header { gap: var(--space-3); padding: 0 var(--space-6); }
  .asset-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--font-size-md); font-weight: 700; color: var(--color-fg-primary); text-align: left; }
  .asset-kind { margin-left: auto; flex-shrink: 0; font-size: var(--font-size-xs); color: var(--color-fg-muted); }
  .preview-area { flex: 1; display: flex; align-items: center; justify-content: center; padding: var(--space-6); }
  .placeholder-img, .preview-card {
    display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
    color: var(--color-fg-muted); max-width: 520px; width: 100%;
  }
  .placeholder-img {
    padding: var(--space-6); border: 2px dashed var(--color-border); border-radius: var(--radius-lg);
  }
  .preview-card { padding: var(--space-4); }
  .asset-preview-trigger {
    position: relative;
    width: 100%;
    max-width: 520px;
    cursor: zoom-in;
  }
  .asset-preview {
    width: 100%; max-height: min(56vh, 460px); object-fit: contain;
    border-radius: var(--radius-md); background: var(--color-bg-overlay); border: var(--border-subtle);
  }
  .asset-preview-trigger:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 3px; border-radius: var(--radius-md); }
  .preview-affordance {
    position: absolute; right: var(--space-3); bottom: var(--space-3);
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: var(--radius-sm);
    color: var(--color-fg-primary); background: color-mix(in srgb, var(--color-bg-base) 86%, transparent);
    border: var(--border-subtle); opacity: 0; transform: translateY(2px);
    transition: opacity 0.12s, transform 0.12s;
  }
  .asset-preview-trigger:hover .preview-affordance, .asset-preview-trigger:focus-visible .preview-affordance { opacity: 1; transform: translateY(0); }
  .placeholder-icon { font-size: 48px; }
  .placeholder-text { font-size: var(--font-size-md); font-weight: 500; color: var(--color-fg-secondary); text-align: center; overflow-wrap: anywhere; }
  .placeholder-meta { font-size: var(--font-size-xs); text-align: center; overflow-wrap: anywhere; }
  .asset-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-3) var(--space-6); border-top: var(--border-subtle); }
  .action-btn {
    padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-sm);
    color: var(--color-fg-secondary); background: var(--color-bg-overlay); cursor: pointer; transition: background 0.1s, color 0.1s;
  }
  .action-btn:hover { background: var(--color-bg-active); color: var(--color-fg-primary); }
  .action-btn.danger:hover { color: var(--color-danger); }
  .action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .action-btn:disabled:hover { background: var(--color-bg-overlay); color: var(--color-fg-secondary); }
  .image-modal-backdrop {
    position: fixed; inset: 0; z-index: 60;
    display: flex; align-items: center; justify-content: center;
    padding: var(--space-6);
    background: color-mix(in srgb, var(--color-bg-base) 76%, rgba(0, 0, 0, 0.82));
  }
  .image-modal {
    display: flex; flex-direction: column; gap: var(--space-3);
    width: fit-content; min-width: min(360px, 92vw); max-width: min(92vw, 980px); max-height: 88vh;
    color: var(--color-fg-primary);
  }
  .image-modal-header {
    display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
    min-height: 38px;
  }
  .image-modal-title { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .image-modal-title span:first-child {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: var(--font-size-sm); font-weight: 700;
  }
  .image-modal-title span:last-child { font-size: var(--font-size-xs); color: var(--color-fg-muted); }
  .modal-close {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; flex-shrink: 0;
    border-radius: var(--radius-sm); color: var(--color-fg-secondary); background: var(--color-bg-overlay);
  }
  .modal-close:hover, .modal-close:focus-visible { color: var(--color-fg-primary); background: var(--color-bg-active); }
  .image-modal-img {
    display: block;
    width: auto; max-width: 100%; max-height: calc(88vh - 54px); margin: 0 auto; object-fit: contain;
    border-radius: var(--radius-md); background: var(--color-bg-overlay); border: var(--border-subtle);
  }
</style>
