<script lang="ts">
  import { CheckIcon, CopyIcon, XIcon } from 'phosphor-svelte'
  import type { Workspace, WorkspaceStats, WorkspaceStatus } from '@shared/module-contract'
  import {
    activeWorkspace,
    createWorkspace,
    loadWorkspaceStats,
    updateWorkspace,
    workspaceId,
    workspaces,
    archivedWorkspaces,
    refreshWorkspaceLists
  } from '../../store'
  import { addToast } from '../../store/toasts'
  import {
    PROJECT_STATUSES,
    PROJECT_TYPES,
    projectsCreateMode,
    projectsEditMode,
    selectProject,
    selectedProjectId,
    startProjectEdit
  } from './state'

  let formName = $state('')
  let formType = $state<string>('authoring')
  let formRoot = $state('')
  let formDescription = $state('')
  let formStatus = $state<WorkspaceStatus>('active')
  let loadedFormKey = $state('')
  let stats = $state<WorkspaceStats | null>(null)
  let statsProjectId = $state<string | null>(null)
  let saving = $state(false)
  let error = $state<string | null>(null)

  const projects = $derived([...$workspaces, ...$archivedWorkspaces])
  const selectedProject = $derived(projects.find(project => project.id === $selectedProjectId) ?? $activeWorkspace ?? projects[0] ?? null)

  $effect(() => {
    if ($projectsCreateMode && loadedFormKey !== 'create') {
      formName = ''
      formType = 'authoring'
      formRoot = ''
      formDescription = ''
      formStatus = 'active'
      loadedFormKey = 'create'
    } else if ($projectsEditMode && selectedProject && loadedFormKey !== `edit:${selectedProject.id}`) {
      loadForm(selectedProject)
      loadedFormKey = `edit:${selectedProject.id}`
    }
  })

  $effect(() => {
    const projectId = selectedProject?.id ?? null
    if (!projectId || projectId === statsProjectId) return
    statsProjectId = projectId
    void loadWorkspaceStats(projectId).then(row => {
      stats = row
    }).catch(() => {
      stats = null
    })
  })

  function loadForm(project: Workspace): void {
    formName = project.name
    formType = project.type
    formRoot = project.root
    formDescription = project.description
    formStatus = project.status
  }

  function cancelEdit(): void {
    projectsCreateMode.set(false)
    projectsEditMode.set(false)
    loadedFormKey = ''
    error = null
  }

  async function saveForm(): Promise<void> {
    saving = true
    error = null
    try {
      if ($projectsCreateMode) {
        const created = await createWorkspace({
          name: formName.trim() || 'Untitled Workspace',
          type: formType,
          root: formRoot.trim() || undefined
        })
        const updated = await updateWorkspace(created.id, {
          description: formDescription,
          status: formStatus
        })
        await refreshWorkspaceLists()
        selectProject(updated.id)
        addToast('info', 'Project created.')
      } else if (selectedProject) {
        const updated = await updateWorkspace(selectedProject.id, {
          name: formName,
          type: formType,
          root: formRoot,
          description: formDescription,
          status: formStatus
        })
        selectProject(updated.id)
        addToast('info', 'Project updated.')
      }
      cancelEdit()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not save project.'
    } finally {
      saving = false
    }
  }

  function copyRoot(project: Workspace): void {
    void navigator.clipboard?.writeText(project.root)
    addToast('info', 'Project root copied.')
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

<section class="project-inspector" aria-label="Project details">
  {#if $projectsCreateMode || $projectsEditMode}
    <header>
      <h2>{$projectsCreateMode ? 'New Project' : 'Edit Project'}</h2>
      <button type="button" title="Cancel" aria-label="Cancel" onclick={cancelEdit}>
        <XIcon size={15} weight="bold" aria-hidden="true" />
      </button>
    </header>

    <form onsubmit={(event) => { event.preventDefault(); void saveForm() }}>
      <label>
        <span>Title</span>
        <input required bind:value={formName} placeholder="Project title" />
      </label>

      <label>
        <span>Type</span>
        <select bind:value={formType}>
          {#each PROJECT_TYPES as type (type)}
            <option value={type}>{type}</option>
          {/each}
        </select>
      </label>

      <label>
        <span>Status</span>
        <select bind:value={formStatus}>
          {#each PROJECT_STATUSES as status (status)}
            <option value={status}>{status}</option>
          {/each}
        </select>
      </label>

      <label>
        <span>Root</span>
        <input required bind:value={formRoot} placeholder="/Users/carlo/Projects/example" />
      </label>

      <label>
        <span>Description</span>
        <textarea rows="5" bind:value={formDescription} placeholder="Project notes, scope, or intent"></textarea>
      </label>

      {#if error}
        <p class="error" role="alert">{error}</p>
      {/if}

      <div class="form-actions">
        <button class="secondary" type="button" onclick={cancelEdit}>Cancel</button>
        <button class="primary" type="submit" disabled={saving}>
          <CheckIcon size={15} weight="bold" aria-hidden="true" />
          {$projectsCreateMode ? 'Create Project' : 'Update Project'}
        </button>
      </div>
    </form>
  {:else if selectedProject}
    <header>
      <div>
        <h2>{selectedProject.name}</h2>
        <p>{selectedProject.archivedAt ? 'Archived project' : selectedProject.id === $workspaceId ? 'Current project' : 'Project details'}</p>
      </div>
      <button type="button" title="Edit project" aria-label="Edit project" onclick={() => startProjectEdit(selectedProject.id)}>
        <span>Edit</span>
      </button>
    </header>

    <dl class="metadata">
      <div>
        <dt>Type</dt>
        <dd>{selectedProject.type}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{selectedProject.archivedAt ? 'archived' : selectedProject.status}</dd>
      </div>
      <div>
        <dt>Root</dt>
        <dd>
          <span>{selectedProject.root}</span>
          <button type="button" title="Copy root" aria-label="Copy project root" onclick={() => copyRoot(selectedProject)}>
            <CopyIcon size={14} weight="bold" aria-hidden="true" />
          </button>
        </dd>
      </div>
      {#if selectedProject.description}
        <div>
          <dt>Description</dt>
          <dd>{selectedProject.description}</dd>
        </div>
      {/if}
    </dl>

    <section class="stats" aria-label="Project stats">
      <h3>Stats</h3>
      <div class="stat-grid">
        <div><strong>{formatNumber(stats?.documents)}</strong><span>Docs</span></div>
        <div><strong>{formatWords(stats?.words)}</strong><span>Words</span></div>
        <div><strong>{formatNumber(stats?.assets)}</strong><span>Assets</span></div>
        <div><strong>{formatNumber(stats?.conversations)}</strong><span>Chats</span></div>
        <div><strong>{formatNumber(stats?.promptTemplates)}</strong><span>Prompts</span></div>
        <div><strong>{formatNumber(stats?.jobs)}</strong><span>Jobs</span></div>
      </div>
    </section>
  {:else}
    <div class="empty">
      <h2>No project selected</h2>
      <button class="primary" type="button" onclick={startProjectCreate}>New Project</button>
    </div>
  {/if}
</section>

<style>
  .project-inspector {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  h2,
  h3,
  p,
  dl,
  dd {
    margin: 0;
  }

  h2 {
    font-size: var(--font-size-lg);
    line-height: var(--line-height-tight);
  }

  h3 {
    font-size: var(--font-size-sm);
  }

  p,
  dt {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  button,
  input,
  select,
  textarea {
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-fg);
    font: inherit;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 30px;
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
    background: var(--color-surface-raised);
  }

  form {
    display: grid;
    gap: var(--space-3);
  }

  label {
    display: grid;
    gap: var(--space-1);
  }

  label span {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
  }

  input,
  select {
    min-height: 34px;
    padding: 0 var(--space-2);
  }

  textarea {
    min-height: 110px;
    padding: var(--space-2);
    resize: vertical;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .error {
    color: var(--color-danger);
  }

  .metadata {
    display: grid;
    gap: var(--space-3);
  }

  .metadata div {
    display: grid;
    gap: var(--space-1);
  }

  .metadata dd {
    overflow-wrap: anywhere;
  }

  .metadata dd:has(button) {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .metadata dd button {
    width: 28px;
    min-height: 28px;
    padding: 0;
  }

  .stats {
    display: grid;
    gap: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border-subtle);
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .stat-grid div {
    display: grid;
    gap: 2px;
    padding: var(--space-2);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .stat-grid strong {
    font-size: var(--font-size-md);
  }

  .stat-grid span {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  .empty {
    display: grid;
    justify-items: start;
    gap: var(--space-3);
  }
</style>
