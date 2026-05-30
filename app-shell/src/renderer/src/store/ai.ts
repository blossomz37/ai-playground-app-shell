import { get, writable } from 'svelte/store'
import type {
  AiContextCandidate,
  AiInvokeResult,
  AiOriginType,
  AiPromptTemplate,
  AiRun,
  InvokeAiParams
} from '@shared/ai'
import { activeDocId, workspaceId } from './index'

export const aiContextCandidates = writable<AiContextCandidate[]>([])
export const aiRuns = writable<AiRun[]>([])
export const aiTemplates = writable<AiPromptTemplate[]>([])
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

export async function invokeAi(params: {
  moduleId: string
  originType: AiOriginType
  originId?: string
  prompt: string
  variables?: Record<string, string>
  model?: string
  temperature?: number
}): Promise<AiInvokeResult> {
  aiBusy.set(true)
  try {
    const payload: InvokeAiParams = {
      workspaceId: get(workspaceId),
      moduleId: params.moduleId,
      originType: params.originType,
      originId: params.originId,
      prompt: params.prompt,
      variables: params.variables,
      model: params.model,
      temperature: params.temperature,
      contextCandidates: includedAiContextCandidates()
    }
    const result = await window.shell.ai.invoke(payload)
    await loadAiRuns(params.moduleId)
    return result
  } finally {
    aiBusy.set(false)
  }
}
