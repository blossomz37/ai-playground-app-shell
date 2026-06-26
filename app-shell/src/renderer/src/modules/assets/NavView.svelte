<!-- Assets NavView — DB-backed asset library -->
<script lang="ts">
  import InlineRename from '../../shell/InlineRename.svelte'
  import { addToast } from '../../store/toasts'
  import {
    archivedAssets,
    archiveAsset,
    assets,
    exportAsset,
    formatAssetBytes,
    importAssets,
    primaryAssetMetadata,
    renameAsset,
    restoreAsset,
    selectAsset,
    type AssetItem,
    selectedAssetId
  } from './state'

  let renamingAssetId = $state<string | null>(null)
  let archivedOpen = $state(true)
  let filterQuery = $state('')
  let normalizedFilter = $derived(filterQuery.trim().toLowerCase())
  let visibleAssets = $derived(
    normalizedFilter ? $assets.filter(asset => assetMatches(asset, normalizedFilter)) : $assets
  )
  let visibleArchivedAssets = $derived(
    normalizedFilter ? $archivedAssets.filter(asset => assetMatches(asset, normalizedFilter)) : $archivedAssets
  )

  function assetMatches(asset: AssetItem, query: string): boolean {
    return [
      asset.label,
      asset.originalName,
      asset.extension,
      asset.mediaType,
      asset.comments,
      ...asset.tags
    ].some(value => value.toLowerCase().includes(query))
  }

  function startRename(event: MouseEvent, id: string): void {
    event.stopPropagation()
    selectAsset(id)
    renamingAssetId = id
  }

  function cancelRename(): void {
    renamingAssetId = null
  }

  async function commitRename(id: string, name: string): Promise<void> {
    if (!name) {
      addToast('warn', 'Asset label cannot be blank.')
      cancelRename()
      return
    }
    await renameAsset(id, name)
    selectAsset(id)
    cancelRename()
  }
</script>

<div class="nav-view">
  <header class="zone-header nav-header">
    <span class="zone-title nav-title">Library</span>
    <button class="nav-icon-btn" title="Import assets" aria-label="Import assets" onclick={() => void importAssets()}>＋</button>
  </header>
  <div class="nav-filter">
    <input
      bind:value={filterQuery}
      data-capture-nav-search
      type="search"
      class="filter-input"
      placeholder="Filter assets"
      aria-label="Filter assets"
      autocomplete="off"
    />
  </div>
  <div class="asset-list">
    {#each visibleAssets as asset (asset.id)}
      <div class="asset-item" class:active={$selectedAssetId === asset.id}>
        {#if renamingAssetId === asset.id}
          <InlineRename
            value={asset.label}
            ariaLabel="Rename asset label"
            onCommit={(name) => void commitRename(asset.id, name)}
            onCancel={cancelRename}
          />
        {:else}
          <button
            type="button"
            class="asset-open"
            data-media-type={asset.mediaType}
            aria-pressed={$selectedAssetId === asset.id}
            onclick={() => selectAsset(asset.id)}
          >
            {#if asset.thumbnailDataUrl}
              <img class="asset-thumb" src={asset.thumbnailDataUrl} alt="" />
            {:else}
              <span class="asset-icon">{asset.mediaType === 'image' ? '🖼' : asset.mediaType === 'audio' ? '♪' : '📄'}</span>
            {/if}
            <div class="asset-info">
              <span class="asset-name">{asset.label}</span>
              <span class="asset-size">{primaryAssetMetadata(asset)} · {formatAssetBytes(asset.sizeBytes)}</span>
            </div>
          </button>
          <button type="button" class="row-action" title="Rename asset label" aria-label={`Rename ${asset.label}`} onclick={(event) => startRename(event, asset.id)}>✎</button>
          <button type="button" class="row-action" title="Export asset" aria-label={`Export ${asset.label}`} onclick={() => void exportAsset(asset.id)}>⇩</button>
          <button type="button" class="row-action" title="Archive asset" aria-label={`Archive ${asset.label}`} onclick={() => void archiveAsset(asset.id)}>⧉</button>
        {/if}
      </div>
    {:else}
      <div class="list-empty">No assets match.</div>
    {/each}
  </div>

  {#if $archivedAssets.length > 0}
    <section class="archived-section">
      <button type="button" class="archived-header" onclick={() => archivedOpen = !archivedOpen}>
        <span>Archived</span>
        <span class="archived-count">{visibleArchivedAssets.length}</span>
      </button>
      {#if archivedOpen}
        <div class="archived-list">
          {#each visibleArchivedAssets as asset (asset.id)}
            <div class="archived-item" class:active={$selectedAssetId === asset.id}>
              <button type="button" class="archived-copy" onclick={() => selectAsset(asset.id)}>
                <span class="asset-name">{asset.label}</span>
                <span class="asset-size">{asset.extension.toUpperCase()} · {formatAssetBytes(asset.sizeBytes)}</span>
              </button>
              <button type="button" class="row-action restore-action" title="Restore asset" aria-label={`Restore ${asset.label}`} onclick={() => void restoreAsset(asset.id)}>↩</button>
            </div>
          {:else}
            <div class="list-empty compact">No archived assets match.</div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { justify-content: space-between; }
  .nav-icon-btn {
    width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
    border: none; border-radius: var(--radius-sm); background: transparent; color: var(--color-fg-muted);
    cursor: pointer; font-size: 16px; line-height: 1;
  }
  .nav-icon-btn:hover, .nav-icon-btn:focus-visible { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .nav-filter { flex: 0 0 auto; padding: var(--space-2) var(--space-2) 0; }
  .filter-input { width: 100%; height: 28px; padding: 0 var(--space-2); border: var(--border-subtle); border-radius: var(--radius-sm); background: var(--color-bg-base); color: var(--color-fg-primary); font-size: var(--font-size-xs); }
  .filter-input::placeholder { color: var(--color-fg-muted); }
  .filter-input:focus { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
  .asset-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .list-empty { padding: var(--space-3) var(--space-2); color: var(--color-fg-muted); font-size: var(--font-size-sm); }
  .list-empty.compact { padding: var(--space-2); font-size: var(--font-size-xs); }
  .asset-item {
    display: grid; grid-template-columns: minmax(0, 1fr) repeat(3, 24px); align-items: center; gap: var(--space-1);
    width: 100%; padding: var(--space-1); border-radius: var(--radius-md); text-align: left;
    color: var(--color-fg-secondary); transition: background 0.1s;
  }
  .asset-item:hover { background: var(--color-bg-overlay); }
  .asset-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .asset-open { display: flex; align-items: center; gap: var(--space-2); min-width: 0; padding: var(--space-1) var(--space-2); text-align: left; color: inherit; cursor: pointer; }
  .row-action { width: 22px; height: 22px; border-radius: var(--radius-sm); color: var(--color-fg-muted); opacity: 0; }
  .asset-item:hover .row-action, .asset-item.active .row-action, .archived-item:hover .row-action, .row-action:focus-visible { opacity: 1; }
  .row-action:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .asset-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
  .asset-thumb {
    width: 32px; height: 32px; flex-shrink: 0; border-radius: var(--radius-sm);
    object-fit: cover; background: var(--color-bg-overlay); border: var(--border-subtle);
  }
  .asset-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .asset-name { font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asset-size { font-size: var(--font-size-xs); color: var(--color-fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .archived-section { flex: 0 0 auto; border-top: 1px solid color-mix(in srgb, var(--accent-nav) 18%, var(--color-border)); padding: var(--space-2); }
  .archived-header {
    width: 100%; min-height: 28px; display: flex; align-items: center; justify-content: space-between;
    border: none; border-radius: var(--radius-sm); background: transparent;
    color: color-mix(in srgb, var(--accent-nav) 58%, var(--color-fg-muted));
    cursor: pointer; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0;
  }
  .archived-header:hover, .archived-header:focus-visible { background: var(--color-hover); color: var(--color-fg-primary); }
  .archived-count { color: var(--color-fg-muted); font-weight: 600; }
  .archived-list { max-height: 172px; overflow-y: auto; padding-top: var(--space-1); }
  .archived-item {
    display: grid; grid-template-columns: minmax(0, 1fr) 24px; align-items: center; gap: var(--space-1);
    min-height: 34px; padding: var(--space-1); border-radius: var(--radius-md); color: var(--color-fg-muted);
  }
  .archived-item:hover, .archived-item.active { background: var(--color-bg-overlay); }
  .archived-copy { min-width: 0; display: flex; flex-direction: column; gap: 1px; padding: 0 var(--space-2); text-align: left; color: inherit; }
  .restore-action { opacity: 1; }
  .nav-icon-btn:focus-visible, .archived-header:focus-visible, .row-action:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
</style>
