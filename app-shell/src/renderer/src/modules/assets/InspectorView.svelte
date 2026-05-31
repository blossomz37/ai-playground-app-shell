<!-- Assets InspectorView — metadata panel -->
<script lang="ts">
  import { selectedAsset } from './state'

  let asset = $derived($selectedAsset)
</script>

<div class="inspector-view">
  {#if asset}
    <section class="section">
      <h3 class="section-title">Asset Info</h3>
      <div class="meta-grid">
        <span class="meta-label">Name</span><span class="meta-value">{asset.name}</span>
        <span class="meta-label">Type</span><span class="meta-value">{asset.kindLabel}</span>
        <span class="meta-label">Dimensions</span><span class="meta-value">{asset.dimensions}</span>
        {#if asset.pageCount !== null}
          <span class="meta-label">Pages</span><span class="meta-value">{asset.pageCount}</span>
        {/if}
        {#if asset.title}
          <span class="meta-label">Title</span><span class="meta-value">{asset.title}</span>
        {/if}
        {#if asset.author}
          <span class="meta-label">Author</span><span class="meta-value">{asset.author}</span>
        {/if}
        <span class="meta-label">Size</span><span class="meta-value">{asset.size}</span>
        <span class="meta-label">Added</span><span class="meta-value">{asset.added}</span>
        <span class="meta-label">Path</span><span class="meta-value">{asset.filePath ?? 'Not imported'}</span>
      </div>
    </section>
    <section class="section">
      <h3 class="section-title">Usage</h3>
      <p class="usage-hint">{asset.usage}</p>
    </section>
  {/if}
</div>

<style>
  .inspector-view { padding: var(--space-4); }
  .section { margin-bottom: var(--space-5); }
  .section-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); margin-bottom: var(--space-3); }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { color: var(--color-fg-secondary); }
  .usage-hint { font-size: var(--font-size-sm); color: var(--color-fg-muted); }
</style>
