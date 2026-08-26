<script lang="ts">
  type CommitHandler = (value: string) => void | Promise<void>

  let {
    value,
    ariaLabel,
    onCommit,
    onCancel
  }: {
    value: string
    ariaLabel: string
    onCommit: CommitHandler
    onCancel: () => void
  } = $props()

  let draft = $derived(value)
  let finishing = false

  function inputHost(node: HTMLInputElement): void {
    queueMicrotask(() => {
      node.focus()
      node.select()
    })
  }

  async function commit(): Promise<void> {
    if (finishing) return
    finishing = true
    try {
      await onCommit(draft.trim())
    } finally {
      finishing = false
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      void commit()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      finishing = true
      onCancel()
    }
  }
</script>

<input
  class="inline-rename"
  bind:value={draft}
  aria-label={ariaLabel}
  {@attach inputHost}
  onkeydown={onKeydown}
  onblur={commit}
/>

<style>
  .inline-rename {
    min-width: 0;
    flex: 1;
    height: 24px;
    border: 1px solid color-mix(in srgb, var(--accent-nav) 48%, var(--color-border));
    border-radius: var(--radius-sm);
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    font: inherit;
    padding: 0 var(--space-2);
    outline: none;
  }

  .inline-rename:focus {
    border-color: var(--color-focus-ring);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-focus-ring) 24%, transparent);
  }
</style>
