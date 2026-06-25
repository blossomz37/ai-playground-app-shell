import { ipcMain, nativeTheme, BrowserWindow, dialog, shell } from 'electron'
import type {
  AssetDocumentLinkParams,
  AssetDocumentLinkUpdateParams,
  AssetExportParams,
  AssetImportParams,
  AssetListParams,
  AssetUpdatePatch,
  AssetWorkspaceLinkParams,
  AssetWorkspaceLinkUpdateParams,
  CreateDocumentAnnotationParams,
  CreateDocumentAnnotationSessionParams,
  DocumentAnnotationPatch,
  DocumentExportParams,
  DocumentLifecycleOptions,
  DocumentMetadataPatch,
  DocumentNodeType,
  DocumentSaveOptions,
  DocumentVersionRestoreParams,
  ListDocumentAnnotationsOptions,
  JournalEntry,
  JournalExportParams,
  ThemeMode,
  WorkspaceDuplicateParams,
  WorkspaceImportParams,
  WorkspaceListParams
} from '@shared/module-contract'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { documents } from './core/documents'
import { assets } from './core/assets'
import { createSettingsStore } from './core/settings'
import { searchService } from './core/search'
import { layoutService } from './core/layout'
import { secretsService } from './core/secrets'
import { workspaceService } from './core/workspaces'
import { jobs } from './core/jobs'
import { aiOrchestrator } from './ai/orchestrator'
import { parseJournalMarkdown, serializeJournalEntry } from '@shared/journal-markdown'
import { moduleRegistry } from './modules/registry'
import { getCommandHandler } from './modules/context'
import { themeStartupBackground, toNativeThemeSource } from './core/theme'
import type {
  AiConversationLifecycleParams,
  AiPromptTemplateLifecycleParams,
  AiPromptTemplate,
  AppendAiMessageParams,
  CollectAiContextParams,
  CreateAiProposalParams,
  CreateAiConversationParams,
  InvokeAiParams,
  ListAiProposalsParams,
  ListAiProvidersParams,
  ListAiRunsParams,
  RenameAiConversationParams,
  RenameAiPromptTemplateParams,
  ResolveAiProposalParams
} from '@shared/ai'

const shellSettings = createSettingsStore('shell')

export function registerIpcHandlers(): void {
  ipcMain.handle('documents:list', (_e, { workspaceId }: { workspaceId: string }) =>
    documents.list(workspaceId)
  )

  ipcMain.handle('documents:listArchived', (_e, { workspaceId }: { workspaceId: string }) =>
    documents.listArchived(workspaceId)
  )

  ipcMain.handle('documents:open', (_e, { id }: { id: string }) =>
    documents.open(id)
  )

  ipcMain.handle('documents:save', (_e, { id, content, options }: { id: string; content: string; options?: DocumentSaveOptions }) => {
    documents.save(id, content, options)
  })

  ipcMain.handle('documents:update', (_e, { id, patch }: {
    id: string; patch: { title?: string; kind?: string | null; icon?: string | null }
  }) => documents.update(id, patch))

  ipcMain.handle('documents:updateMetadata', (_e, { id, patch }: {
    id: string; patch: DocumentMetadataPatch
  }) => documents.updateMetadata(id, patch))

  ipcMain.handle('documents:duplicate', (_e, { id, options }: {
    id: string; options?: DocumentLifecycleOptions
  }) => documents.duplicate(id, options))

  ipcMain.handle('documents:delete', (_e, { id, options }: {
    id: string; options?: DocumentLifecycleOptions
  }) => documents.delete(id, options))

  ipcMain.handle('documents:create', (_e, params: {
    workspaceId: string; nodeType?: DocumentNodeType; kind?: string | null; title: string; parentId?: string | null; sortOrder?: number
  }) => documents.create(params))

  ipcMain.handle('documents:move', (_e, params: {
    id: string; parentId?: string | null; sortOrder: number
  }) => documents.move(params))

  ipcMain.handle('documents:archive', (_e, { id, options }: {
    id: string; options?: { recursive?: boolean }
  }) => documents.archive(id, options))

  ipcMain.handle('documents:restore', (_e, { id, options }: {
    id: string; options?: { recursive?: boolean }
  }) => documents.restore(id, options))

  ipcMain.handle('documents:exportSubtree', async (event, { id, params }: {
    id: string; params?: DocumentExportParams
  }) => {
    let targetDir = params?.targetDir
    if (!targetDir) {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Export document',
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Document export cancelled')
      }
      targetDir = result.filePaths[0]
    }

    return documents.exportSubtree(id, { ...params, targetDir })
  })

  ipcMain.handle('documents:versions', (_e, { id }: { id: string }) =>
    documents.versions(id)
  )

  ipcMain.handle('documents:restoreVersion', (_e, { versionId, params }: {
    versionId: string; params: DocumentVersionRestoreParams
  }) => documents.restoreVersion(versionId, params))

  ipcMain.handle('documents:listAnnotationSessions', (_e, { documentId }: { documentId: string }) =>
    documents.listAnnotationSessions(documentId)
  )

  ipcMain.handle('documents:createAnnotationSession', (_e, params: CreateDocumentAnnotationSessionParams) =>
    documents.createAnnotationSession(params)
  )

  ipcMain.handle('documents:listAnnotations', (_e, { documentId, options }: {
    documentId: string; options?: ListDocumentAnnotationsOptions
  }) => documents.listAnnotations(documentId, options))

  ipcMain.handle('documents:createAnnotation', (_e, params: CreateDocumentAnnotationParams) =>
    documents.createAnnotation(params)
  )

  ipcMain.handle('documents:updateAnnotation', (_e, { id, patch }: {
    id: string; patch: DocumentAnnotationPatch
  }) => documents.updateAnnotation(id, patch))

  ipcMain.handle('documents:resolveAnnotation', (_e, { id }: { id: string }) =>
    documents.resolveAnnotation(id)
  )

  ipcMain.handle('documents:reopenAnnotation', (_e, { id }: { id: string }) =>
    documents.reopenAnnotation(id)
  )

  ipcMain.handle('documents:deleteAnnotation', (_e, { id }: { id: string }) =>
    documents.deleteAnnotation(id)
  )

  ipcMain.handle('workspace:get', () => workspaceService.getActive())

  ipcMain.handle('workspace:list', (_e, params?: WorkspaceListParams) => workspaceService.list(params))

  ipcMain.handle('workspace:create', async (event, params: { name: string; type?: string; root?: string }) => {
    let root = params.root
    if (!root) {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Choose workspace folder',
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Workspace creation cancelled')
      }
      root = result.filePaths[0]
    }
    return workspaceService.create({ ...params, root })
  })

  ipcMain.handle('workspace:importFolder', async (event, params: WorkspaceImportParams = {}) => {
    let root = params.root
    if (!root) {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Import folder as project',
        properties: ['openDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Folder import cancelled')
      }
      root = result.filePaths[0]
    }
    return workspaceService.importFolder({ ...params, root })
  })

  ipcMain.handle('workspace:duplicate', (_e, { id, params }: { id: string; params?: WorkspaceDuplicateParams }) =>
    workspaceService.duplicate(id, params)
  )

  ipcMain.handle('workspace:archive', async (_e, { id }: { id: string }) => {
    const workspace = workspaceService.archive(id)
    await moduleRegistry.refreshWorkspace(workspace)
    return workspace
  })

  ipcMain.handle('workspace:restore', async (_e, { id }: { id: string }) => {
    const workspace = workspaceService.restore(id)
    await moduleRegistry.refreshWorkspace(workspace)
    return workspace
  })

  ipcMain.handle('workspace:delete', async (_e, { id }: { id: string }) => {
    const workspace = workspaceService.delete(id)
    await moduleRegistry.refreshWorkspace(workspace)
    return workspace
  })

  ipcMain.handle('workspace:switch', async (_e, { id }: { id: string }) => {
    const workspace = workspaceService.switch(id)
    await moduleRegistry.refreshWorkspace(workspace)
    return workspace
  })

  ipcMain.handle('settings:get', (_e, { key }: { key: string }) =>
    shellSettings.get(key)
  )

  ipcMain.handle('settings:set', (_e, { key, value }: { key: string; value: unknown }) => {
    shellSettings.set(key, value)
  })

  ipcMain.handle('modules:list', () => moduleRegistry.list())

  // Demand-activate a module (renderer requests activation, e.g. rail click)
  ipcMain.handle('modules:activate', async (_e, { id }: { id: string }) => {
    await moduleRegistry.ensureActivated(id)
  })

  // Toggle a module's enabled state (persist intent, optionally deactivate)
  ipcMain.handle('modules:setEnabled', async (_e, { id, enabled }: { id: string; enabled: boolean }) => {
    if (enabled) {
      moduleRegistry.enable(id)
    } else {
      moduleRegistry.disable(id)
      if (!moduleRegistry.isEnabled(id)) {
        await moduleRegistry.deactivate(id)
      }
    }
  })

  ipcMain.handle('modules:setVisible', (_e, { id, visible }: { id: string; visible: boolean }) => {
    moduleRegistry.setVisible(id, visible)
  })

  ipcMain.handle('commands:list', () => moduleRegistry.commands())

  // Demand-activate the owning module if the command handler isn't registered yet
  ipcMain.handle('commands:execute', async (_e, id: string, ...args: unknown[]) => {
    const declaredOwner = moduleRegistry.findDeclaredModuleForCommand(id)
    if (declaredOwner && !moduleRegistry.isEnabled(declaredOwner)) {
      throw new Error(`Command unavailable because module is disabled: ${declaredOwner}`)
    }

    let h = getCommandHandler(id)
    if (!h) {
      const moduleId = moduleRegistry.findModuleForCommand(id)
      if (moduleId) {
        await moduleRegistry.ensureActivated(moduleId)
        h = getCommandHandler(id)
      }
    }
    if (!h) throw new Error(`Command not found: ${id}`)
    return h(...args)
  })

  // ── Search ────────────────────────────────────────────────────────────────
  ipcMain.handle('search:query', (_e, { query, limit }: { query: string; limit?: number }) =>
    searchService.search(query, workspaceService.getActive().id, limit)
  )

  // ── AI orchestration ─────────────────────────────────────────────────────
  ipcMain.handle('ai:context:collect', (_e, params: CollectAiContextParams) =>
    aiOrchestrator.collectContext(params)
  )

  ipcMain.handle('ai:invoke', (_e, params: InvokeAiParams) =>
    aiOrchestrator.invoke(params)
  )

  ipcMain.handle('ai:preview', (_e, params: InvokeAiParams) =>
    aiOrchestrator.preview(params)
  )

  ipcMain.handle('ai:providers', (_e, params: ListAiProvidersParams) =>
    aiOrchestrator.listProviders(params)
  )

  ipcMain.handle('ai:runs', (_e, params: ListAiRunsParams) =>
    aiOrchestrator.listRuns(params)
  )

  ipcMain.handle('ai:proposals', (_e, params: ListAiProposalsParams) =>
    aiOrchestrator.listProposals(params)
  )

  ipcMain.handle('ai:proposals:create', (_e, params: CreateAiProposalParams) =>
    aiOrchestrator.createProposal(params)
  )

  ipcMain.handle('ai:proposals:accept', (_e, params: ResolveAiProposalParams) =>
    aiOrchestrator.acceptProposal(params)
  )

  ipcMain.handle('ai:proposals:reject', (_e, params: ResolveAiProposalParams) =>
    aiOrchestrator.rejectProposal(params)
  )

  ipcMain.handle('ai:conversations', (_e, { workspaceId }: { workspaceId: string }) =>
    aiOrchestrator.listConversations(workspaceId)
  )

  ipcMain.handle('ai:conversations:archived', (_e, { workspaceId }: { workspaceId: string }) =>
    aiOrchestrator.listArchivedConversations(workspaceId)
  )

  ipcMain.handle('ai:conversations:create', (_e, params: CreateAiConversationParams) =>
    aiOrchestrator.createConversation(params)
  )

  ipcMain.handle('ai:conversations:rename', (_e, params: RenameAiConversationParams) =>
    aiOrchestrator.renameConversation(params)
  )

  ipcMain.handle('ai:conversations:archive', (_e, params: AiConversationLifecycleParams) =>
    aiOrchestrator.archiveConversation(params)
  )

  ipcMain.handle('ai:conversations:restore', (_e, params: AiConversationLifecycleParams) =>
    aiOrchestrator.restoreConversation(params)
  )

  ipcMain.handle('ai:conversations:delete', (_e, params: AiConversationLifecycleParams) =>
    aiOrchestrator.deleteConversation(params)
  )

  ipcMain.handle('ai:messages:append', (_e, params: AppendAiMessageParams) =>
    aiOrchestrator.appendMessage(params)
  )

  ipcMain.handle('ai:templates', (_e, { workspaceId }: { workspaceId: string }) =>
    aiOrchestrator.listTemplates(workspaceId)
  )

  ipcMain.handle('ai:templates:archived', (_e, { workspaceId }: { workspaceId: string }) =>
    aiOrchestrator.listArchivedTemplates(workspaceId)
  )

  ipcMain.handle('ai:templates:save', (_e, template: AiPromptTemplate) =>
    aiOrchestrator.saveTemplate(template)
  )

  ipcMain.handle('ai:templates:rename', (_e, params: RenameAiPromptTemplateParams) =>
    aiOrchestrator.renameTemplate(params)
  )

  ipcMain.handle('ai:templates:duplicate', (_e, params: AiPromptTemplateLifecycleParams) =>
    aiOrchestrator.duplicateTemplate(params)
  )

  ipcMain.handle('ai:templates:archive', (_e, params: AiPromptTemplateLifecycleParams) =>
    aiOrchestrator.archiveTemplate(params)
  )

  ipcMain.handle('ai:templates:restore', (_e, params: AiPromptTemplateLifecycleParams) =>
    aiOrchestrator.restoreTemplate(params)
  )

  ipcMain.handle('ai:templates:delete', (_e, params: AiPromptTemplateLifecycleParams) =>
    aiOrchestrator.deleteTemplate(params)
  )

  // ── Assets ───────────────────────────────────────────────────────────────
  ipcMain.handle('assets:list', (_event, params: AssetListParams) => assets.list(params))

  ipcMain.handle('assets:open', (_event, { id }: { id: string }) => assets.open(id))

  ipcMain.handle('assets:importFiles', async (event, params: AssetImportParams) => {
    let filePaths = params.filePaths
    if (!filePaths) {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Import assets',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Assets', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf', 'epub', 'mp3', 'm4a', 'wav', 'aiff', 'flac', 'txt', 'md', 'markdown', 'docx'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled) return []
      filePaths = result.filePaths
    }

    return assets.importFiles({ ...params, filePaths })
  })

  ipcMain.handle('assets:update', (_event, { id, patch }: { id: string; patch: AssetUpdatePatch }) =>
    assets.update(id, patch)
  )

  ipcMain.handle('assets:addWorkspaceLink', (_event, params: AssetWorkspaceLinkParams) =>
    assets.addWorkspaceLink(params)
  )

  ipcMain.handle('assets:updateWorkspaceLink', (_event, params: AssetWorkspaceLinkUpdateParams) =>
    assets.updateWorkspaceLink(params)
  )

  ipcMain.handle('assets:removeWorkspaceLink', (_event, params: AssetWorkspaceLinkParams) =>
    assets.removeWorkspaceLink(params)
  )

  ipcMain.handle('assets:addDocumentLink', (_event, params: AssetDocumentLinkParams) =>
    assets.addDocumentLink(params)
  )

  ipcMain.handle('assets:updateDocumentLink', (_event, params: AssetDocumentLinkUpdateParams) =>
    assets.updateDocumentLink(params)
  )

  ipcMain.handle('assets:removeDocumentLink', (_event, params: AssetDocumentLinkParams) =>
    assets.removeDocumentLink(params)
  )

  ipcMain.handle('assets:archive', (_event, { id }: { id: string }) => assets.archive(id))

  ipcMain.handle('assets:restore', (_event, { id }: { id: string }) => assets.restore(id))

  ipcMain.handle('assets:delete', (_event, { id }: { id: string }) => assets.delete(id))

  ipcMain.handle('assets:exportAssets', async (event, { ids, params }: {
    ids: string[]
    params?: AssetExportParams
  }) => {
    let targetDir = params?.targetDir
    if (!targetDir) {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Export assets',
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Asset export cancelled')
      }
      targetDir = result.filePaths[0]
    }

    return assets.exportAssets(ids, { ...params, targetDir })
  })

  ipcMain.handle('assets:readPdf', (_event, { id }: { id: string }) => {
    const asset = assets.open(id)
    if (!asset) throw new Error('PDF asset was not found.')
    if (asset.mediaType !== 'pdf') throw new Error('Selected asset is not a PDF.')
    if (!asset.filePath) throw new Error('PDF asset has no source file path.')
    if (!existsSync(asset.filePath)) throw new Error('PDF source file is missing or unavailable.')

    return {
      assetId: asset.id,
      fileName: asset.originalName,
      mimeType: 'application/pdf' as const,
      pageCount: typeof asset.metadata.pageCount === 'number' ? asset.metadata.pageCount : null,
      dataBase64: readFileSync(asset.filePath).toString('base64')
    }
  })

  ipcMain.handle('assets:reveal', (_e, { path: filePath }: { path: string }) => {
    shell.showItemInFolder(filePath)
  })

  // ── Journal import/export ────────────────────────────────────────────────
  ipcMain.handle('journal:pickImportFiles', async (event, params?: { filePaths?: string[] }) => {
    let filePaths = params?.filePaths
    if (!filePaths) {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Import journal entries',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled) return []
      filePaths = result.filePaths
    }

    return filePaths.map((filePath) => {
      const content = readFileSync(filePath, 'utf8')
      const parsed = parseJournalMarkdown(content, {
        title: path.basename(filePath, path.extname(filePath)),
        date: 'Imported',
        fullDate: 'Imported'
      })
      return {
        sourcePath: filePath,
        entry: {
          id: randomUUID(),
          ...parsed
        }
      }
    })
  })

  ipcMain.handle('journal:exportEntries', async (event, { entries, params }: {
    entries: JournalEntry[]
    params?: JournalExportParams
  }) => {
    let targetDir = params?.targetDir
    if (!targetDir) {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Export journal entries',
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Journal export cancelled')
      }
      targetDir = result.filePaths[0]
    }

    const resolvedTarget = path.resolve(targetDir)
    mkdirSync(resolvedTarget, { recursive: true })
    const usedPaths = new Set<string>()
    const filesWritten = entries.map((entry) => {
      const filePath = uniqueJournalExportPath(resolvedTarget, entry.title, usedPaths)
      writeFileSync(filePath, serializeJournalEntry(entry), 'utf8')
      return filePath
    })

    return {
      targetDir: resolvedTarget,
      filesWritten
    }
  })

  // ── Layout ────────────────────────────────────────────────────────────────
  ipcMain.handle('layout:get', () => layoutService.get())

  ipcMain.handle('layout:set', (_e, state: Record<string, unknown>) => {
    layoutService.set(state)
  })

  ipcMain.handle('layout:toggle', (_e, { zone }: { zone: 'sidebar' | 'inspector' }) =>
    layoutService.toggle(zone)
  )

  ipcMain.handle('layout:resize', (_e, { zone, px }: { zone: 'sidebar' | 'inspector'; px: number }) =>
    layoutService.resize(zone, px)
  )

  ipcMain.handle('layout:toggleZen', () => layoutService.toggleZen())

  // ── Secrets ───────────────────────────────────────────────────────────────
  ipcMain.handle('secrets:list', () => secretsService.list())

  ipcMain.handle('secrets:set', (_e, { name, value }: { name: string; value: string }) => {
    secretsService.set(name, value)
  })

  ipcMain.handle('secrets:delete', (_e, { name }: { name: string }) => {
    secretsService.delete(name)
  })

  // ── Jobs ────────────────────────────────────────────────────────────────
  ipcMain.handle('jobs:list', (_e, params?: { workspaceId?: string; limit?: number }) =>
    jobs.list(params)
  )

  ipcMain.handle('jobs:submit', (_e, { type, payload }: { type: string; payload?: unknown }) => {
    const workspace = workspaceService.getActive()
    const handle = jobs.submit(type, payload, { workspaceId: workspace.id, moduleId: 'renderer' })
    return jobs.list({ limit: 1 }).find(job => job.id === handle.id) ?? null
  })

  ipcMain.handle('jobs:cancel', (_e, { id }: { id: string }) =>
    jobs.cancel(id)
  )

  // ── Theme ────────────────────────────────────────────────────────────────
  ipcMain.handle('theme:set', (_e, { mode }: { mode: ThemeMode }) => {
    // Persist
    shellSettings.set('theme', mode)
    // Sync Electron's native chrome (title bar, native dialogs)
    nativeTheme.themeSource = toNativeThemeSource(mode)
    // Update window background color to prevent flash on next cold launch
    const bgColor = themeStartupBackground(mode, nativeTheme.shouldUseDarkColors)
    for (const win of BrowserWindow.getAllWindows()) {
      win.setBackgroundColor(bgColor)
    }
  })
}

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g

function uniqueJournalExportPath(outputDir: string, title: string, usedPaths: Set<string>): string {
  const baseName = safeJournalFilename(title)
  let suffix = 1
  let candidate = path.join(outputDir, `${baseName}.md`)
  while (usedPaths.has(candidate) || existsSync(candidate)) {
    suffix += 1
    candidate = path.join(outputDir, `${baseName}-${suffix}.md`)
  }
  usedPaths.add(candidate)
  return candidate
}

function safeJournalFilename(title: string): string {
  const normalized = title
    .trim()
    .replace(INVALID_FILENAME_CHARS, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .replace(/^\.+/g, '')

  return normalized || 'journal-entry'
}
