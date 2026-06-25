import { derived, get, writable } from 'svelte/store'
import type {
  AiContextCandidate,
  AiInvokeResult,
  AiOriginType,
  AiPreview,
  AiProvider,
  AiProviderId,
  AiPromptTemplate,
  AiRun,
  InvokeAiParams
} from '@shared/ai'
import { activeDocId, activeWorkspace, demoModeEnabled, documents, selectDoc, workspaceId } from './index'
import { addToast } from './toasts'

export const aiContextCandidates = writable<AiContextCandidate[]>([])
export const aiRuns = writable<AiRun[]>([])
export const aiTemplates = writable<AiPromptTemplate[]>([])
export const selectedAiTemplateId = writable<string | null>(null)
export const selectedAiTemplate = derived(
  [aiTemplates, selectedAiTemplateId],
  ([$aiTemplates, $selectedAiTemplateId]) =>
    $aiTemplates.find(template => template.id === $selectedAiTemplateId) ?? $aiTemplates[0] ?? null
)
export const aiProviders = writable<AiProvider[]>([])
export const aiSecretNames = writable<string[]>([])
export const selectedAiProviderId = writable<AiProviderId>('openai-responses')
export const selectedAiModel = writable('gpt-4.1-mini')
export const selectedAiTemperature = writable(0.7)
export const aiBusy = writable(false)

// User-controlled context additions, shared by the AI context picker.
export const manualContextNote = writable('')
export const manualContextDocIds = writable<string[]>([])
export const manualContextFolderIds = writable<string[]>([])
export const manualContextExcludedDocIds = writable<string[]>([])

interface PersistedContextSelection {
  documentIds?: unknown
  folderIds?: unknown
  excludedDocumentIds?: unknown
  manualNote?: unknown
}

const FALLBACK_OPENAI_MODELS = ['gpt-5.2', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano']

let lastContextDocId: string | null = null
let loadedContextWorkspaceId: string | null = null
const AI_OUTPUTS_FOLDER_TITLE = 'AI Outputs'

function contextSelectionKey(wsId: string): string {
  return `ai.contextSelection.${wsId}`
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

async function loadPersistedContextSelection(wsId: string): Promise<void> {
  if (loadedContextWorkspaceId === wsId) return
  const saved = await window.shell.settings.get(contextSelectionKey(wsId)) as PersistedContextSelection | undefined
  manualContextDocIds.set(stringArray(saved?.documentIds))
  manualContextFolderIds.set(stringArray(saved?.folderIds))
  manualContextExcludedDocIds.set(stringArray(saved?.excludedDocumentIds))
  manualContextNote.set(typeof saved?.manualNote === 'string' ? saved.manualNote : '')
  loadedContextWorkspaceId = wsId
}

async function persistContextSelection(): Promise<void> {
  const wsId = get(workspaceId)
  await window.shell.settings.set(contextSelectionKey(wsId), {
    documentIds: get(manualContextDocIds),
    folderIds: get(manualContextFolderIds),
    excludedDocumentIds: get(manualContextExcludedDocIds),
    manualNote: get(manualContextNote)
  })
}

function persistContextSelectionAndRefresh(): void {
  loadedContextWorkspaceId = get(workspaceId)
  void persistContextSelection().then(() => refreshAiContext())
}

function descendantDocumentIds(rootId: string): string[] {
  const liveDocs = get(documents).filter(doc => !doc.archivedAt)
  const childrenByParent = new Map<string | null, typeof liveDocs>()
  for (const doc of liveDocs) {
    const siblings = childrenByParent.get(doc.parentId) ?? []
    siblings.push(doc)
    childrenByParent.set(doc.parentId, siblings)
  }

  const ids: string[] = []
  const queue = [rootId]
  while (queue.length > 0) {
    const parentId = queue.shift() ?? null
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (child.nodeType === 'folder') {
        queue.push(child.id)
      } else {
        ids.push(child.id)
      }
    }
  }
  return ids
}

export function selectedManualContextDocumentIds(): string[] {
  const explicitIds = get(manualContextDocIds)
  const excludedIds = new Set(get(manualContextExcludedDocIds))
  const folderDocumentIds = get(manualContextFolderIds).flatMap(descendantDocumentIds)
  return Array.from(new Set([...explicitIds, ...folderDocumentIds])).filter(id => !excludedIds.has(id))
}

activeDocId.subscribe((id) => {
  if (id === lastContextDocId) return
  lastContextDocId = id
  if (id) void refreshAiContext()
})

export async function refreshAiContext(): Promise<void> {
  const wsId = get(workspaceId)
  await loadPersistedContextSelection(wsId)
  // Preserve any include/exclude toggles the user made before re-collecting.
  const previousIncluded = new Map(get(aiContextCandidates).map(c => [c.id, c.included]))

  const candidates = await window.shell.ai.collectContext({
    workspaceId: wsId,
    activeDocumentId: get(activeDocId),
    includeDescendants: true,
    selectedDocumentIds: selectedManualContextDocumentIds(),
    manualNote: get(manualContextNote)
  })

  aiContextCandidates.set(
    candidates.map(candidate =>
      previousIncluded.has(candidate.id)
        ? { ...candidate, included: previousIncluded.get(candidate.id)! }
        : candidate
    )
  )
}

export function setManualContextNote(note: string): void {
  manualContextNote.set(note)
  persistContextSelectionAndRefresh()
}

export function addContextDocument(documentId: string): void {
  manualContextDocIds.update(ids => ids.includes(documentId) ? ids : [...ids, documentId])
  manualContextExcludedDocIds.update(ids => ids.filter(id => id !== documentId))
  persistContextSelectionAndRefresh()
}

export function removeContextDocument(documentId: string): void {
  manualContextDocIds.update(ids => ids.filter(id => id !== documentId))
  manualContextExcludedDocIds.update(ids => ids.includes(documentId) ? ids : [...ids, documentId])
  persistContextSelectionAndRefresh()
}

export function toggleContextDocument(documentId: string): void {
  const selectedIds = new Set(selectedManualContextDocumentIds())
  if (selectedIds.has(documentId)) {
    removeContextDocument(documentId)
  } else {
    addContextDocument(documentId)
  }
}

export function toggleContextFolder(folderId: string): void {
  const selectedFolders = get(manualContextFolderIds)
  const removing = selectedFolders.includes(folderId)
  manualContextFolderIds.set(
    removing
      ? selectedFolders.filter(id => id !== folderId)
      : [...selectedFolders, folderId]
  )
  if (!removing) {
    const descendants = new Set(descendantDocumentIds(folderId))
    manualContextExcludedDocIds.update(ids => ids.filter(id => !descendants.has(id)))
  }
  persistContextSelectionAndRefresh()
}

export function toggleAiContextCandidate(id: string): void {
  aiContextCandidates.update(candidates =>
    candidates.map(candidate =>
      candidate.id === id ? { ...candidate, included: !candidate.included } : candidate
    )
  )
}

export function includedAiContextCandidates(): AiContextCandidate[] {
  return get(aiContextCandidates).filter(candidate => candidate.included)
}

export async function loadAiRuns(moduleId?: string): Promise<void> {
  const runs = await window.shell.ai.runs({
    workspaceId: get(workspaceId),
    moduleId,
    limit: 12
  })
  aiRuns.set(runs)
}

export async function loadAiTemplates(): Promise<void> {
  const templates = await window.shell.ai.templates(get(workspaceId))
  aiTemplates.set(templates)
  const selectedId = get(selectedAiTemplateId)
  if (!selectedId || !templates.some(template => template.id === selectedId)) {
    selectedAiTemplateId.set(templates[0]?.id ?? null)
  }
}

export function selectAiTemplate(id: string): void {
  if (!get(aiTemplates).some(template => template.id === id)) return
  selectedAiTemplateId.set(id)
}

export async function createAiTemplate(): Promise<AiPromptTemplate> {
  const now = new Date().toISOString()
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `template-${Date.now()}`
  const template: AiPromptTemplate = {
    id,
    workspaceId: get(workspaceId),
    name: 'Untitled Prompt',
    description: '',
    body: 'Use the selected context to help with this writing task.\n\n{{text}}',
    variables: ['text'],
    defaultModel: get(selectedAiModel),
    defaultTemperature: get(selectedAiTemperature),
    contextPolicy: { includeSelectedContext: true },
    tags: ['draft'],
    createdAt: now,
    updatedAt: now
  }
  const saved = await window.shell.ai.saveTemplate(template)
  aiTemplates.update(templates => [saved, ...templates.filter(item => item.id !== saved.id)])
  selectedAiTemplateId.set(saved.id)
  return saved
}

export async function renameAiTemplate(id: string, name: string): Promise<void> {
  const nextName = name.trim()
  if (!nextName) return
  const updated = await window.shell.ai.renameTemplate({
    workspaceId: get(workspaceId),
    id,
    name: nextName
  })
  aiTemplates.update(templates => templates.map(template => template.id === id ? updated : template))
  selectedAiTemplateId.set(id)
}

export async function loadAiProviders(): Promise<void> {
  const [providers, secretNames] = await Promise.all([
    window.shell.ai.providers({ workspaceId: get(workspaceId) }),
    window.shell.secrets.list()
  ])
  aiProviders.set(providers)
  aiSecretNames.set(secretNames)

  const savedProviderId = await window.shell.settings.get('ai.providerId')
  const currentProviderId = get(selectedAiProviderId)
  const providerId = typeof savedProviderId === 'string' && providers.some(provider => provider.providerId === savedProviderId)
    ? savedProviderId
    : providers.some(provider => provider.providerId === currentProviderId)
      ? currentProviderId
      : providers.find(provider => provider.providerId === 'openai-responses')?.providerId
        ?? providers[0]?.providerId
        ?? 'openai-responses'
  selectedAiProviderId.set(providerId)

  const provider = providers.find(item => item.providerId === providerId) ?? providers[0]
  const savedModel = await window.shell.settings.get(`ai.model.${providerId}`)
  const fallbackModel = provider?.providerId === 'openai-responses'
    ? 'gpt-4.1-mini'
    : get(demoModeEnabled)
      ? 'mock-durable-context-v1'
      : 'gpt-4.1-mini'
  selectedAiModel.set(typeof savedModel === 'string' && savedModel.trim()
    ? savedModel
    : provider?.defaultModel ?? fallbackModel)

  const savedTemperature = await window.shell.settings.get('ai.temperature')
  selectedAiTemperature.set(typeof savedTemperature === 'number' ? savedTemperature : 0.7)
}

export function modelOptionsForProvider(provider: AiProvider | undefined): string[] {
  const selected = get(selectedAiModel)
  const options = provider?.availableModels?.length
    ? provider.availableModels
    : provider?.providerId === 'openai-responses'
      ? FALLBACK_OPENAI_MODELS
      : get(demoModeEnabled)
        ? ['mock-durable-context-v1']
        : FALLBACK_OPENAI_MODELS

  return options.includes(selected) ? options : [selected, ...options]
}

export async function selectAiProvider(providerId: AiProviderId): Promise<void> {
  const providers = get(aiProviders)
  const provider = providers.find(item => item.providerId === providerId)
  if (!provider) return

  selectedAiProviderId.set(provider.providerId)
  selectedAiModel.set(provider.defaultModel)
  await window.shell.settings.set('ai.providerId', provider.providerId)
  await window.shell.settings.set(`ai.model.${provider.providerId}`, provider.defaultModel)
}

export async function selectAiModel(model: string): Promise<void> {
  const value = model.trim()
  if (!value) return
  selectedAiModel.set(value)
  await window.shell.settings.set(`ai.model.${get(selectedAiProviderId)}`, value)
}

export async function selectAiTemperature(temperature: number): Promise<void> {
  const value = Math.max(0, Math.min(2, temperature))
  selectedAiTemperature.set(value)
  await window.shell.settings.set('ai.temperature', value)
}

interface AiRequestParams {
  moduleId: string
  originType: AiOriginType
  originId?: string
  prompt: string
  variables?: Record<string, string>
  providerId?: AiProviderId
  model?: string
  temperature?: number
}

function activeWorkspaceIdOrThrow(): string {
  const workspace = get(activeWorkspace)
  if (!workspace?.id) {
    throw new Error('Create or select a project before using AI tools.')
  }
  return workspace.id
}

function aiSurfaceLabel(moduleId: string): string {
  if (moduleId === 'shell.aichat') return 'AI Chat'
  if (moduleId === 'shell.promptstudio') return 'Prompt Studio'
  if (moduleId === 'shell.workflow') return 'Workflow Runner'
  return 'AI'
}

function outputTitle(moduleId: string, createdAt: string): string {
  const timestamp = new Date(createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  return `${aiSurfaceLabel(moduleId)} Output - ${timestamp}`
}

async function ensureAiOutputsFolder(wsId: string): Promise<string> {
  const rows = await window.shell.documents.list(wsId)
  const existing = rows.find(doc =>
    doc.nodeType === 'folder'
    && doc.parentId === null
    && doc.title.trim().toLowerCase() === AI_OUTPUTS_FOLDER_TITLE.toLowerCase()
  )
  if (existing) return existing.id

  const created = await window.shell.documents.create({
    workspaceId: wsId,
    nodeType: 'folder',
    title: AI_OUTPUTS_FOLDER_TITLE,
    parentId: null
  })
  return created.id
}

function outputDocumentContent(result: AiInvokeResult): string {
  const title = outputTitle(result.run.moduleId, result.run.completedAt ?? result.run.createdAt)
  return [
    `# ${title}`,
    '',
    `Source: ${aiSurfaceLabel(result.run.moduleId)}`,
    `Run: ${result.run.id}`,
    `Model: ${result.run.providerId} / ${result.run.model}`,
    '',
    '## Prompt',
    '',
    result.run.inputSummary || '_No prompt summary recorded._',
    '',
    '## Output',
    '',
    result.run.outputText.trim() || '_No output text recorded._'
  ].join('\n')
}

async function saveAiOutputDocument(result: AiInvokeResult): Promise<void> {
  if (result.run.status !== 'completed' || !result.run.outputText.trim()) return

  const wsId = activeWorkspaceIdOrThrow()
  const folderId = await ensureAiOutputsFolder(wsId)
  const created = await window.shell.documents.create({
    workspaceId: wsId,
    nodeType: 'document',
    kind: 'ai-output',
    title: outputTitle(result.run.moduleId, result.run.completedAt ?? result.run.createdAt),
    parentId: folderId
  })
  await window.shell.documents.save(created.id, outputDocumentContent(result))
  await selectDoc(created.id)
  addToast('info', `Saved AI output to ${AI_OUTPUTS_FOLDER_TITLE}.`)
}

function buildAiPayload(params: AiRequestParams): InvokeAiParams {
  const wsId = activeWorkspaceIdOrThrow()
  return {
    workspaceId: wsId,
    moduleId: params.moduleId,
    originType: params.originType,
    originId: params.originId,
    prompt: params.prompt,
    variables: params.variables,
    providerId: params.providerId ?? get(selectedAiProviderId),
    model: params.model ?? get(selectedAiModel),
    temperature: params.temperature ?? get(selectedAiTemperature),
    contextCandidates: includedAiContextCandidates()
  }
}

export async function invokeAi(params: AiRequestParams): Promise<AiInvokeResult> {
  aiBusy.set(true)
  try {
    if (get(aiProviders).length === 0) {
      await loadAiProviders()
    }

    const result = await window.shell.ai.invoke(buildAiPayload(params))
    try {
      await saveAiOutputDocument(result)
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'AI output could not be saved to the project tree.')
    }
    await loadAiRuns(params.moduleId)
    return result
  } finally {
    aiBusy.set(false)
  }
}

// Provider-free: renders the exact prompt that would be sent, without a model
// call, run record, or secret read. Same payload path as invokeAi.
export async function previewAi(params: AiRequestParams): Promise<AiPreview> {
  if (get(aiProviders).length === 0) {
    await loadAiProviders()
  }
  return window.shell.ai.preview(buildAiPayload(params))
}
