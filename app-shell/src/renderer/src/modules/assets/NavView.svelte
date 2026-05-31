<!-- Assets NavView — image grid gallery -->
<script lang="ts">
  import { assets, importAssets, selectAsset, selectedAssetId } from './state'
</script>

<div class="nav-view">
  <header class="nav-header">
    <span class="nav-title">Library</span>
    <button class="import-btn" title="Import assets" onclick={() => void importAssets()}>+</button>
  </header>
  <div class="asset-list">
    {#each $assets as asset (asset.id)}
      <button
        class="asset-item"
        class:active={$selectedAssetId === asset.id}
        aria-pressed={$selectedAssetId === asset.id}
        onclick={() => selectAsset(asset.id)}
      >
        {#if asset.thumbnailDataUrl}
          <img class="asset-thumb" src={asset.thumbnailDataUrl} alt="" />
        {:else}
          <span class="asset-icon">{asset.type === 'image' ? '🖼' : '📄'}</span>
        {/if}
        <div class="asset-info">
          <span class="asset-name">{asset.name}</span>
          <span class="asset-size">{asset.dimensions} · {asset.size}</span>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); border-bottom: var(--border-subtle); flex-shrink: 0; }
  .nav-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); }
  .import-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--color-fg-muted); font-size: 16px; cursor: pointer; transition: background 0.1s, color 0.1s; }
  .import-btn:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .asset-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .asset-item { display: flex; align-items: center; gap: var(--space-2); width: 100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary); transition: background 0.1s; cursor: pointer; }
  .asset-item:hover { background: var(--color-bg-overlay); }
  .asset-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .asset-icon { font-size: 16px; flex-shrink: 0; }
  .asset-thumb {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: var(--radius-sm);
    object-fit: cover;
    background: var(--color-bg-overlay);
    border: var(--border-subtle);
  }
  .asset-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .asset-name { font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asset-size { font-size: var(--font-size-xs); color: var(--color-fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
