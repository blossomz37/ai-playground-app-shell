<!-- AI Chat InspectorView — context and settings -->
<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Context</h3>
    <p class="context-hint">The AI can access your active document for context-aware responses.</p>
    <div class="context-item">
      <span class="ctx-icon">📄</span>
      <span class="ctx-name">Active document attached</span>
    </div>
  </section>
  <section class="section">
    <h3 class="section-title">Model</h3>
    <div class="meta-grid">
      <span class="meta-label">Provider</span><span class="meta-value">Not configured</span>
      <span class="meta-label">Model</span><span class="meta-value">—</span>
      <span class="meta-label">Status</span><span class="meta-value status-mock">Mock mode</span>
    </div>
  </section>
</div>

<style>
  .inspector-view { padding: var(--space-4); }
  .section { margin-bottom: var(--space-5); }
  .section-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); margin-bottom: var(--space-3); }
  .context-hint { font-size: var(--font-size-sm); color: var(--color-fg-muted); margin-bottom: var(--space-2); }
  .context-item { display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-fg-secondary); padding: var(--space-2); background: var(--color-bg-overlay); border-radius: var(--radius-sm); }
  .ctx-icon { font-size: 14px; }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { color: var(--color-fg-secondary); }
  .status-mock { color: var(--color-warn); }
</style>
