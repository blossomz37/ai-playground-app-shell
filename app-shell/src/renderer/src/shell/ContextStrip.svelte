<script lang="ts">
  import {
    ArrowsInIcon,
    ArrowsOutIcon,
    CommandIcon,
    EyeClosedIcon,
    EyeIcon,
    GearSixIcon,
    SidebarIcon
  } from 'phosphor-svelte'
  import { executeCommand, paletteOpen } from '../store/commands'
  import { toggleJobsPanel } from '../store/jobs'
  import { shellContextDescriptors } from '../store/shell-context'

  interface Props {
    moduleId: string | null
    sidebarVisible: boolean
    inspectorVisible: boolean
    zenMode: boolean
    onToggleSidebar: () => void | Promise<void>
    onToggleInspector: () => void | Promise<void>
    onToggleZen: () => void | Promise<void>
  }

  let {
    moduleId,
    sidebarVisible,
    inspectorVisible,
    zenMode,
    onToggleSidebar,
    onToggleInspector,
    onToggleZen
  }: Props = $props()

  let descriptor = $derived(moduleId ? $shellContextDescriptors[moduleId] ?? null : null)
  let inspectorLabel = $derived(inspectorVisible ? 'Hide inspector' : 'Show inspector')
  let sidebarLabel = $derived(sidebarVisible ? 'Hide sidebar' : 'Show sidebar')
  let zenLabel = $derived(zenMode ? 'Exit zen mode' : 'Enter zen mode')
</script>

<section class="context-strip" aria-label="View toolbar">
  <div class="context-cell context-actions">
    {#if descriptor?.actions?.length}
      {#each descriptor.actions as action (action.id)}
        <button
          class="icon-button text-action"
          type="button"
          title={action.label}
          aria-label={action.label}
          disabled={action.disabled}
          onclick={() => executeCommand(action.commandId)}
        >
          {action.label}
        </button>
      {/each}
    {/if}

    <button
      class="icon-button"
      type="button"
      title={sidebarLabel}
      aria-label={sidebarLabel}
      aria-pressed={sidebarVisible}
      onclick={onToggleSidebar}
    >
      <SidebarIcon size={16} weight={sidebarVisible ? 'fill' : 'regular'} />
    </button>

    <button
      class="icon-button"
      type="button"
      title={inspectorLabel}
      aria-label={inspectorLabel}
      aria-pressed={inspectorVisible}
      onclick={onToggleInspector}
    >
      {#if inspectorVisible}
        <EyeIcon size={16} weight="fill" />
      {:else}
        <EyeClosedIcon size={16} weight="regular" />
      {/if}
    </button>

    <button
      class="icon-button"
      type="button"
      title={zenLabel}
      aria-label={zenLabel}
      aria-pressed={zenMode}
      onclick={onToggleZen}
    >
      {#if zenMode}
        <ArrowsInIcon size={16} weight="regular" />
      {:else}
        <ArrowsOutIcon size={16} weight="regular" />
      {/if}
    </button>

    <button
      class="icon-button"
      type="button"
      title="Command palette"
      aria-label="Open command palette"
      onclick={() => paletteOpen.set(true)}
    >
      <CommandIcon size={16} weight="regular" />
    </button>

    <button class="icon-button text-action" type="button" title="Jobs" aria-label="Open jobs" onclick={toggleJobsPanel}>
      Jobs
    </button>

    <button
      class="icon-button"
      type="button"
      title="Settings"
      aria-label="Open settings"
      onclick={() => executeCommand('shell.settings')}
    >
      <GearSixIcon size={16} weight="regular" />
    </button>
  </div>
</section>

<style>
  .context-strip {
    grid-area: contextstrip;
    position: relative;
    display: grid;
    grid-template-columns: var(--_rail-col) minmax(180px, var(--_sidebar-col)) minmax(0, 1fr) var(--_inspector-col);
    min-height: var(--_context-h);
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-shell-topbar) 74%, var(--color-panel-glint)), var(--color-shell-topbar));
    border-bottom: var(--border-zone);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-panel-glint) 54%, transparent);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    overflow: visible;
    user-select: none;
  }

  .context-actions {
    position: absolute;
    top: 0;
    right: var(--space-2);
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    border-right: none;
    gap: var(--space-1);
    padding-right: var(--space-2);
  }

  .icon-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    max-width: 96px;
    height: 24px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    background: transparent;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  }

  .icon-button:hover,
  .icon-button[aria-pressed='true'] {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }

  .icon-button[aria-pressed='true'] {
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-inspector) 30%, transparent);
  }

  .icon-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .icon-button::after {
    content: attr(aria-label);
    position: absolute;
    top: calc(100% + var(--space-2));
    right: 0;
    z-index: 30;
    min-width: max-content;
    max-width: 220px;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-strong);
    box-shadow: var(--shadow-panel);
    color: var(--color-fg-primary);
    font-size: var(--font-size-xs);
    font-weight: 650;
    line-height: 1.3;
    text-transform: none;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-4px);
    transition: opacity 0.12s ease, transform 0.12s ease;
  }

  .icon-button:hover::after,
  .icon-button:focus-visible::after {
    opacity: 1;
    transform: translateY(0);
  }

  .text-action {
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }
</style>
