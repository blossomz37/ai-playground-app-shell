<!-- Journal MainView — today's entry editor -->
<script lang="ts">
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  let content = $state('## Morning Thoughts\n\nStarted the day reflecting on progress with the app shell project. The module system is coming together nicely.\n\n## Tasks\n\n- [x] Review module contract\n- [ ] Design journal schema\n- [ ] Build entry templates')
</script>

<div class="main-view">
  <header class="entry-header">
    <h1 class="entry-date">{today}</h1>
    <span class="entry-badge">Today</span>
  </header>
  <div class="entry-content">
    <textarea
      class="entry-editor"
      bind:value={content}
      spellcheck="true"
      placeholder="Write your thoughts..."
    ></textarea>
  </div>
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .entry-header {
    display: flex; align-items: baseline; gap: var(--space-3);
    padding: var(--space-5) var(--space-6) var(--space-3); border-bottom: var(--border-subtle); flex-shrink: 0;
  }
  .entry-date { font-size: var(--font-size-xl); font-weight: 600; color: var(--color-fg-primary); }
  .entry-badge {
    font-size: var(--font-size-xs); color: var(--color-accent); background: var(--color-accent-dim);
    padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 500;
  }
  .entry-content { flex: 1; overflow: hidden; display: flex; }
  .entry-editor {
    flex: 1; padding: var(--space-5) var(--space-6); background: transparent; border: none;
    color: var(--color-fg-primary); font-family: var(--font-serif); font-size: var(--font-size-lg);
    line-height: var(--line-height); resize: none; outline: none; max-width: 72ch;
  }
</style>
