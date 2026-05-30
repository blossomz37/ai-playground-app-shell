<script lang="ts">
  // Placeholder for Prompt Studio main view (template editor)
  const templatePlaceholder = 'Enter prompt template... Use {{variable}} for slots.'
  const textPlaceholder = 'Value for {{text}}...'

  let promptText = $state("Please summarize the following text in 3 bullet points:\n\n{{text}}")
</script>

<div class="main-view">
  <header class="template-header">
    <div class="title-block">
      <h1>Summarize Document</h1>
    </div>
    <div class="actions">
      <button class="btn primary" onclick={() => window.shell.commands.execute('promptstudio.run')}>
        Run Template
      </button>
    </div>
  </header>

  <div class="template-workspace">
    <section class="template-section prompt-section">
      <div class="section-title">Prompt Template</div>
      <textarea class="prompt-editor" bind:value={promptText} placeholder={templatePlaceholder}></textarea>
    </section>

    <section class="template-section variables-section">
      <div class="section-title">Variables</div>
      <div class="variable-row">
        <label for="var-text" class="var-name">text</label>
        <textarea id="var-text" class="var-input" placeholder={textPlaceholder}></textarea>
      </div>
    </section>

    <section class="template-section output-section">
      <div class="section-title">Output Preview</div>
      <div class="output-box">
        <span class="placeholder-text">Run template to see output...</span>
      </div>
    </section>
  </div>
</div>

<style>
  .main-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .template-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    border-bottom: var(--border-subtle);
    flex-shrink: 0;
  }

  .title-block {
    min-width: 0;
  }

  h1 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    line-height: 1.25;
    color: var(--color-fg-primary);
  }

  .btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
  }

  .btn.primary {
    background: var(--color-accent-dim);
    border-color: var(--color-accent);
    color: var(--color-fg-primary);
  }

  .btn.primary:hover {
    background: var(--color-accent);
    color: var(--color-bg-base);
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .template-workspace {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .template-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    border-bottom: var(--border-subtle);
  }

  .prompt-section {
    flex: 1 1 auto;
    min-height: 220px;
  }

  .variables-section {
    flex: 0 0 auto;
    background: color-mix(in srgb, var(--color-bg-surface) 35%, transparent);
  }

  .output-section {
    flex: 0 0 112px;
    border-bottom: none;
  }

  .prompt-editor {
    flex: 1;
    min-height: 0;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    line-height: 1.65;
    resize: none;
  }

  .prompt-editor:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .variable-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .var-name {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    background: var(--color-bg-active);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    min-width: 80px;
    text-align: right;
    color: var(--color-fg-primary);
  }

  .var-input {
    flex: 1;
    min-height: 58px;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    resize: vertical;
  }

  .var-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .output-box {
    flex: 1;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    border: 1px dashed var(--color-border);
  }

  .placeholder-text {
    color: var(--color-fg-muted);
    font-style: italic;
  }
</style>
