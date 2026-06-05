<!-- Assets NavView — image grid gallery -->
<script lang="ts">
  import InlineRename from '../../shell/InlineRename.svelte'
  import { addToast } from '../../store/toasts'
  import { assets, importAssets, renameAsset, selectAsset, selectedAssetId } from './state'

  let renamingAssetId = $state<string | null>(null)

  function startRename(event: MouseEvent, id: string): void {
    event.stopPropagation()
    selectAsset(id)
    renamingAssetId = id
  }

  function cancelRename(): void {
    renamingAssetId = null
  }

  function commitRename(id: string, name: string): void {
    if (!name) {
      addToast('warn', 'Asset label cannot be blank.')
      cancelRename()
      return
    }
    renameAsset(id, name)
    selectAsset(id)
    cancelRename()
  }
</script>

<div class="nav-view">
  <header class="zone-header nav-header">
    <span class="zone-title nav-title">Library</span>
    <button class="import-btn" title="Import assets" onclick={() => void importAssets()}>+</button>
  </header>
  <div class="asset-list">
    {#each $assets as asset (asset.id)}
      <div
        class="asset-item"
        class:active={$selectedAssetId === asset.id}
      >
        {#if renamingAssetId === asset.id}
          <InlineRename
            value={asset.name}
            ariaLabel="Rename asset label"
            onCommit={(name) => commitRename(asset.id, name)}
            onCancel={cancelRename}
          />
        {:else}
          <button
            type="button"
            class="asset-open"
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
          <button
            type="button"
            class="row-action"
            title="Rename asset label"
            aria-label={`Rename ${asset.name}`}
            onclick={(event) => startRename(event, asset.id)}
          >
            ✎
          </button>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { justify-content: space-between; }
  .import-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--color-fg-muted); font-size: 16px; cursor: pointer; transition: background 0.1s, color 0.1s; }
  .import-btn:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .asset-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .asset-item { display: grid; grid-template-columns: minmax(0, 1fr) 24px; align-items: center; gap: var(--space-1); width: 100%; padding: var(--space-1); border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary); transition: background 0.1s; }
  .asset-item:hover { background: var(--color-bg-overlay); }
  .asset-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .asset-open { display: flex; align-items: center; gap: var(--space-2); min-width: 0; padding: var(--space-1) var(--space-2); text-align: left; color: inherit; cursor: pointer; }
  .row-action { width: 22px; height: 22px; border-radius: var(--radius-sm); color: var(--color-fg-muted); opacity: 0; }
  .asset-item:hover .row-action, .asset-item.active .row-action, .row-action:focus-visible { opacity: 1; }
  .row-action:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
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
