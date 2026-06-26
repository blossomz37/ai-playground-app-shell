<script lang="ts">
  import { FunnelIcon, PlusIcon } from 'phosphor-svelte'
  import { archivedWorkspaces, workspaces } from '../../store'
  import {
    PROJECT_TYPES,
    projectsSearchQuery,
    projectsStatusFilter,
    projectsTypeFilter,
    startProjectCreate
  } from './state'
</script>

<section class="projects-nav" aria-label="Project filters">
  <header>
    <h2>Projects</h2>
    <button type="button" title="New project" aria-label="New project" onclick={startProjectCreate}>
      <PlusIcon size={15} weight="bold" aria-hidden="true" />
    </button>
  </header>

  <label>
    <span>Search</span>
    <input type="search" bind:value={$projectsSearchQuery} placeholder="Project name or root" />
  </label>

  <div class="filter-group">
    <div class="filter-title">
      <FunnelIcon size={14} weight="bold" aria-hidden="true" />
      Type
    </div>
    <button class:active={$projectsTypeFilter === 'all'} type="button" onclick={() => projectsTypeFilter.set('all')}>
      All
    </button>
    {#each PROJECT_TYPES as type (type)}
      <button class:active={$projectsTypeFilter === type} type="button" onclick={() => projectsTypeFilter.set(type)}>
        {type}
      </button>
    {/each}
  </div>

  <div class="filter-group">
    <div class="filter-title">Status</div>
    <button class:active={$projectsStatusFilter === 'all'} type="button" onclick={() => projectsStatusFilter.set('all')}>
      All projects <span>{$workspaces.length}</span>
    </button>
    <button class:active={$projectsStatusFilter === 'paused'} type="button" onclick={() => projectsStatusFilter.set('paused')}>
      Paused
    </button>
    <button class:active={$projectsStatusFilter === 'draft'} type="button" onclick={() => projectsStatusFilter.set('draft')}>
      Draft
    </button>
    <button class:active={$projectsStatusFilter === 'archived'} type="button" onclick={() => projectsStatusFilter.set('archived')}>
      Archived <span>{$archivedWorkspaces.length}</span>
    </button>
  </div>
</section>

<style>
  .projects-nav {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h2 {
    margin: 0;
    font-size: var(--font-size-lg);
  }

  button,
  input {
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-fg);
    font: inherit;
  }

  header button {
    display: grid;
    width: 30px;
    height: 30px;
    padding: 0;
    place-items: center;
  }

  label {
    display: grid;
    gap: var(--space-1);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  input {
    height: 32px;
    padding: 0 var(--space-2);
    color: var(--color-fg);
  }

  .filter-group {
    display: grid;
    gap: var(--space-1);
  }

  .filter-title {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
  }

  .filter-group button {
    display: flex;
    justify-content: space-between;
    width: 100%;
    min-height: 30px;
    padding: 0 var(--space-2);
    text-align: left;
    cursor: pointer;
  }

  .filter-group button.active {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
  }

  span {
    color: var(--color-fg-muted);
  }
</style>
