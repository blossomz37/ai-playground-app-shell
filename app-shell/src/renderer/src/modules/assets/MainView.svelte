<!-- Assets MainView — asset preview/detail -->
<script lang="ts">
  import InlineRename from '../../shell/InlineRename.svelte'
  import { addToast } from '../../store/toasts'
  import { copySelectedAssetPath, removeSelectedAsset, renameAsset, revealSelectedAsset, selectedAsset } from './state'

  let asset = $derived($selectedAsset)
  let hasFilePath = $derived(Boolean(asset?.filePath))
  let renamingAsset = $state(false)

  function commitRename(id: string, name: string): void {
    if (!name) {
      addToast('warn', 'Asset label cannot be blank.')
      renamingAsset = false
      return
    }
    renameAsset(id, name)
    renamingAsset = false
  }
</script>

<div class="main-view">
  {#if asset}
    <header class="zone-header asset-header">
      {#if renamingAsset}
        <InlineRename
          value={asset.name}
          ariaLabel="Rename asset label"
          onCommit={(name) => commitRename(asset.id, name)}
          onCancel={() => renamingAsset = false}
        />
      {:else}
        <button type="button" class="asset-title" onclick={() => renamingAsset = true}>
          {asset.name}
        </button>
      {/if}
      <span class="asset-kind">{asset.kindLabel}</span>
    </header>
    <div class="preview-area">
      <div class:preview-card={asset.thumbnailDataUrl} class:placeholder-img={!asset.thumbnailDataUrl}>
        {#if asset.thumbnailDataUrl}
          <img class="asset-preview" src={asset.thumbnailDataUrl} alt={asset.name} />
        {:else}
          <span class="placeholder-icon">{asset.type === 'image' ? '🖼' : '📄'}</span>
        {/if}
        <span class="placeholder-text">{asset.name}</span>
        <span class="placeholder-meta">{asset.dimensions} · {asset.kindLabel} · {asset.size}</span>
      </div>
    </div>
    <div class="asset-actions">
      <button class="action-btn" disabled={!hasFilePath} title={hasFilePath ? 'Open the source file location' : 'No source file path recorded'} onclick={() => void revealSelectedAsset()}>Open in Finder</button>
      <button class="action-btn" disabled={!hasFilePath} title={hasFilePath ? 'Copy source file path' : 'No source file path recorded'} onclick={() => void copySelectedAssetPath()}>Copy Path</button>
      <button class="action-btn danger" title="Remove this asset metadata record" onclick={removeSelectedAsset}>Remove</button>
    </div>
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
  .preview-card {
    padding: var(--space-4);
  }
  .asset-preview {
    width: 100%;
    max-height: min(56vh, 460px);
    object-fit: contain;
    border-radius: var(--radius-md);
    background: var(--color-bg-overlay);
    border: var(--border-subtle);
  }
  .placeholder-icon { font-size: 48px; }
  .placeholder-text { font-size: var(--font-size-md); font-weight: 500; color: var(--color-fg-secondary); }
  .placeholder-meta { font-size: var(--font-size-xs); }
  .asset-actions { display: flex; gap: var(--space-2); padding: var(--space-3) var(--space-6); border-top: var(--border-subtle); }
  .action-btn {
    padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-sm);
    color: var(--color-fg-secondary); background: var(--color-bg-overlay); cursor: pointer; transition: background 0.1s, color 0.1s;
  }
  .action-btn:hover { background: var(--color-bg-active); color: var(--color-fg-primary); }
  .action-btn.danger:hover { color: var(--color-danger); }
  .action-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .action-btn:disabled:hover {
    background: var(--color-bg-overlay);
    color: var(--color-fg-secondary);
  }
</style>
