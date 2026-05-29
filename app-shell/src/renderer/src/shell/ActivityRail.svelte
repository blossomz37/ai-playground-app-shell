<script lang="ts">
  import { activeModuleId } from '../store'

  const modules = [
    { id: 'shell.documents', label: 'Write', glyph: '✦' }
  ]
</script>

<nav class="activity-rail">
  <div class="rail-spacer"></div>
  {#each modules as mod}
    <button
      class="rail-btn"
      class:active={$activeModuleId === mod.id}
      title={mod.label}
      onclick={() => activeModuleId.set(mod.id)}
    >
      <span class="glyph">{mod.glyph}</span>
      <span class="label">{mod.label}</span>
    </button>
  {/each}
</nav>

<style>
  .activity-rail {
    grid-area: rail;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 48px; /* clear macOS traffic lights */
    background: var(--color-bg-surface);
    border-right: var(--border-subtle);
    gap: var(--space-1);
  }

  .rail-spacer { flex: 0 0 var(--space-2); }

  .rail-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    color: var(--color-fg-muted);
    gap: 2px;
    transition: color 0.1s, background 0.1s;
  }

  .rail-btn:hover { color: var(--color-fg-secondary); background: var(--color-bg-overlay); }

  .rail-btn.active {
    color: var(--color-accent);
    background: var(--color-accent-dim);
  }

  .glyph { font-size: 16px; line-height: 1; }
  .label { font-size: var(--font-size-xs); }
</style>
