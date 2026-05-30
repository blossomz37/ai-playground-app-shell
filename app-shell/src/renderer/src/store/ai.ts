import { get, writable } from 'svelte/store'
import type {
  AiContextCandidate,
  AiInvokeResult,
  AiOriginType,
  AiProvider,
  AiProviderId,
  AiPromptTemplate,
  AiRun,
  InvokeAiParams
} from '@shared/ai'
import { activeDocId, workspaceId } from './index'

export const aiContextCandidates = writable<AiContextCandidate[]>([])
export const aiRuns = writable<AiRun[]>([])
export const aiTemplates = writable<AiPromptTemplate[]>([])
export const aiProviders = writable<AiProvider[]>([])
export const aiSecretNames = writable<string[]>([])
export const selectedAiProviderId = writable<AiProviderId>('mock-local')
export const selectedAiModel = writable('mock-durable-context-v1')
export const selectedAiTemperature = writable(0.7)
export const aiBusy = writable(false)

let lastContextDocId: string | null = null

activeDocId.subscribe((id) => {
  if (id === lastContextDocId) return
  lastContextDocId = id
  if (id) void refreshAiContext()
})

export async function refreshAiContext(): Promise<void> {
  const candidates = await window.shell.ai.collectContext({
    workspaceId: get(workspaceId),
    activeDocumentId: get(activeDocId),
    includeDescendants: true
  })
  aiContextCandidates.set(candidates)
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
}

export async function loadAiProviders(): Promise<void> {
  const [providers, secretNames] = await Promise.all([
    window.shell.ai.providers({ workspaceId: get(workspaceId) }),
    window.shell.secrets.list()
  ])
  aiProviders.set(providers)
  aiSecretNames.set(secretNames)

  const savedProviderId = await window.shell.settings.get('ai.providerId')
  const providerId = typeof savedProviderId === 'string' && providers.some(provider => provider.providerId === savedProviderId)
    ? savedProviderId
    : 'mock-local'
  selectedAiProviderId.set(providerId)

  const provider = providers.find(item => item.providerId === providerId) ?? providers[0]
  const savedModel = await window.shell.settings.get(`ai.model.${providerId}`)
  selectedAiModel.set(typeof savedModel === 'string' && savedModel.trim()
    ? savedModel
    : provider?.defaultModel ?? 'mock-durable-context-v1')

  const savedTemperature = await window.shell.settings.get('ai.temperature')
  selectedAiTemperature.set(typeof savedTemperature === 'number' ? savedTemperature : 0.7)
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

export async function invokeAi(params: {
  moduleId: string
  originType: AiOriginType
  originId?: string
  prompt: string
  variables?: Record<string, string>
  providerId?: AiProviderId
  model?: string
  temperature?: number
}): Promise<AiInvokeResult> {
  aiBusy.set(true)
  try {
    if (get(aiProviders).length === 0) {
      await loadAiProviders()
    }

    const payload: InvokeAiParams = {
      workspaceId: get(workspaceId),
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
    const result = await window.shell.ai.invoke(payload)
    await loadAiRuns(params.moduleId)
    return result
  } finally {
    aiBusy.set(false)
  }
}
