<!-- Web InspectorView — page info -->
<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Page Info</h3>
    <div class="meta-grid">
      <span class="meta-label">Title</span><span class="meta-value">Wikipedia</span>
      <span class="meta-label">URL</span><span class="meta-value url">wikipedia.org</span>
      <span class="meta-label">Protocol</span><span class="meta-value">HTTPS</span>
      <span class="meta-label">Session</span><span class="meta-value">Persistent</span>
    </div>
  </section>
</div>

<style>
  .inspector-view { padding: var(--space-4); }
  .section { margin-bottom: var(--space-5); }
  .section-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); margin-bottom: var(--space-3); }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { color: var(--color-fg-secondary); }
  .meta-value.url { font-family: var(--font-mono); font-size: var(--font-size-xs); word-break: break-all; }
</style>
