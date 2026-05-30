<script lang="ts">
  // Placeholder for Prompt Studio main view (template editor)
  let promptText = $state("Please summarize the following text in 3 bullet points:\n\n{{text}}");
</script>

<div class="main-view">
  <header>
    <h1>Summarize Document</h1>
    <div class="actions">
      <button class="btn primary" onclick={() => window.shell.commands.execute('promptstudio.run')}>
        Run Template
      </button>
    </div>
  </header>

  <div class="editor-container">
    <div class="section-title">Prompt Template</div>
    <textarea class="prompt-editor" bind:value={promptText} placeholder="Enter prompt template... Use {{variable}} for slots."></textarea>
    
    <div class="variables-panel">
      <div class="section-title">Variables</div>
      <div class="variable-row">
        <label for="var-text" class="var-name">text</label>
        <textarea id="var-text" class="var-input" placeholder="Value for {{text}}..."></textarea>
      </div>
    </div>
  </div>

  <div class="output-container">
    <div class="section-title">Output Preview</div>
    <div class="output-box">
      <span class="placeholder-text">Run template to see output...</span>
    </div>
  </div>
</div>

<style>
  .main-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--space-6) var(--space-8);
    gap: var(--space-6);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--space-4);
    border-bottom: var(--border-subtle);
  }

  h1 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
  }

  .btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-surface);
    color: var(--color-fg-default);
  }

  .btn.primary {
    background: var(--color-primary, #0366d6);
    color: white;
    border-color: transparent;
  }

  .btn.primary:hover {
    background: var(--color-primary-hover, #005cc5);
  }

  .section-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .editor-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    flex: 1;
  }

  .prompt-editor {
    flex: 1;
    min-height: 200px;
    padding: var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-surface);
    color: var(--color-fg-default);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    resize: none;
  }

  .prompt-editor:focus {
    outline: none;
    border-color: var(--color-primary, #0366d6);
  }

  .variables-panel {
    background: var(--color-bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }

  .variable-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    margin-top: var(--space-2);
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
  }

  .var-input {
    flex: 1;
    min-height: 60px;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-base);
    color: var(--color-fg-default);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    resize: vertical;
  }

  .output-container {
    display: flex;
    flex-direction: column;
    height: 30%;
  }

  .output-box {
    flex: 1;
    background: var(--color-bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder-text {
    color: var(--color-fg-muted);
    font-style: italic;
  }
</style>
