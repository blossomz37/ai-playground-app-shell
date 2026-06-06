<!-- Assets InspectorView — metadata panel -->
<script lang="ts">
  import { formatAssetBytes, primaryAssetMetadata, renameAsset, selectedAsset, updateAssetDetails } from './state'

  let asset = $derived($selectedAsset)

  async function saveLabel(value: string): Promise<void> {
    if (!asset) return
    const label = value.trim()
    if (!label || label === asset.label) return
    await renameAsset(asset.id, label)
  }

  async function saveComments(value: string): Promise<void> {
    if (!asset || value === asset.comments) return
    await updateAssetDetails(asset.id, { comments: value })
  }

  async function saveTags(value: string): Promise<void> {
    if (!asset) return
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean)
    if (tags.join('|') === asset.tags.join('|')) return
    await updateAssetDetails(asset.id, { tags })
  }
</script>

<div class="inspector-view">
  {#if asset}
    <section class="section">
      <h3 class="section-title">Asset Info</h3>
      <div class="meta-grid">
        <label class="meta-label" for="asset-label">Label</label>
        <input
          id="asset-label"
          class="field compact"
          aria-label="Asset label"
          value={asset.label}
          onblur={(event) => void saveLabel(event.currentTarget.value)}
        />
      </div>
    </section>

    <section class="section">
      <div class="section-row">
        <h3 class="section-title">Source & Technical</h3>
        <span class="readonly-badge">Read-only</span>
      </div>
      <div class="meta-grid">
        <span class="meta-label">Original</span><span class="meta-value">{asset.originalName}</span>
        <span class="meta-label">Media</span><span class="meta-value">{asset.mediaType}</span>
        <span class="meta-label">Extension</span><span class="meta-value">{asset.extension || 'None'}</span>
        <span class="meta-label">MIME</span><span class="meta-value">{asset.mimeType}</span>
        <span class="meta-label">Primary</span><span class="meta-value">{primaryAssetMetadata(asset)}</span>
        <span class="meta-label">Size</span><span class="meta-value">{formatAssetBytes(asset.sizeBytes)}</span>
        <span class="meta-label">Created</span><span class="meta-value">{asset.fileCreatedAt ?? 'Unknown'}</span>
        <span class="meta-label">Modified</span><span class="meta-value">{asset.fileModifiedAt ?? 'Unknown'}</span>
        <span class="meta-label">Imported</span><span class="meta-value">{asset.importedAt}</span>
        <span class="meta-label">Checksum</span><span class="meta-value checksum">{asset.checksum ?? 'Unknown'}</span>
        <span class="meta-label">Path</span><span class="meta-value path">{asset.filePath ?? 'Not imported'}</span>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">Tags</h3>
      <input
        class="field"
        aria-label="Asset tags"
        value={asset.tags.join(', ')}
        onblur={(event) => void saveTags(event.currentTarget.value)}
        placeholder="cover, reference, research"
      />
    </section>

    <section class="section">
      <h3 class="section-title">Comments</h3>
      <textarea
        class="comments"
        aria-label="Asset comments"
        value={asset.comments}
        onblur={(event) => void saveComments(event.currentTarget.value)}
        placeholder="Add notes about this asset"
      ></textarea>
    </section>

    <section class="section">
      <h3 class="section-title">Links</h3>
      <p class="usage-hint">{asset.workspaceLinks.length} workspace link{asset.workspaceLinks.length === 1 ? '' : 's'}</p>
      <p class="usage-hint">{asset.documentLinks.length} document link{asset.documentLinks.length === 1 ? '' : 's'}</p>
    </section>
  {/if}
</div>

<style>
  .inspector-view { padding: var(--space-4); }
  .section { margin-bottom: var(--space-5); }
  .section-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
  .section-title {
    font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--color-fg-muted); margin-bottom: var(--space-3);
  }
  .section-row .section-title { margin-bottom: 0; }
  .readonly-badge { font-size: var(--font-size-xs); color: var(--color-fg-muted); }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { min-width: 0; color: var(--color-fg-secondary); overflow-wrap: anywhere; }
  .checksum { font-family: var(--font-mono); font-size: var(--font-size-xs); }
  .path { font-size: var(--font-size-xs); }
  .field, .comments {
    width: 100%; border: var(--border-subtle); border-radius: var(--radius-sm);
    background: var(--color-bg-overlay); color: var(--color-fg-primary);
    font: inherit; font-size: var(--font-size-sm); padding: var(--space-2);
  }
  .field.compact { padding: var(--space-1) var(--space-2); }
  .comments { min-height: 86px; resize: vertical; }
  .field:focus-visible, .comments:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
  .usage-hint { font-size: var(--font-size-sm); color: var(--color-fg-muted); margin: 0 0 var(--space-1); }
</style>
