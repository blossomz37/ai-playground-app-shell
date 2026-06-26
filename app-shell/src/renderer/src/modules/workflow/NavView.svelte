<!-- Workflow NavView — prompt chain list -->
<script lang="ts">
  import InlineRename from '../../shell/InlineRename.svelte'
  import { addToast } from '../../store/toasts'
  import { renameWorkflowProfile, selectedWorkflowProfileId, selectWorkflowProfile, workflowProfiles } from './state'
  import type { WorkflowProfile } from './state'

  let renamingProfileId = $state<string | null>(null)
  let filterQuery = $state('')
  let normalizedFilter = $derived(filterQuery.trim().toLowerCase())
  let visibleProfiles = $derived(
    normalizedFilter ? $workflowProfiles.filter(profile => profileMatches(profile, normalizedFilter)) : $workflowProfiles
  )

  function profileMatches(profile: WorkflowProfile, query: string): boolean {
    return [profile.name, profile.format, profile.status, profile.prompt]
      .some(value => value.toLowerCase().includes(query))
  }

  function startRename(event: MouseEvent, id: string): void {
    event.stopPropagation()
    selectWorkflowProfile(id)
    renamingProfileId = id
  }

  function cancelRename(): void {
    renamingProfileId = null
  }

  function commitRename(id: string, name: string): void {
    if (!name) {
      addToast('warn', 'Prompt chain name cannot be blank.')
      cancelRename()
      return
    }
    renameWorkflowProfile(id, name)
    selectWorkflowProfile(id)
    cancelRename()
  }
</script>

<div class="nav-view">
  <header class="zone-header nav-header"><span class="zone-title nav-title">Chains</span></header>
  <div class="nav-filter">
    <input
      bind:value={filterQuery}
      data-capture-nav-search
      type="search"
      class="filter-input"
      placeholder="Filter chains"
      aria-label="Filter prompt chains"
      autocomplete="off"
    />
  </div>
  <div class="profile-list">
    {#each visibleProfiles as profile (profile.id)}
      <div
        class="profile-item"
        class:active={$selectedWorkflowProfileId === profile.id}
      >
        {#if renamingProfileId === profile.id}
          <InlineRename
            value={profile.name}
            ariaLabel="Rename prompt chain"
            onCommit={(name) => commitRename(profile.id, name)}
            onCancel={cancelRename}
          />
        {:else}
          <button
            type="button"
            class="profile-open"
            aria-pressed={$selectedWorkflowProfileId === profile.id}
            onclick={() => selectWorkflowProfile(profile.id)}
          >
            <span class="profile-format">{profile.format}</span>
            <div class="profile-info">
              <span class="profile-name">{profile.name}</span>
              <span class="profile-status" class:draft={profile.status === 'draft'}>{profile.status}</span>
            </div>
          </button>
          <button
            type="button"
            class="row-action"
            title="Rename"
            aria-label={`Rename ${profile.name}`}
            onclick={(event) => startRename(event, profile.id)}
          >
            ✎
          </button>
        {/if}
      </div>
    {:else}
      <div class="list-empty">No chains match.</div>
    {/each}
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-filter { flex: 0 0 auto; padding: var(--space-2) var(--space-2) 0; }
  .filter-input { width: 100%; height: 28px; padding: 0 var(--space-2); border: var(--border-subtle); border-radius: var(--radius-sm); background: var(--color-bg-base); color: var(--color-fg-primary); font-size: var(--font-size-xs); }
  .filter-input::placeholder { color: var(--color-fg-muted); }
  .filter-input:focus { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
  .profile-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .list-empty { padding: var(--space-3) var(--space-2); color: var(--color-fg-muted); font-size: var(--font-size-sm); }
  .profile-item { display: grid; grid-template-columns: minmax(0, 1fr) 24px; align-items: center; gap: var(--space-1); width: 100%; padding: var(--space-1); border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary); transition: background 0.1s; }
  .profile-item:hover { background: var(--color-bg-overlay); }
  .profile-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .profile-open { display: flex; align-items: center; gap: var(--space-2); min-width: 0; padding: var(--space-1) var(--space-2); text-align: left; color: inherit; cursor: pointer; }
  .row-action { width: 22px; height: 22px; border-radius: var(--radius-sm); color: var(--color-fg-muted); opacity: 0; }
  .profile-item:hover .row-action, .profile-item.active .row-action, .row-action:focus-visible { opacity: 1; }
  .row-action:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .profile-format { font-size: var(--font-size-xs); font-family: var(--font-mono); color: var(--color-fg-muted); background: var(--color-bg-overlay); padding: 2px 6px; border-radius: var(--radius-sm); flex-shrink: 0; }
  .profile-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .profile-name { font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-status { font-size: var(--font-size-xs); color: var(--color-success); }
  .profile-status.draft { color: var(--color-warn); }
</style>
