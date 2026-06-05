<script lang="ts">
  import { activeDoc, versions, editorContent, countWords, updateDoc } from '../../store'

  const docKinds = ['folder', 'chapter', 'scene', 'plan']

  function fmt(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  async function onKindChange(event: Event): Promise<void> {
    const doc = $activeDoc
    if (!doc) return

    const kind = (event.currentTarget as HTMLSelectElement).value
    if (kind === doc.kind) return
    await updateDoc(doc.id, { kind })
  }

  async function onIconChange(event: Event): Promise<void> {
    const doc = $activeDoc
    if (!doc) return

    const icon = (event.currentTarget as HTMLInputElement).value.trim()
    if (icon === (doc.icon ?? '')) return
    await updateDoc(doc.id, { icon: icon === '' ? null : icon })
  }
</script>

<div class="inspector-view">
  {#if $activeDoc}
    <section class="section">
      <div class="section-header">
        <h3 class="section-title">Document</h3>
      </div>
      <div class="section-body">
        <div class="field">
          <span class="label">Title</span>
          <span class="value">{$activeDoc.title}</span>
        </div>
        <div class="field">
          <label class="label" for="document-kind">Kind</label>
          <select id="document-kind" class="kind-select" value={$activeDoc.kind} onchange={onKindChange}>
            {#each docKinds as kind (kind)}
              <option value={kind}>{kind}</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label class="label" for="document-icon">Icon</label>
          <input
            id="document-icon"
            class="icon-input"
            type="text"
            maxlength="8"
            value={$activeDoc.icon ?? ''}
            placeholder={$activeDoc.kind === 'folder' ? '📁' : '📄'}
            onchange={onIconChange}
          />
        </div>
        <div class="field">
          <span class="label">Words</span>
          <span class="value">{countWords($editorContent)}</span>
        </div>
        <div class="field">
          <span class="label">Format</span>
          <span class="value">{$activeDoc.contentFormat}</span>
        </div>
        <div class="field">
          <span class="label">Created</span>
          <span class="value">{fmt($activeDoc.createdAt)}</span>
        </div>
        <div class="field">
          <span class="label">Updated</span>
          <span class="value">{fmt($activeDoc.updatedAt)}</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">Snapshots</h3>
      </div>
      <div class="section-body">
        {#if $versions.length === 0}
          <p class="empty-text">No snapshots yet. Earlier saved text will appear here after this document changes.</p>
        {:else}
          <ul class="version-list" aria-label="Snapshots">
            {#each $versions as v (v.id)}
              <li class="version-item">
                <span class="v-date">{fmt(v.createdAt)}</span>
                {#if v.label}<span class="v-label">{v.label}</span>{/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </section>
  {:else}
    <div class="empty">Select a document to inspect.</div>
  {/if}
</div>

<style>
  .inspector-view {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .section {
    border-bottom: 1px solid color-mix(in srgb, var(--accent-inspector) 18%, var(--color-border));
  }

  .section-header {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 36px;
    padding: var(--space-3) var(--space-4) 0;
    text-align: left;
    color: inherit;
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--accent-inspector) 62%, var(--color-fg-muted));
    margin: 0;
  }

  .section-body {
    padding: var(--space-2) var(--space-4) var(--space-4);
  }

  .field {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-3);
    padding: 4px 0;
    font-size: var(--font-size-sm);
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 36%, transparent);
  }

  .field:last-child {
    border-bottom: none;
  }

  .label {
    color: var(--color-fg-muted);
    flex-shrink: 0;
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }

  .value {
    color: var(--color-fg-secondary);
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kind-select,
  .icon-input {
    min-width: 110px;
    max-width: 150px;
    padding: 2px var(--space-2);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 24%, var(--color-border));
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-shell-main) 48%, transparent);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
    text-align: right;
  }

  .icon-input {
    width: 110px;
  }

  .kind-select:focus-visible,
  .icon-input:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }

  .kind-select option {
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
  }

  .empty-text {
    font-size: var(--font-size-sm);
    color: var(--color-fg-muted);
    line-height: 1.55;
  }

  .version-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .version-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-2) var(--space-3);
    background: color-mix(in srgb, var(--color-shell-main) 40%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 18%, var(--color-border));
    border-left: 3px solid var(--accent-inspector);
    border-radius: var(--radius-md);
  }

  .v-date  { font-size: var(--font-size-xs); color: var(--color-fg-secondary); }
  .v-label { font-size: var(--font-size-xs); color: var(--color-fg-muted); font-style: italic; }

  .empty {
    padding: var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-fg-muted);
  }
</style>
