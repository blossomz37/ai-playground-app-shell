<script lang="ts">
  import {
    BookOpenIcon,
    FolderOpenIcon,
    PlusIcon,
    XIcon
  } from 'phosphor-svelte'
  import OverflowMenu, { type OverflowMenuItem } from './OverflowMenu.svelte'
  import {
    activeWorkspace,
    archiveWorkspace as archiveWorkspaceAction,
    archivedWorkspaces,
    createWorkspace as createWorkspaceAction,
    deleteWorkspace as deleteWorkspaceAction,
    duplicateWorkspace as duplicateWorkspaceAction,
    importWorkspaceFolder,
    restoreWorkspace as restoreWorkspaceAction,
    switchWorkspace,
    workspaces,
    workspaceId
  } from '../store'

  let { mode = 'rail' }: { mode?: 'rail' | 'sidebar' } = $props()
  let menuOpen = $state(false)
  let createWorkspaceOpen = $state(false)
  let workspaceName = $state('')
  let workspaceType = $state('authoring')
  let busyAction = $state<string | null>(null)
  let workspaceError = $state<string | null>(null)
  let confirmDeleteId = $state<string | null>(null)
  let switcherElement: HTMLDivElement | undefined = $state()

  let isSidebarMode = $derived(mode === 'sidebar')
  let switchableWorkspaces = $derived($workspaces.filter((workspace) => workspace.id !== $workspaceId))
  let activeProjectCount = $derived($workspaces.length)

  function closeMenu(): void {
    menuOpen = false
    createWorkspaceOpen = false
    confirmDeleteId = null
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

  async function runWorkspaceAction(action: string, task: () => Promise<void>, closeAfter = true): Promise<void> {
    busyAction = action
    workspaceError = null
    try {
      await task()
      confirmDeleteId = null
      if (closeAfter) closeMenu()
    } catch (err) {
      workspaceError = err instanceof Error ? err.message : String(err)
    } finally {
      busyAction = null
    }
  }

  async function onWorkspaceSelect(id: string): Promise<void> {
    if (!id || id === $workspaceId) return
    await runWorkspaceAction(`switch:${id}`, () => switchWorkspace(id))
  }

  async function onCreateWorkspace(): Promise<void> {
    if (!workspaceName.trim()) return
    await runWorkspaceAction('create', async () => {
      await createWorkspaceAction({ name: workspaceName, type: workspaceType })
      workspaceName = ''
      workspaceType = 'authoring'
      createWorkspaceOpen = false
    })
  }

  async function onImportFolder(): Promise<void> {
    await runWorkspaceAction('import', () => importWorkspaceFolder({ type: workspaceType }))
  }

  async function onDuplicateWorkspace(id: string): Promise<void> {
    await runWorkspaceAction(`duplicate:${id}`, () => duplicateWorkspaceAction(id))
  }

  async function onArchiveWorkspace(id: string): Promise<void> {
    await runWorkspaceAction(`archive:${id}`, () => archiveWorkspaceAction(id))
  }

  async function onRestoreWorkspace(id: string): Promise<void> {
    await runWorkspaceAction(`restore:${id}`, () => restoreWorkspaceAction(id))
  }

  async function onDeleteWorkspace(id: string): Promise<void> {
    if (confirmDeleteId !== id) {
      confirmDeleteId = id
      workspaceError = null
      return
    }
    await runWorkspaceAction(`delete:${id}`, () => deleteWorkspaceAction(id))
  }

  function workspaceActions(id: string, archived = false): OverflowMenuItem[] {
    const deleteArmed = confirmDeleteId === id
    const items: OverflowMenuItem[] = archived
      ? [{
          id: 'restore',
          label: 'Restore project',
          disabled: busyAction !== null,
          onSelect: () => onRestoreWorkspace(id)
        }]
      : [{
          id: 'duplicate',
          label: 'Duplicate project',
          disabled: busyAction !== null,
          onSelect: () => onDuplicateWorkspace(id)
        }, {
          id: 'archive',
          label: 'Archive project',
          disabled: busyAction !== null,
          onSelect: () => onArchiveWorkspace(id)
        }]

    items.push({
      id: 'delete',
      label: deleteArmed ? 'Confirm delete from app' : 'Delete from app',
      tone: 'danger',
      separatorBefore: true,
      disabled: busyAction !== null,
      keepOpen: !deleteArmed,
      onSelect: () => onDeleteWorkspace(id)
    })
    return items
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
      aria-label="Project menu"
    >
      <header class="workspace-current">
        <span class="field-label">Current project</span>
        <div class="current-project-row">
          <div class="workspace-current-summary">
            <span class="workspace-current-name">{$activeWorkspace?.name ?? 'Workspace'}</span>
          </div>
          <OverflowMenu
            ariaLabel={`More actions for ${$activeWorkspace?.name ?? 'current project'}`}
            items={$activeWorkspace ? workspaceActions($activeWorkspace.id) : []}
            disabled={busyAction !== null || !$activeWorkspace}
          />
        </div>
        {#if confirmDeleteId === $activeWorkspace?.id}
          <p class="workspace-note" aria-live="polite">Source files and folders stay on disk. Choose Confirm delete from app to continue.</p>
        {/if}
      </header>

      <section class="workspace-section project-list-section" aria-label="Open project">
        <div class="section-heading">
          <span>Projects</span>
          <span>{activeProjectCount}</span>
        </div>
        {#if switchableWorkspaces.length > 0}
          <div class="workspace-list">
            {#each switchableWorkspaces as workspace (workspace.id)}
              <div class="project-row">
                <button
                  class="workspace-row"
                  type="button"
                  role="menuitem"
                  disabled={busyAction !== null}
                  onclick={() => onWorkspaceSelect(workspace.id)}
                >
                  <span>{workspace.name}</span>
                </button>
                <OverflowMenu
                  ariaLabel={`More actions for ${workspace.name}`}
                  items={workspaceActions(workspace.id)}
                  disabled={busyAction !== null}
                />
              </div>
              {#if confirmDeleteId === workspace.id}
                <p class="workspace-note row-note" aria-live="polite">Source files and folders stay on disk. Choose Confirm delete from app to continue.</p>
              {/if}
            {/each}
          </div>
        {:else}
          <p class="workspace-empty">No other active projects</p>
        {/if}
      </section>

      <section class="workspace-section create-project-section" aria-label="Create or import project">
        <button
          class="workspace-action primary"
          type="button"
          disabled={busyAction !== null}
          onclick={() => createWorkspaceOpen = !createWorkspaceOpen}
        >
          {#if createWorkspaceOpen}
            <XIcon size={14} weight="bold" />
            <span>Cancel new project</span>
          {:else}
            <PlusIcon size={14} weight="bold" />
            <span>New project</span>
          {/if}
        </button>

        {#if createWorkspaceOpen}
          <form class="workspace-form" onsubmit={(event) => { event.preventDefault(); void onCreateWorkspace() }}>
            <input
              aria-label="Project name"
              placeholder="Project name"
              bind:value={workspaceName}
              disabled={busyAction !== null}
            />
            <select aria-label="Project type" bind:value={workspaceType} disabled={busyAction !== null}>
              <option value="authoring">authoring</option>
              <option value="research">research</option>
              <option value="default">default</option>
            </select>
            <button type="submit" disabled={busyAction !== null || !workspaceName.trim()}>
              {busyAction === 'create' ? 'Creating...' : 'Create project'}
            </button>
          </form>
        {/if}

        <button
          class="workspace-action"
          type="button"
          role="menuitem"
          disabled={busyAction !== null}
          onclick={() => onImportFolder()}
        >
          <FolderOpenIcon size={14} weight="bold" />
          <span>{busyAction === 'import' ? 'Importing...' : 'Import folder'}</span>
        </button>
      </section>

      <section class="workspace-section archived-projects-section" aria-label="Archived projects">
        <div class="section-heading">
          <span>Archived</span>
          <span>{$archivedWorkspaces.length}</span>
        </div>
        {#if $archivedWorkspaces.length > 0}
          <div class="archived-list">
            {#each $archivedWorkspaces as workspace (workspace.id)}
              <div class="archived-row">
                <span class="archived-name">{workspace.name}</span>
                <OverflowMenu
                  ariaLabel={`More actions for archived project ${workspace.name}`}
                  items={workspaceActions(workspace.id, true)}
                  disabled={busyAction !== null}
                />
              </div>
              {#if confirmDeleteId === workspace.id}
                <p class="workspace-note row-note" aria-live="polite">Source files and folders stay on disk. Choose Confirm delete from app to continue.</p>
              {/if}
            {/each}
          </div>
        {:else}
          <p class="workspace-empty">No archived projects</p>
        {/if}
      </section>

      {#if workspaceError}
        <p class="workspace-error">{workspaceError}</p>
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

  .workspace-menu {
    position: absolute;
    top: 0;
    left: calc(100% + var(--space-2));
    z-index: 500;
    width: min(360px, calc(100vw - 72px));
    max-height: min(720px, calc(100vh - 32px));
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
    overflow: auto;
    border: none;
    border-radius: 0;
    border-bottom: var(--border-subtle);
    box-shadow: none;
  }

  .workspace-menu.inline .workspace-current {
    order: -2;
  }

  .workspace-current {
    display: grid;
    gap: var(--space-1);
    padding-bottom: var(--space-2);
  }

  .field-label,
  .section-heading {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }

  .workspace-current-summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    padding: 0 var(--space-2);
  }

  .workspace-current-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
    font-weight: 650;
  }

  .workspace-section {
    display: grid;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: var(--border-subtle);
  }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .workspace-list,
  .archived-list {
    display: grid;
    gap: var(--space-1);
  }

  .project-row,
  .workspace-row,
  .archived-row {
    display: grid;
    align-items: center;
    gap: var(--space-2);
    min-height: 30px;
    border-radius: var(--radius-sm);
  }

  .workspace-row {
    grid-template-columns: minmax(0, 1fr);
    padding: 0 var(--space-2);
    color: var(--color-fg-secondary);
    text-align: left;
  }

  .project-row {
    grid-template-columns: minmax(0, 1fr) 28px;
    padding-left: 0;
  }

  .current-project-row {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 28px;
    align-items: center;
    gap: var(--space-2);
    min-height: 34px;
    padding-left: 0;
    overflow: hidden;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--accent-nav) 10%, var(--color-shell-sidebar));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-nav) 20%, transparent);
  }

  .current-project-row::before {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 0;
    width: 3px;
    border-radius: 0 2px 2px 0;
    background: var(--accent-nav);
    content: '';
  }

  .workspace-row span,
  .archived-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
    font-weight: 650;
  }

  .workspace-row:hover:not(:disabled) {
    background: var(--color-hover);
  }

  .workspace-action,
  .workspace-form button {
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
    white-space: nowrap;
  }

  .workspace-action.primary {
    background: color-mix(in srgb, var(--accent-nav) 16%, transparent);
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

  .archived-row {
    grid-template-columns: minmax(0, 1fr) 28px;
    padding-left: var(--space-2);
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

  .row-note {
    padding: 0 var(--space-2) var(--space-1);
  }
</style>
