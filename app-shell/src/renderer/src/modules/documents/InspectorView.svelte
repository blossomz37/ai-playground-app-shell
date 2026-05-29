<script lang="ts">
  import { activeDoc, versions, editorContent, countWords } from '../../store'

  function fmt(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }
</script>

<div class="inspector-view">
  {#if $activeDoc}
    <!-- Metadata section -->
    <section class="section">
      <h3 class="section-title">Document</h3>
      <div class="field">
        <span class="label">Title</span>
        <span class="value">{$activeDoc.title}</span>
      </div>
      <div class="field">
        <span class="label">Kind</span>
        <span class="value kind-badge">{$activeDoc.kind}</span>
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
    </section>

    <!-- Version history section -->
    <section class="section">
      <h3 class="section-title">History</h3>
      {#if $versions.length === 0}
        <p class="empty-text">No versions yet — save to create one.</p>
      {:else}
        <ul class="version-list">
          {#each $versions as v}
            <li class="version-item">
              <span class="v-date">{fmt(v.createdAt)}</span>
              {#if v.label}<span class="v-label">{v.label}</span>{/if}
            </li>
          {/each}
        </ul>
      {/if}
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
    padding: var(--space-4);
    border-bottom: var(--border-subtle);
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-3);
  }

  .field {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-2);
    padding: 3px 0;
    font-size: var(--font-size-sm);
  }

  .label { color: var(--color-fg-muted); flex-shrink: 0; }
  .value { color: var(--color-fg-secondary); text-align: right; overflow: hidden; text-overflow: ellipsis; }

  .kind-badge {
    background: var(--color-bg-overlay);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .empty-text {
    font-size: var(--font-size-sm);
    color: var(--color-fg-muted);
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
    padding: var(--space-2);
    background: var(--color-bg-overlay);
    border-radius: var(--radius-sm);
  }

  .v-date  { font-size: var(--font-size-xs); color: var(--color-fg-secondary); }
  .v-label { font-size: var(--font-size-xs); color: var(--color-fg-muted); font-style: italic; }

  .empty {
    padding: var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-fg-muted);
  }
</style>
