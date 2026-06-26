<script lang="ts">
  import { onMount } from 'svelte'
  import {
    aiModelPresets,
    applyAiModelPreset,
    loadAiModelPresets,
    saveCurrentAiSettingsAsCustomPreset,
    selectedAiPresetId
  } from '../store/ai'
  import type { AiModelPresetId } from '../store/ai'
  import { addToast } from '../store/toasts'

  let { fieldId = 'ai-model-preset' }: { fieldId?: string } = $props()
  let activePreset = $derived($aiModelPresets.find(preset => preset.id === $selectedAiPresetId) ?? $aiModelPresets[0])

  onMount(() => {
    void loadAiModelPresets()
  })

  async function choosePreset(id: string): Promise<void> {
    await applyAiModelPreset(id as AiModelPresetId)
  }

  async function saveCustom(): Promise<void> {
    await saveCurrentAiSettingsAsCustomPreset()
    addToast('info', 'Custom AI preset saved.')
  }
</script>

<div class="preset-picker">
  <div class="field">
    <label for={fieldId}>Task preset</label>
    <select
      id={fieldId}
      class="select-input"
      value={$selectedAiPresetId}
      onchange={(event) => void choosePreset(event.currentTarget.value)}
    >
      {#each $aiModelPresets as preset (preset.id)}
        <option value={preset.id}>{preset.label}</option>
      {/each}
    </select>
  </div>

  {#if activePreset}
    <div class="preset-detail">
      <div>
        <div class="preset-title">{activePreset.model} · temp {activePreset.temperature.toFixed(1)}</div>
        <div class="preset-description">{activePreset.description}</div>
      </div>
      <button type="button" class="save-custom" onclick={() => void saveCustom()}>Save Custom</button>
    </div>
  {/if}
</div>

<style>
  .preset-picker {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-fg-primary);
  }

  .select-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
  }

  .select-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .preset-detail {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-base);
  }

  .preset-title {
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .preset-description {
    margin-top: 2px;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    line-height: 1.4;
  }

  .save-custom {
    min-height: 28px;
    padding: 0 var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
  }

  .save-custom:hover {
    border-color: var(--color-accent);
    color: var(--color-fg-primary);
  }
</style>
