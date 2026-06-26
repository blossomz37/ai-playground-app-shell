<script lang="ts">
  import { BookOpenIcon, BriefcaseIcon } from 'phosphor-svelte'
  import { activeWorkspace, archivedWorkspaces, switchWorkspace, workspaces, workspaceId } from '../store'
  import { executeCommand } from '../store/commands'

  let { mode = 'rail' }: { mode?: 'rail' | 'sidebar' } = $props()
  let menuOpen = $state(false)
  let busyId = $state<string | null>(null)
  let error = $state<string | null>(null)
  let switcherElement: HTMLDivElement | undefined = $state()

  const isSidebarMode = $derived(mode === 'sidebar')
  const switchableWorkspaces = $derived($workspaces.filter((workspace) => workspace.id !== $workspaceId))

  function closeMenu(): void {
    menuOpen = false
  }

  function onDocumentClick(event: MouseEvent): void {
    if (!menuOpen || !switcherElement) return
    if (event.target instanceof Node && switcherElement.contains(event.target)) return
    closeMenu()
  }

  function trackSwitcher(node: HTMLDivElement): () => void {
    switcherElement = node
    return () => {
      if (switcherElement === node) switcherElement = undefined
    }
  }

  async function onWorkspaceSelect(id: string): Promise<void> {
    if (!id || id === $workspaceId) return
    busyId = id
    error = null
    try {
      await switchWorkspace(id)
      closeMenu()
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    } finally {
      busyId = null
    }
  }

  async function openProjectsHub(): Promise<void> {
    closeMenu()
    await executeCommand('projects.open')
  }
</script>

<svelte:window onkeydown={(event) => {
  if (event.key === 'Escape' && menuOpen && !isSidebarMode) closeMenu()
}} />
<svelte:document onclick={onDocumentClick} />

<div class:workspace-switcher={!isSidebarMode} class:workspace-sidebar={isSidebarMode} {@attach trackSwitcher}>
  {#if !isSidebarMode}
    <button
      class="workspace-button"
      type="button"
      title={$activeWorkspace?.name ?? 'Workspace'}
      aria-label={`Project menu, current project ${$activeWorkspace?.name ?? 'Workspace'}`}
      aria-expanded={menuOpen}
      aria-haspopup="menu"
      onclick={() => menuOpen = !menuOpen}
    >
      <BookOpenIcon size={20} weight="regular" />
    </button>
  {/if}

  {#if menuOpen || isSidebarMode}
    <div
      class="workspace-menu"
      class:inline={isSidebarMode}
      role={isSidebarMode ? 'region' : 'menu'}
      aria-label="Project switcher"
    >
      <header class="workspace-current">
        <span class="field-label">Current project</span>
        <div class="workspace-current-summary">
          <span class="workspace-current-name">{$activeWorkspace?.name ?? 'Workspace'}</span>
          <span class="workspace-current-type">{$activeWorkspace?.type ?? 'default'}</span>
        </div>
      </header>

      <section class="workspace-section" aria-label="Open project">
        <div class="section-heading">
          <span>Projects</span>
          <span>{$workspaces.length}</span>
        </div>
        {#if switchableWorkspaces.length > 0}
          <div class="workspace-list">
            {#each switchableWorkspaces as workspace (workspace.id)}
              <button
                class="workspace-row"
                type="button"
                role="menuitem"
                disabled={busyId !== null}
                onclick={() => onWorkspaceSelect(workspace.id)}
              >
                <span>{workspace.name}</span>
                <span>{workspace.type}</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="workspace-empty">No other active projects</p>
        {/if}
      </section>

      <section class="workspace-section manage-section" aria-label="Manage projects">
        <button class="workspace-action" type="button" onclick={openProjectsHub}>
          <BriefcaseIcon size={14} weight="bold" aria-hidden="true" />
          <span>Manage Projects</span>
        </button>
        <p class="workspace-note">Archived: {$archivedWorkspaces.length}</p>
      </section>

      {#if error}
        <p class="workspace-error">{error}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .workspace-switcher {
    position: relative;
    display: flex;
    justify-content: center;
    width: 100%;
    padding-bottom: var(--space-2);
  }

  .workspace-sidebar {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .workspace-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: var(--color-fg-primary);
    background: color-mix(in srgb, var(--accent-editor) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-editor) 32%, var(--color-border));
    box-shadow: inset 0 1px 0 var(--color-panel-glint);
  }

  .workspace-button:hover,
  .workspace-button:focus-visible {
    background: var(--color-hover);
    border-color: color-mix(in srgb, var(--accent-editor) 52%, var(--color-border));
    box-shadow: var(--shadow-active-glow);
  }

  .workspace-menu {
    position: absolute;
    top: 0;
    left: calc(100% + var(--space-2));
    z-index: 500;
    width: min(320px, calc(100vw - 72px));
    max-height: min(520px, calc(100vh - 32px));
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
    border: var(--border-zone);
    border-radius: var(--radius-md);
    background: var(--color-shell-sidebar);
    box-shadow: var(--shadow-panel);
  }

  .workspace-menu.inline {
    position: static;
    z-index: auto;
    width: 100%;
    max-height: 100%;
    border: none;
    border-radius: 0;
    border-bottom: var(--border-subtle);
    box-shadow: none;
  }

  .workspace-current,
  .workspace-section {
    display: grid;
    gap: var(--space-2);
  }

  .workspace-section {
    padding-top: var(--space-3);
    border-top: var(--border-subtle);
  }

  .field-label,
  .section-heading {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .workspace-current-summary,
  .workspace-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    gap: var(--space-2);
    min-height: 30px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
  }

  .workspace-row {
    width: 100%;
    color: var(--color-fg-secondary);
    text-align: left;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
  }

  .workspace-row:hover:not(:disabled) {
    background: var(--color-hover);
  }

  .workspace-current-name,
  .workspace-row span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
    font-weight: 650;
  }

  .workspace-current-type,
  .workspace-row span:last-child {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  .workspace-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 32px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--accent-nav) 11%, transparent);
    color: var(--color-fg-primary);
    border: 1px solid color-mix(in srgb, var(--accent-nav) 30%, var(--color-border));
    font-size: var(--font-size-sm);
    font-weight: 650;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .workspace-error {
    margin: 0;
    color: var(--color-danger);
    font-size: var(--font-size-xs);
  }

  .workspace-empty,
  .workspace-note {
    margin: 0;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }
</style>
