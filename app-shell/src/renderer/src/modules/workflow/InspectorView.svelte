<!-- Workflow InspectorView — chain configuration -->
<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Chain Config</h3>
    <div class="meta-grid">
      <span class="meta-label">Provider</span><span class="meta-value">Mock Local</span>
      <span class="meta-label">Model</span><span class="meta-value">mock-durable-context-v1</span>
      <span class="meta-label">Context</span><span class="meta-value">Selected candidates</span>
      <span class="meta-label">Last Run</span><span class="meta-value">Never</span>
    </div>
  </section>
  <section class="section">
    <h3 class="section-title">Options</h3>
    <label class="option"><input type="checkbox" checked /> Include active document</label>
    <label class="option"><input type="checkbox" checked /> Include descendants</label>
    <label class="option"><input type="checkbox" /> Create proposal</label>
  </section>
</div>

<style>
  .inspector-view { padding: var(--space-4); }
  .section { margin-bottom: var(--space-5); }
  .section-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); margin-bottom: var(--space-3); }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { color: var(--color-fg-secondary); }
  .option { display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-fg-secondary); padding: var(--space-1) 0; cursor: pointer; }
  .option input { accent-color: var(--color-accent); }
</style>
