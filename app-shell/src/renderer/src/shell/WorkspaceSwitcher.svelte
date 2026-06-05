<script lang="ts">
  import { CaretRightIcon, PlusIcon } from 'phosphor-svelte'
  import {
    activeWorkspace,
    createWorkspace as createWorkspaceAction,
    switchWorkspace,
    workspaces,
    workspaceId
  } from '../store'

  let menuOpen = $state(false)
  let createWorkspaceOpen = $state(false)
  let workspaceName = $state('')
  let workspaceType = $state('authoring')
  let workspaceBusy = $state(false)
  let workspaceError = $state<string | null>(null)

  let workspaceInitial = $derived(($activeWorkspace?.name ?? 'Workspace').trim().charAt(0).toUpperCase() || 'W')
  let switchableWorkspaces = $derived($workspaces.filter((workspace) => workspace.id !== $workspaceId))

  async function onWorkspaceSelect(id: string): Promise<void> {
    if (!id || id === $workspaceId) return
    await switchWorkspace(id)
    menuOpen = false
  }

  async function onCreateWorkspace(): Promise<void> {
    if (!workspaceName.trim()) return
    workspaceBusy = true
    workspaceError = null
    try {
      await createWorkspaceAction({ name: workspaceName, type: workspaceType })
      workspaceName = ''
      workspaceType = 'authoring'
      createWorkspaceOpen = false
      menuOpen = false
    } catch (err) {
      workspaceError = err instanceof Error ? err.message : String(err)
    } finally {
      workspaceBusy = false
    }
  }
</script>

<div class="workspace-switcher">
  <button
    class="workspace-button"
    type="button"
    title={$activeWorkspace?.name ?? 'Workspace'}
    aria-label={`Project menu, current project ${$activeWorkspace?.name ?? 'Workspace'}`}
    aria-expanded={menuOpen}
    aria-haspopup="menu"
    onclick={() => menuOpen = !menuOpen}
  >
    <span class="workspace-initial">{workspaceInitial}</span>
    <span class="workspace-caret" aria-hidden="true">
      <CaretRightIcon size={11} weight="bold" />
    </span>
  </button>

  {#if menuOpen}
    <div class="workspace-menu" role="menu" tabindex="-1" aria-label="Project menu">
      <div class="workspace-current">
        <span class="field-label">Current project</span>
        <span class="workspace-current-name">{$activeWorkspace?.name ?? 'Workspace'}</span>
        <span class="workspace-current-type">{$activeWorkspace?.type ?? 'default'}</span>
      </div>

      <div class="workspace-list" role="group" aria-label="Open project">
        {#if switchableWorkspaces.length > 0}
          {#each switchableWorkspaces as workspace (workspace.id)}
            <button
              class="workspace-row"
              type="button"
              role="menuitem"
              onclick={() => onWorkspaceSelect(workspace.id)}
            >
              <span>{workspace.name}</span>
              <span>{workspace.type}</span>
            </button>
          {/each}
        {:else}
          <p class="workspace-empty">No other projects</p>
        {/if}
      </div>

      <button
        class="new-workspace-toggle"
        type="button"
        onclick={() => createWorkspaceOpen = !createWorkspaceOpen}
      >
        <PlusIcon size={13} weight="bold" />
        {createWorkspaceOpen ? 'Cancel new project' : 'New project'}
      </button>

      {#if createWorkspaceOpen}
        <form class="workspace-form" onsubmit={(event) => { event.preventDefault(); void onCreateWorkspace() }}>
          <input
            aria-label="Project name"
            placeholder="Project name"
            bind:value={workspaceName}
            disabled={workspaceBusy}
          />
          <select aria-label="Project type" bind:value={workspaceType} disabled={workspaceBusy}>
            <option value="authoring">authoring</option>
            <option value="research">research</option>
            <option value="default">default</option>
          </select>
          <button type="submit" disabled={workspaceBusy || !workspaceName.trim()}>
            {workspaceBusy ? 'Creating...' : 'Create project'}
          </button>
          {#if workspaceError}
            <p class="workspace-error">{workspaceError}</p>
          {/if}
        </form>
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

  .workspace-button {
    position: relative;
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

  .workspace-initial {
    font-size: var(--font-size-sm);
    font-weight: 800;
    line-height: 1;
  }

  .workspace-caret {
    position: absolute;
    right: 3px;
    bottom: 3px;
    color: var(--color-fg-secondary);
  }

  .workspace-menu {
    position: absolute;
    top: 0;
    left: calc(100% + var(--space-2));
    z-index: 500;
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
    border: var(--border-zone);
    border-radius: var(--radius-md);
    background: var(--color-shell-sidebar);
    box-shadow: var(--shadow-panel);
  }

  .workspace-current {
    display: grid;
    gap: 2px;
    padding: var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-shell-main) 58%, transparent);
  }

  .field-label {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    font-weight: 700;
    text-transform: uppercase;
  }

  .workspace-current-name {
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
    font-weight: 700;
  }

  .workspace-current-type {
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
  }

  .workspace-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .workspace-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    gap: var(--space-2);
    align-items: center;
    min-height: 30px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    text-align: left;
  }

  .workspace-row span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
    font-weight: 650;
  }

  .workspace-row span:last-child {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  .workspace-row:hover {
    background: var(--color-hover);
  }

  .new-workspace-toggle,
  .workspace-form button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 30px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--accent-nav) 13%, transparent);
    color: var(--color-fg-primary);
    border: 1px solid color-mix(in srgb, var(--accent-nav) 34%, var(--color-border));
    font-size: var(--font-size-sm);
    font-weight: 650;
  }

  .workspace-form {
    display: grid;
    gap: var(--space-2);
  }

  .workspace-form input,
  .workspace-form select {
    width: 100%;
    min-height: 30px;
    padding: 0 var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-shell-main);
    color: var(--color-fg-primary);
  }

  .workspace-form button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .workspace-error {
    margin: 0;
    color: var(--color-danger);
    font-size: var(--font-size-xs);
  }

  .workspace-empty {
    margin: 0;
    padding: 0 var(--space-2);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }
</style>
