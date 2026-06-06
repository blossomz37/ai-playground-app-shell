<script lang="ts">
  import { onMount } from 'svelte'
  import type { ModuleCategory, ModuleListItem } from '@shared/module-contract'
  import { moduleList, loadModules, setModuleEnabled, setModuleVisible } from '../store/modules'

  let query = $state('')
  let savingId = $state<string | null>(null)
  const categoryOrder: ModuleCategory[] = ['required', 'core', 'custom']
  const categoryLabels: Record<ModuleCategory, string> = {
    required: 'Required',
    core: 'Core Plugins',
    custom: 'Custom Plugins'
  }

  const filteredModules = $derived(filterModules($moduleList, query))

  onMount(() => {
    void loadModules()
  })

  function filterModules(modules: ModuleListItem[], search: string): ModuleListItem[] {
    const normalized = search.trim().toLowerCase()
    const sorted = [...modules].sort((a, b) => {
      const categoryDelta = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
      return categoryDelta || a.name.localeCompare(b.name)
    })
    if (!normalized) return sorted
    return sorted.filter(module =>
      module.name.toLowerCase().includes(normalized)
      || module.id.toLowerCase().includes(normalized)
      || module.category.toLowerCase().includes(normalized)
    )
  }

  function modulesForCategory(category: ModuleCategory): ModuleListItem[] {
    return filteredModules.filter(module => module.category === category)
  }

  function statusText(module: ModuleListItem): string {
    if (module.required) return 'Required. Always available.'
    if (module.category === 'core') return module.visible ? 'Shown in navigation.' : 'Hidden from navigation.'
    return module.enabled ? 'Enabled.' : 'Disabled.'
  }

  async function toggleModule(module: ModuleListItem): Promise<void> {
    if (savingId) return
    savingId = module.id
    try {
      if (module.canHide) {
        await setModuleVisible(module.id, !module.visible)
      } else if (module.canDisable) {
        await setModuleEnabled(module.id, !module.enabled)
      }
    } finally {
      savingId = null
    }
  }
</script>

<section class="section">
  <h3 class="section-title">Core & Custom Plugins</h3>

  <label class="search-label" for="settings-module-search">Search plugins</label>
  <input
    id="settings-module-search"
    class="search-input"
    type="search"
    bind:value={query}
    placeholder="Search modules"
  />

  <div class="plugin-groups">
    {#each categoryOrder as category (category)}
      {@const rows = modulesForCategory(category)}
      {#if rows.length}
        <div class="plugin-group">
          <h4 class="group-title">{categoryLabels[category]}</h4>
          <div class="plugin-list">
            {#each rows as module (module.id)}
              <div class="plugin-row">
                <div class="plugin-copy">
                  <span class="plugin-name">{module.name}</span>
                  <span class="plugin-meta">{statusText(module)}</span>
                </div>

                {#if module.required}
                  <span class="locked-pill">Locked</span>
                {:else}
                  <div class="toggle-wrap">
                    <span class="toggle-label">{module.canHide ? 'Show' : 'Enable'}</span>
                    <button
                      class="toggle-btn"
                      class:active={module.canHide ? module.visible : module.enabled}
                      type="button"
                      role="switch"
                      aria-checked={module.canHide ? module.visible : module.enabled}
                      aria-label={`${module.canHide ? 'Show' : 'Enable'} ${module.name}`}
                      disabled={savingId === module.id}
                      onclick={() => toggleModule(module)}
                    >
                      <span class="toggle-knob"></span>
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
</section>

<style>
  .section {
    margin-bottom: var(--space-5);
  }

  .section-title,
  .group-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .section-title {
    margin-bottom: var(--space-3);
  }

  .search-label {
    display: block;
    margin-bottom: var(--space-1);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
  }

  .search-input {
    width: 100%;
    margin-bottom: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-overlay);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    outline: none;
  }

  .search-input:focus {
    border-color: var(--color-accent);
  }

  .plugin-groups {
    display: grid;
    gap: var(--space-4);
  }

  .plugin-group {
    display: grid;
    gap: var(--space-2);
  }

  .plugin-list {
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--color-bg-overlay);
  }

  .plugin-row {
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--border-subtle);
  }

  .plugin-row:last-child {
    border-bottom: 0;
  }

  .plugin-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .plugin-name {
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .plugin-meta {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    line-height: 1.35;
  }

  .locked-pill {
    flex-shrink: 0;
    padding: 3px var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  .toggle-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .toggle-label {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    line-height: 1;
  }

  .toggle-wrap:has(.toggle-btn.active) .toggle-label {
    color: var(--color-fg-primary);
  }

  .toggle-btn {
    position: relative;
    width: 40px;
    height: 22px;
    flex-shrink: 0;
    border: 1px solid var(--color-border);
    border-radius: 11px;
    background: var(--color-bg-surface);
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .toggle-btn.active {
    background: var(--color-accent-dim);
    border-color: var(--color-accent);
  }

  .toggle-btn:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  .toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-fg-muted);
    transition: transform 0.2s, background 0.2s;
  }

  .toggle-btn.active .toggle-knob {
    transform: translateX(18px);
    background: var(--color-accent);
  }
</style>
