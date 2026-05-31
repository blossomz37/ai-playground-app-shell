<!-- Assets NavView — image grid gallery -->
<script lang="ts">
  import { assets, selectAsset, selectedAssetId } from './state'
</script>

<div class="nav-view">
  <header class="nav-header"><span class="nav-title">Library</span></header>
  <div class="asset-list">
    {#each $assets as asset (asset.id)}
      <button
        class="asset-item"
        class:active={$selectedAssetId === asset.id}
        aria-pressed={$selectedAssetId === asset.id}
        onclick={() => selectAsset(asset.id)}
      >
        <span class="asset-icon">{asset.type === 'image' ? '🖼' : '📄'}</span>
        <div class="asset-info">
          <span class="asset-name">{asset.name}</span>
          <span class="asset-size">{asset.size}</span>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { display: flex; align-items: center; padding: var(--space-3); border-bottom: var(--border-subtle); flex-shrink: 0; }
  .nav-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); }
  .asset-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .asset-item { display: flex; align-items: center; gap: var(--space-2); width: 100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary); transition: background 0.1s; cursor: pointer; }
  .asset-item:hover { background: var(--color-bg-overlay); }
  .asset-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .asset-icon { font-size: 16px; flex-shrink: 0; }
  .asset-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .asset-name { font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asset-size { font-size: var(--font-size-xs); color: var(--color-fg-muted); }
</style>
