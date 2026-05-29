<script lang="ts">
  import { activeDoc, editorContent, isDirty, saveDoc } from '../../store'

  function handleInput(e: Event) {
    editorContent.set((e.target as HTMLTextAreaElement).value)
    isDirty.set(true)
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      saveDoc()
    }
  }
</script>

<div class="main-view">
  {#if $activeDoc}
    <header class="doc-header">
      <h1 class="doc-title">{$activeDoc.title}</h1>
      <span class="doc-kind">{$activeDoc.kind}</span>
    </header>
    <!-- Editor placeholder: TipTap/ProseMirror wired in the editor-engine slice -->
    <div class="editor-area">
      <textarea
        class="editor-textarea"
        value={$editorContent}
        oninput={handleInput}
        onkeydown={handleKeydown}
        spellcheck={true}
        placeholder="Start writing…"
      ></textarea>
    </div>
  {:else}
    <div class="empty">
      <p>Select a document from the sidebar to begin.</p>
    </div>
  {/if}
</div>

<style>
  .main-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .doc-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    padding: var(--space-5) var(--space-6) var(--space-3);
    border-bottom: var(--border-subtle);
    flex-shrink: 0;
  }

  .doc-title {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-fg-primary);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-kind {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }

  .editor-area {
    flex: 1;
    overflow: hidden;
    display: flex;
  }

  .editor-textarea {
    flex: 1;
    resize: none;
    background: transparent;
    border: none;
    outline: none;
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
    line-height: var(--line-height);
    padding: var(--space-5) var(--space-6);
    overflow-y: auto;
  }

  .editor-textarea::placeholder { color: var(--color-fg-muted); }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-fg-muted);
  }
</style>
