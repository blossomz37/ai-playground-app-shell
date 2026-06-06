<script lang="ts">
  import { addDocumentKind, documentKindOptions, removeDocumentKind, renameDocumentKind } from '../store'
  import { UNCATEGORIZED_KIND_LABEL } from '@shared/document-kinds'

  let newKindLabel = $state('')
  let busy = $state(false)

  async function addKind(): Promise<void> {
    if (busy) return
    const label = newKindLabel.trim()
    if (!label) return
    busy = true
    try {
      const option = await addDocumentKind(label)
      if (option) newKindLabel = ''
    } finally {
      busy = false
    }
  }

  async function renameKind(id: string, label: string): Promise<void> {
    if (!label.trim()) return
    await renameDocumentKind(id, label)
  }

  async function onNewKindKeydown(event: KeyboardEvent): Promise<void> {
    if (event.key !== 'Enter') return
    event.preventDefault()
    await addKind()
  }
</script>

<section id="settings-document-kinds" class="section">
  <h3 class="section-title">Document Kinds</h3>

  <div class="kind-row locked">
    <span>{UNCATEGORIZED_KIND_LABEL}</span>
    <span class="locked-label">Default</span>
  </div>

  <div class="kind-list">
    {#each $documentKindOptions as option (option.id)}
      <div class="kind-row">
        <input
          class="kind-input"
          type="text"
          value={option.label}
          aria-label={`Rename ${option.label}`}
          onblur={(event) => renameKind(option.id, event.currentTarget.value)}
          onkeydown={(event) => {
            if (event.key === 'Enter') void renameKind(option.id, event.currentTarget.value)
          }}
        />
        <button
          class="remove-btn"
          type="button"
          title="Remove kind option"
          aria-label={`Remove ${option.label}`}
          onclick={() => removeDocumentKind(option.id)}
        >
          Remove
        </button>
      </div>
    {/each}
  </div>

  <div class="add-row">
    <label class="field-label" for="settings-document-kind-new">New kind</label>
    <div class="add-controls">
      <input
        id="settings-document-kind-new"
        class="kind-input"
        type="text"
        bind:value={newKindLabel}
        placeholder="Research Note"
        onkeydown={(event) => void onNewKindKeydown(event)}
      />
      <button class="add-btn" type="button" disabled={busy || !newKindLabel.trim()} onclick={addKind}>Add</button>
    </div>
  </div>
</section>

<style>
  .section {
    margin-bottom: var(--space-5);
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-3);
  }

  .kind-list {
    display: grid;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .kind-row,
  .add-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .kind-row.locked {
    min-height: 32px;
    justify-content: space-between;
    margin-bottom: var(--space-2);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
  }

  .locked-label {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  .kind-input {
    width: 100%;
    min-width: 0;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-overlay);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    outline: none;
  }

  .kind-input:focus {
    border-color: var(--color-accent);
  }

  .remove-btn,
  .add-btn {
    min-height: 32px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
    flex-shrink: 0;
  }

  .remove-btn:hover,
  .add-btn:hover:not(:disabled) {
    background: var(--color-bg-active);
    color: var(--color-fg-primary);
  }

  .add-row {
    display: grid;
    gap: var(--space-1);
  }

  .field-label {
    font-size: var(--font-size-sm);
    color: var(--color-fg-secondary);
  }
</style>
