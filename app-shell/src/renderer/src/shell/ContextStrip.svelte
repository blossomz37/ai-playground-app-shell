<script lang="ts">
  import { onMount } from 'svelte'
  import {
    ArrowsInIcon,
    ArrowsOutIcon,
    CommandIcon,
    EyeClosedIcon,
    EyeIcon,
    GearSixIcon,
    SidebarIcon,
    StackSimpleIcon
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

  let moduleNames = $state<Record<string, string>>({})
  let descriptor = $derived(moduleId ? $shellContextDescriptors[moduleId] ?? null : null)
  let moduleLabel = $derived(moduleId ? moduleNames[moduleId] ?? moduleId.replace('shell.', '') : 'No module')
  let inspectorLabel = $derived(inspectorVisible ? 'Hide inspector' : 'Show inspector')
  let sidebarLabel = $derived(sidebarVisible ? 'Hide sidebar' : 'Show sidebar')
  let zenLabel = $derived(zenMode ? 'Exit zen mode' : 'Enter zen mode')
  let fallbackContext = $derived.by(() => {
    if (moduleId === 'shell.documents') return 'No document open'
    if (moduleId === 'shell.aichat') return 'No conversation selected'
    if (moduleId === 'shell.web') return 'No page selected'
    if (moduleId === 'shell.assets') return 'No asset selected'
    if (moduleId === 'shell.workflow') return 'No workflow selected'
    if (moduleId === 'shell.tableview') return 'No row selected'
    if (moduleId === 'shell.promptstudio') return 'No prompt selected'
    return ''
  })

  onMount(async () => {
    const modules = await window.shell.modules.list()
    moduleNames = Object.fromEntries(modules.map((mod) => [mod.id, mod.name]))
  })
</script>

<section class="context-strip" aria-label="Module context">
  <div class="context-cell context-module">
    <StackSimpleIcon size={15} weight="bold" />
    <span class="label">{moduleLabel}</span>
  </div>

  <nav class="context-cell context-trail" aria-label="Current context">
    {#if descriptor?.trail?.length}
      {#each descriptor.trail as item, index (item.id)}
        {#if index > 0}
          <span class="separator">/</span>
        {/if}
        {#if item.commandId}
          <button type="button" class="trail-action" class:trail-leaf={index === descriptor.trail.length - 1} onclick={() => executeCommand(item.commandId)}>
            {item.label}
          </button>
        {:else}
          <span class="trail-item" class:trail-leaf={index === descriptor.trail.length - 1}>{item.label}</span>
        {/if}
      {/each}
    {:else if descriptor?.primaryLabel}
      <span class="trail-item strong">{descriptor.primaryLabel}</span>
    {:else if fallbackContext}
      <span class="trail-item muted">{fallbackContext}</span>
    {/if}

    {#if descriptor?.secondaryLabel}
      <span class="context-secondary">{descriptor.secondaryLabel}</span>
    {/if}
  </nav>

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
    border-bottom: 1px solid var(--color-border);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-panel-glint) 54%, transparent);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    overflow: hidden;
    user-select: none;
  }

  .context-cell {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-3);
    border-right: 1px solid color-mix(in srgb, var(--color-border) 82%, transparent);
  }

  .context-module {
    grid-column: 2;
    width: max-content;
    max-width: 220px;
  }

  .context-trail {
    grid-column: 3;
    padding-right: 260px;
  }

  .context-actions {
    position: absolute;
    top: 0;
    right: var(--space-2);
    bottom: 0;
    justify-content: flex-end;
    border-right: none;
    gap: var(--space-1);
    padding-right: var(--space-2);
  }

  .label,
  .trail-item,
  .trail-action {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .label {
    color: var(--color-fg-primary);
    font-weight: 700;
  }

  .muted,
  .context-secondary,
  .separator {
    color: var(--color-fg-muted);
  }

  .context-secondary {
    min-width: max-content;
  }

  .strong {
    color: var(--color-fg-primary);
  }

  .trail-action {
    color: var(--accent-editor);
    cursor: pointer;
    font-weight: 600;
  }

  .trail-action:hover {
    color: var(--color-fg-primary);
  }

  .trail-item:not(.trail-leaf),
  .trail-action:not(.trail-leaf) {
    flex: 0 0 auto;
  }

  .trail-leaf {
    flex: 1 1 auto;
  }

  .icon-button {
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

  .text-action {
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }
</style>
