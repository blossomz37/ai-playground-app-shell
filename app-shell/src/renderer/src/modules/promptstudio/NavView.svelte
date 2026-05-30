<script lang="ts">
  // Placeholder for Prompt Studio navigation (template list)
</script>

<div class="nav-view">
  <header>
    <h2>Templates</h2>
    <button class="btn-icon" title="New Template" onclick={() => window.shell.commands.execute('promptstudio.new')}>
      <span class="icon">➕</span>
    </button>
  </header>

  <div class="template-list">
    <div class="template-item active">
      <div class="template-title">Summarize Document</div>
      <div class="template-meta">Last run: Today</div>
    </div>
    <div class="template-item">
      <div class="template-title">Extract Entities</div>
      <div class="template-meta">Last run: 2d ago</div>
    </div>
  </div>
</div>

<style>
  .nav-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  header {
    padding: var(--space-4);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: var(--border-subtle);
  }

  h2 {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .btn-icon {
    background: transparent;
    border: none;
    color: var(--color-fg-muted);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
  }

  .btn-icon:hover {
    background: var(--color-bg-hover);
    color: var(--color-fg-default);
  }

  .template-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .template-item {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    cursor: pointer;
    margin-bottom: var(--space-1);
  }

  .template-item:hover {
    background: var(--color-bg-hover);
  }

  .template-item.active {
    background: var(--color-bg-active);
  }

  .template-title {
    font-size: var(--font-size-sm);
    font-weight: 500;
    margin-bottom: var(--space-1);
  }

  .template-meta {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
  }
</style>
