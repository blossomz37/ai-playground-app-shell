// ──────────────────────────────────────────────
// File:        navigate.ts
// Description: Route a universal-search result to its owning module + entity
// Version:     0.1.0
// Created:     2026-06-26
// Author:      antigravity
// ──────────────────────────────────────────────

import type { SearchResult } from '@shared/module-contract'
import { activeModuleId, selectDoc } from './index'
import { loadAiConversations, selectAiConversation } from '../modules/aichat/state'
import { loadAiTemplates, selectAiTemplate } from './ai'
import { loadAssetsWorkspace, selectAsset } from '../modules/assets/state'

/**
 * Open a search result in the correct module, focused on the entity.
 *
 * Mirrors the established "switch module, activate it, select entity" pattern
 * (see tableview/MainView.svelte). For non-document entities we ensure the
 * target list is loaded before selecting, since selection is a no-op when the
 * entity isn't in the module's loaded state.
 */
export async function navigateToSearchResult(result: SearchResult): Promise<void> {
  switch (result.entityType) {
    case 'document':
      await activateModule('shell.documents')
      await selectDoc(result.entityId)
      return
    case 'conversation':
      await activateModule('shell.aichat')
      await loadAiConversations(true)
      selectAiConversation(result.entityId)
      return
    case 'template':
      await activateModule('shell.promptstudio')
      await loadAiTemplates()
      selectAiTemplate(result.entityId)
      return
    case 'asset':
      await activateModule('shell.assets')
      await loadAssetsWorkspace()
      selectAsset(result.entityId)
      return
  }
}

async function activateModule(moduleId: string): Promise<void> {
  activeModuleId.set(moduleId)
  await window.shell.modules.activate(moduleId)
}
