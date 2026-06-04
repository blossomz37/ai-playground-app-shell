<script lang="ts">
  import { activeDoc, versions, editorContent, countWords } from '../../store'
  import { slide } from 'svelte/transition'

  let collapsed = $state<string[]>([])

  function toggleSection(id: string) {
    collapsed = collapsed.includes(id)
      ? collapsed.filter(item => item !== id)
      : [...collapsed, id]
  }

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
      <button
        class="section-header"
        onclick={() => toggleSection('document')}
        aria-expanded={!collapsed.includes('document')}
        aria-label={`${collapsed.includes('document') ? 'Expand' : 'Collapse'} Document section`}
      >
        <span class="chevron">{collapsed.includes('document') ? '▶' : '▼'}</span>
        <h3 class="section-title">Document</h3>
      </button>
      {#if !collapsed.includes('document')}
        <div class="section-body" transition:slide={{ duration: 200 }}>
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
        </div>
      {/if}
    </section>

    <!-- Version history section -->
    <section class="section">
      <button
        class="section-header"
        onclick={() => toggleSection('history')}
        aria-expanded={!collapsed.includes('history')}
        aria-label={`${collapsed.includes('history') ? 'Expand' : 'Collapse'} History section`}
      >
        <span class="chevron">{collapsed.includes('history') ? '▶' : '▼'}</span>
        <h3 class="section-title">History</h3>
      </button>
      {#if !collapsed.includes('history')}
        <div class="section-body" transition:slide={{ duration: 200 }}>
          {#if $versions.length === 0}
            <p class="empty-text">No versions yet — save to create one.</p>
          {:else}
            <ul class="version-list">
              {#each $versions as v (v.id)}
                <li class="version-item">
                  <span class="v-date">{fmt(v.createdAt)}</span>
                  {#if v.label}<span class="v-label">{v.label}</span>{/if}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
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
    border-bottom: 1px solid color-mix(in srgb, var(--accent-inspector) 18%, var(--color-border));
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    min-height: 36px;
    padding: 0 var(--space-4);
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    color: inherit;
    transition: background 0.15s, color 0.15s;
  }

  .section-header:hover {
    background: var(--color-hover);
  }

  .chevron {
    font-size: 10px;
    color: var(--color-fg-muted);
    transition: transform 0.2s ease;
    flex-shrink: 0;
    width: 12px;
    text-align: center;
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

  .kind-badge {
    background: color-mix(in srgb, var(--accent-inspector) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 28%, transparent);
    color: color-mix(in srgb, var(--accent-inspector) 48%, var(--color-fg-primary));
    padding: 1px 7px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
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
