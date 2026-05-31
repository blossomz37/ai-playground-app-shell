<!-- Workflow NavView — prompt chain list -->
<script lang="ts">
  import { selectedWorkflowProfileId, selectWorkflowProfile, workflowProfiles } from './state'
</script>

<div class="nav-view">
  <header class="nav-header"><span class="nav-title">Chains</span></header>
  <div class="profile-list">
    {#each $workflowProfiles as profile (profile.id)}
      <button
        class="profile-item"
        class:active={$selectedWorkflowProfileId === profile.id}
        aria-pressed={$selectedWorkflowProfileId === profile.id}
        onclick={() => selectWorkflowProfile(profile.id)}
      >
        <span class="profile-format">{profile.format}</span>
        <div class="profile-info">
          <span class="profile-name">{profile.name}</span>
          <span class="profile-status" class:draft={profile.status === 'draft'}>{profile.status}</span>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { display: flex; align-items: center; padding: var(--space-3); border-bottom: var(--border-subtle); flex-shrink: 0; }
  .nav-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); }
  .profile-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .profile-item { display: flex; align-items: center; gap: var(--space-2); width: 100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary); transition: background 0.1s; cursor: pointer; }
  .profile-item:hover { background: var(--color-bg-overlay); }
  .profile-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .profile-format { font-size: var(--font-size-xs); font-family: var(--font-mono); color: var(--color-fg-muted); background: var(--color-bg-overlay); padding: 2px 6px; border-radius: var(--radius-sm); flex-shrink: 0; }
  .profile-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .profile-name { font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-status { font-size: var(--font-size-xs); color: var(--color-success); }
  .profile-status.draft { color: var(--color-warn); }
</style>
