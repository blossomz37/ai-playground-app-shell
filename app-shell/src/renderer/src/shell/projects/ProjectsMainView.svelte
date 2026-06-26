<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import {
    ArchiveIcon,
    ArrowClockwiseIcon,
    BookOpenIcon,
    CopyIcon,
    FolderOpenIcon,
    PencilSimpleIcon,
    PlusIcon,
    TrashIcon
  } from 'phosphor-svelte'
  import type { Workspace, WorkspaceStats } from '@shared/module-contract'
  import {
    archiveWorkspace,
    archivedWorkspaces,
    deleteWorkspace,
    duplicateWorkspace,
    importWorkspaceFolder,
    loadWorkspaceStats,
    refreshWorkspaceLists,
    restoreWorkspace,
    switchWorkspace,
    workspaceId,
    workspaces
  } from '../../store'
  import {
    PROJECT_TYPES,
    projectsCreateMode,
    projectsEditMode,
    projectsSearchQuery,
    projectsSortMode,
    projectsStatusFilter,
    projectsTypeFilter,
    selectProject,
    selectedProjectId,
    startProjectCreate,
    startProjectEdit
  } from './state'

  let statsByWorkspace = $state<Record<string, WorkspaceStats>>({})
  let busyAction = $state<string | null>(null)
  let confirmDeleteId = $state<string | null>(null)
  let error = $state<string | null>(null)

  const projects = $derived([...$workspaces, ...$archivedWorkspaces])
  const visibleProjects = $derived(sortProjects(filterProjects(projects)))

  $effect(() => {
    if (projects.length === 0) return
    if (!$selectedProjectId || !projects.some(project => project.id === $selectedProjectId)) {
      selectProject(projects[0].id)
    }
  })

  $effect(() => {
    const missing = visibleProjects
      .map(project => project.id)
      .filter(id => !statsByWorkspace[id])
    if (missing.length > 0) void loadStats(missing)
  })

  onMount(() => {
    void refreshWorkspaceLists()
    const createListener = () => startProjectCreate()
    const importListener = () => void importFolder()
    window.addEventListener('projects:create', createListener)
    window.addEventListener('projects:import', importListener)
    return () => {
      window.removeEventListener('projects:create', createListener)
      window.removeEventListener('projects:import', importListener)
    }
  })

  onDestroy(() => {
    projectsCreateMode.set(false)
    projectsEditMode.set(false)
  })

  async function loadStats(ids: string[]): Promise<void> {
    const rows = await Promise.all(ids.map(id => loadWorkspaceStats(id).catch(() => null)))
    const next = { ...statsByWorkspace }
    for (const row of rows) {
      if (row) next[row.workspaceId] = row
    }
    statsByWorkspace = next
  }

  function filterProjects(rows: Workspace[]): Workspace[] {
    const query = $projectsSearchQuery.trim().toLowerCase()
    return rows.filter(project => {
      const archived = Boolean(project.archivedAt)
      if ($projectsTypeFilter !== 'all' && project.type !== $projectsTypeFilter) return false
      if ($projectsStatusFilter === 'archived') {
        if (!archived) return false
      } else if ($projectsStatusFilter !== 'all') {
        if (archived || project.status !== $projectsStatusFilter) return false
      }
      if (!query) return true
      return [project.name, project.type, project.root, project.description, project.status]
        .some(value => value.toLowerCase().includes(query))
    })
  }

  function sortProjects(rows: Workspace[]): Workspace[] {
    return [...rows].sort((left, right) => {
      if ($projectsSortMode === 'name') return left.name.localeCompare(right.name)
      if ($projectsSortMode === 'type') return left.type.localeCompare(right.type) || left.name.localeCompare(right.name)
      if ($projectsSortMode === 'words') return (statsByWorkspace[right.id]?.words ?? 0) - (statsByWorkspace[left.id]?.words ?? 0)
      return recentValue(right) - recentValue(left) || left.name.localeCompare(right.name)
    })
  }

  function recentValue(project: Workspace): number {
    return Date.parse(project.lastOpenedAt ?? project.updatedAt ?? project.createdAt ?? '') || 0
  }

  function clearFilters(): void {
    projectsSearchQuery.set('')
    projectsTypeFilter.set('all')
    projectsStatusFilter.set('all')
  }

  async function runAction(actionId: string, action: () => Promise<void>): Promise<void> {
    busyAction = actionId
    error = null
    try {
      await action()
      await refreshWorkspaceLists()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Project action failed.'
    } finally {
      busyAction = null
    }
  }

  async function openProject(project: Workspace): Promise<void> {
    if (project.archivedAt) return
    await runAction(`open:${project.id}`, () => switchWorkspace(project.id))
    selectProject(project.id)
  }

  async function duplicateProject(project: Workspace): Promise<void> {
    await runAction(`duplicate:${project.id}`, () => duplicateWorkspace(project.id))
  }

  async function archiveProject(project: Workspace): Promise<void> {
    await runAction(`archive:${project.id}`, () => archiveWorkspace(project.id))
  }

  async function restoreProject(project: Workspace): Promise<void> {
    await runAction(`restore:${project.id}`, () => restoreWorkspace(project.id))
    selectProject(project.id)
  }

  async function deleteProject(project: Workspace): Promise<void> {
    if (confirmDeleteId !== project.id) {
      confirmDeleteId = project.id
      return
    }
    await runAction(`delete:${project.id}`, () => deleteWorkspace(project.id))
    confirmDeleteId = null
  }

  async function importFolder(): Promise<void> {
    await runAction('import', () => importWorkspaceFolder({ type: 'authoring' }))
  }

  function formatDate(value: string | null | undefined): string {
    if (!value) return 'Never'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Unknown'
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
  }

  function formatNumber(value: number | undefined): string {
    return new Intl.NumberFormat().format(value ?? 0)
  }

  function formatWords(value: number | undefined): string {
    const words = value ?? 0
    if (words >= 1000) return `${Math.round(words / 100) / 10}k`
    return formatNumber(words)
  }
</script>

<section class="projects-hub" aria-label="Projects">
  <header class="hub-header">
    <div>
      <h1>Projects</h1>
      <p>Search, review, and manage local App Shell projects.</p>
    </div>
    <div class="header-actions">
      <button class="secondary" type="button" onclick={importFolder} disabled={busyAction === 'import'}>
        <FolderOpenIcon size={16} weight="bold" aria-hidden="true" />
        Import Folder
      </button>
      <button class="primary" type="button" onclick={startProjectCreate}>
        <PlusIcon size={16} weight="bold" aria-hidden="true" />
        New Project
      </button>
    </div>
  </header>

  <div class="toolbar">
    <input
      data-capture-projects-search
      type="search"
      placeholder="Search projects..."
      bind:value={$projectsSearchQuery}
      aria-label="Search projects"
    />
    <select bind:value={$projectsTypeFilter} aria-label="Filter by type">
      <option value="all">Type: All</option>
      {#each PROJECT_TYPES as type (type)}
        <option value={type}>Type: {type}</option>
      {/each}
    </select>
    <select bind:value={$projectsStatusFilter} aria-label="Filter by status">
      <option value="all">Status: All</option>
      <option value="active">Status: Active</option>
      <option value="paused">Status: Paused</option>
      <option value="draft">Status: Draft</option>
      <option value="archived">Archived</option>
    </select>
    <select bind:value={$projectsSortMode} aria-label="Sort projects">
      <option value="recent">Sort: Recent</option>
      <option value="name">Sort: Name</option>
      <option value="type">Sort: Type</option>
      <option value="words">Sort: Words</option>
    </select>
  </div>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  <div class="table-shell">
    {#if visibleProjects.length > 0}
      <table>
        <colgroup>
          <col class="name-col" />
          <col class="type-col" />
          <col class="status-col" />
          <col class="updated-col" />
          <col class="count-col" />
          <col class="words-col" />
          <col class="count-col" />
          <col class="count-col" />
          <col class="prompts-col" />
          <col class="actions-width-col" />
        </colgroup>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Updated</th>
            <th>Docs</th>
            <th>Words</th>
            <th>Assets</th>
            <th>Chats</th>
            <th>Prompts</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each visibleProjects as project (project.id)}
            {@const stats = statsByWorkspace[project.id]}
            {@const selected = project.id === $selectedProjectId}
            {@const archived = Boolean(project.archivedAt)}
            <tr class:active={project.id === $workspaceId} class:selected class:archived onclick={() => selectProject(project.id)}>
              <td>
                <div class="project-name">
                  <strong>{project.name}</strong>
                  <span>{project.root}</span>
                </div>
              </td>
              <td><span class="badge">{project.type}</span></td>
              <td><span class="status" class:muted={archived}>{archived ? 'archived' : project.status}</span></td>
              <td>{formatDate(project.lastOpenedAt ?? project.updatedAt)}</td>
              <td>{formatNumber(stats?.documents)}</td>
              <td>{formatWords(stats?.words)}</td>
              <td>{formatNumber(stats?.assets)}</td>
              <td>{formatNumber(stats?.conversations)}</td>
              <td>{formatNumber(stats?.promptTemplates)}</td>
              <td class="actions">
                <button type="button" title="Open project" aria-label="Open project" disabled={archived || busyAction === `open:${project.id}`} onclick={(event) => { event.stopPropagation(); void openProject(project) }}>
                  <BookOpenIcon size={15} weight="bold" aria-hidden="true" />
                </button>
                <button type="button" title="Edit project" aria-label="Edit project" data-capture-projects-edit onclick={(event) => { event.stopPropagation(); startProjectEdit(project.id) }}>
                  <PencilSimpleIcon size={15} weight="bold" aria-hidden="true" />
                </button>
                <button type="button" title="Duplicate project" aria-label="Duplicate project" disabled={busyAction === `duplicate:${project.id}`} onclick={(event) => { event.stopPropagation(); void duplicateProject(project) }}>
                  <CopyIcon size={15} weight="bold" aria-hidden="true" />
                </button>
                {#if archived}
                  <button type="button" title="Restore project" aria-label="Restore project" disabled={busyAction === `restore:${project.id}`} onclick={(event) => { event.stopPropagation(); void restoreProject(project) }}>
                    <ArrowClockwiseIcon size={15} weight="bold" aria-hidden="true" />
                  </button>
                {:else}
                  <button type="button" title="Archive project" aria-label="Archive project" disabled={busyAction === `archive:${project.id}`} onclick={(event) => { event.stopPropagation(); void archiveProject(project) }}>
                    <ArchiveIcon size={15} weight="bold" aria-hidden="true" />
                  </button>
                {/if}
                <button class:danger={confirmDeleteId === project.id} type="button" title="Delete project" aria-label="Delete project" disabled={busyAction === `delete:${project.id}`} onclick={(event) => { event.stopPropagation(); void deleteProject(project) }}>
                  <TrashIcon size={15} weight="bold" aria-hidden="true" />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <div class="empty-state">
        <h2>No projects match</h2>
        <p>Adjust the search or filters to show more projects.</p>
        <button type="button" onclick={clearFilters}>Clear filters</button>
      </div>
    {/if}
  </div>
</section>

<style>
  .projects-hub {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    background: var(--color-shell-main);
  }

  .hub-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-6) var(--space-6) var(--space-4);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  h1 {
    margin: 0;
    font-size: var(--font-size-2xl);
    line-height: var(--line-height-tight);
  }

  p {
    margin: var(--space-1) 0 0;
    color: var(--color-fg-muted);
  }

  .header-actions,
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  button,
  select,
  input {
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-fg);
    font: inherit;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 32px;
    padding: 0 var(--space-3);
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-accent-contrast);
  }

  .secondary {
    background: var(--color-surface);
  }

  .toolbar {
    padding: var(--space-3) var(--space-6);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  input {
    flex: 1;
    min-width: 180px;
    height: 34px;
    padding: 0 var(--space-3);
  }

  select {
    height: 34px;
    padding: 0 var(--space-2);
  }

  .error {
    margin: var(--space-3) var(--space-6) 0;
    color: var(--color-danger);
  }

  .table-shell {
    min-height: 0;
    flex: 1;
    overflow: auto;
  }

  table {
    width: max(100%, 980px);
    border-collapse: collapse;
    font-size: var(--font-size-sm);
    table-layout: fixed;
  }

  .name-col { width: 240px; }
  .type-col { width: 78px; }
  .status-col { width: 78px; }
  .updated-col { width: 78px; }
  .count-col { width: 50px; }
  .words-col { width: 62px; }
  .prompts-col { width: 60px; }
  .actions-width-col { width: 150px; }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: var(--space-3);
    text-align: left;
    color: var(--color-fg-muted);
    background: var(--color-shell-main);
    border-bottom: 1px solid var(--color-border-strong);
    font-weight: var(--font-weight-semibold);
  }

  th:first-child,
  td:first-child {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--color-shell-main);
  }

  th:last-child,
  td:last-child {
    position: sticky;
    right: 0;
    z-index: 2;
    background: var(--color-shell-main);
  }

  tr:hover td:first-child,
  tr:hover td:last-child,
  tr.selected td:first-child,
  tr.selected td:last-child {
    background: color-mix(in srgb, var(--color-accent) 9%, var(--color-shell-main));
  }

  td {
    padding: var(--space-3);
    border-bottom: 1px solid var(--color-border-subtle);
    vertical-align: middle;
  }

  tr {
    cursor: pointer;
  }

  tr:hover,
  tr.selected {
    background: color-mix(in srgb, var(--color-accent) 9%, transparent);
  }

  tr.active .project-name strong {
    color: var(--color-accent);
  }

  tr.archived {
    color: var(--color-fg-muted);
  }

  .project-name {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .project-name strong,
  .project-name span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-name span {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  .badge,
  .status {
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-fg-muted);
    border: 1px solid var(--color-border-subtle);
  }

  .status:not(.muted) {
    color: var(--color-success);
    border-color: color-mix(in srgb, var(--color-success) 35%, var(--color-border-subtle));
  }

  .actions-col {
    text-align: right;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
  }

  .actions button {
    width: 28px;
    min-height: 28px;
    padding: 0;
  }

  .actions button.danger {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }

  .empty-state {
    display: grid;
    place-items: center;
    align-content: center;
    min-height: 320px;
    gap: var(--space-2);
    color: var(--color-fg-muted);
  }

  .empty-state h2 {
    margin: 0;
    color: var(--color-fg);
    font-size: var(--font-size-lg);
  }

  @media (max-width: 900px) {
    .hub-header,
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .header-actions {
      justify-content: stretch;
    }

    .header-actions button {
      flex: 1;
    }
  }
</style>
