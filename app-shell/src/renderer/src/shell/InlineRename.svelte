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

  let draft = $state(value)

  $effect(() => {
    draft = value
  })

  function inputHost(node: HTMLInputElement): void {
    queueMicrotask(() => {
      node.focus()
      node.select()
    })
  }

  function commit(): void {
    void onCommit(draft.trim())
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
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
