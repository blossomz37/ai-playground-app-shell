<script lang="ts">
  import { renderMarkdown } from './markdown'

  interface Props {
    content: string
  }

  let { content }: Props = $props()
  let html = $derived(renderMarkdown(content))
</script>

<div class="markdown-content">
  {@html html}
</div>

<style>
  .markdown-content {
    color: inherit;
    font: inherit;
    line-height: inherit;
    overflow-wrap: anywhere;
  }

  .markdown-content :global(> *:first-child) {
    margin-top: 0;
  }

  .markdown-content :global(> *:last-child) {
    margin-bottom: 0;
  }

  .markdown-content :global(p),
  .markdown-content :global(ul),
  .markdown-content :global(ol),
  .markdown-content :global(pre),
  .markdown-content :global(.markdown-table-wrap) {
    margin: 0 0 var(--space-3);
  }

  .markdown-content :global(h1),
  .markdown-content :global(h2),
  .markdown-content :global(h3),
  .markdown-content :global(h4) {
    margin: var(--space-2) 0 var(--space-2);
    color: var(--color-fg-primary);
    font-weight: 700;
    line-height: 1.25;
  }

  .markdown-content :global(h1) { font-size: var(--font-size-xl); }
  .markdown-content :global(h2) { font-size: var(--font-size-lg); }
  .markdown-content :global(h3),
  .markdown-content :global(h4) { font-size: var(--font-size-md); }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    padding-left: var(--space-5);
  }

  .markdown-content :global(li + li) {
    margin-top: var(--space-1);
  }

  .markdown-content :global(code) {
    padding: 1px 4px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.92em;
  }

  .markdown-content :global(pre) {
    overflow-x: auto;
    padding: var(--space-3);
    border-radius: var(--radius-sm);
    background: var(--color-bg-base);
    border: var(--border-subtle);
  }

  .markdown-content :global(pre code) {
    display: block;
    padding: 0;
    background: transparent;
    white-space: pre;
  }

  .markdown-content :global(.markdown-table-wrap) {
    overflow-x: auto;
  }

  .markdown-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-xs);
  }

  .markdown-content :global(th),
  .markdown-content :global(td) {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    text-align: left;
    vertical-align: top;
  }

  .markdown-content :global(th) {
    background: var(--color-bg-active);
    color: var(--color-fg-primary);
    font-weight: 700;
  }

  .markdown-content :global(td) {
    background: color-mix(in srgb, var(--color-bg-surface) 70%, transparent);
  }

  .markdown-content :global(a) {
    color: var(--color-accent);
    text-decoration: underline;
  }
</style>
