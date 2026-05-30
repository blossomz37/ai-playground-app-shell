import type {
  AiContextCandidate,
  AiInvokeResult,
  AiProvider,
  AiPromptTemplate,
  CollectAiContextParams,
  InvokeAiParams,
  ListAiProvidersParams,
  ListAiRunsParams
} from '@shared/ai'
import { documents } from '../core/documents'
import { events } from '../core/events'
import { aiRepository } from './repository'
import { runMockProvider } from './mock-provider'
import { runOpenAiProvider } from './openai-provider'

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.35))
}

function excerpt(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return 'No text content.'
  return cleaned.length > 220 ? `${cleaned.slice(0, 217)}...` : cleaned
}

function renderContext(candidates: AiContextCandidate[]): string {
  const included = candidates.filter(c => c.included)
  if (included.length === 0) return ''

  return included
    .map(c => [`# ${c.title}`, c.content.trim()].filter(Boolean).join('\n\n'))
    .join('\n\n---\n\n')
}

function resolveProvider(workspaceId: string, providerId: string | undefined): AiProvider {
  const provider = aiRepository.getProvider(workspaceId, providerId ?? 'mock-local')
  if (provider) return provider

  const fallback = aiRepository.getProvider(workspaceId, 'mock-local')
  if (!fallback) throw new Error('Mock AI provider is not configured.')
  return fallback
}

function candidateFromDocument(args: {
  id: string
  sourceType: AiContextCandidate['sourceType']
  title: string
  kind: string
  content: string
  priority: number
  reason: string
}): AiContextCandidate {
  return {
    id: `${args.sourceType}:${args.id}`,
    sourceType: args.sourceType,
    sourceId: args.id,
    title: args.title,
    kind: args.kind,
    excerpt: excerpt(args.content),
    content: args.content,
    estimatedTokens: estimateTokens(args.content),
    included: true,
    priority: args.priority,
    reason: args.reason
  }
}

export const aiOrchestrator = {
  collectContext(params: CollectAiContextParams): AiContextCandidate[] {
    aiRepository.ensureDefaults(params.workspaceId)

    const candidates: AiContextCandidate[] = []
    const seen = new Set<string>()

    const addDocument = (
      documentId: string | undefined | null,
      sourceType: AiContextCandidate['sourceType'],
      reason: string,
      priority: number
    ) => {
      if (!documentId || seen.has(documentId)) return
      const doc = documents.open(documentId)
      if (!doc || doc.workspaceId !== params.workspaceId || doc.archivedAt) return
      seen.add(documentId)
      candidates.push(candidateFromDocument({
        id: doc.id,
        sourceType,
        title: doc.title,
        kind: doc.kind,
        content: doc.content,
        priority,
        reason
      }))
    }

    addDocument(params.activeDocumentId, 'active-document', 'Currently open document', 100)

    for (const id of params.selectedDocumentIds ?? []) {
      addDocument(id, 'selected-document', 'Explicitly selected for this run', 80)
    }

    if (params.includeDescendants && params.activeDocumentId) {
      const allDocs = documents.list(params.workspaceId)
      const queue = [params.activeDocumentId]
      while (queue.length > 0) {
        const parentId = queue.shift()
        for (const doc of allDocs.filter(d => d.parentId === parentId)) {
          addDocument(doc.id, 'document-descendant', 'Descendant of the active document', 60)
          queue.push(doc.id)
        }
      }
    }

    const note = params.manualNote?.trim()
    if (note) {
      candidates.push({
        id: `manual-note:${Date.now()}`,
        sourceType: 'manual-note',
        sourceId: 'manual-note',
        title: 'Manual note',
        kind: 'note',
        excerpt: excerpt(note),
        content: note,
        estimatedTokens: estimateTokens(note),
        included: true,
        priority: 70,
        reason: 'Added by the user for this run'
      })
    }

    return candidates.sort((a, b) => b.priority - a.priority)
  },

  async invoke(params: InvokeAiParams): Promise<AiInvokeResult> {
    aiRepository.ensureDefaults(params.workspaceId)
    const provider = resolveProvider(params.workspaceId, params.providerId)
    const invokeParams: InvokeAiParams = {
      ...params,
      providerId: provider.providerId,
      model: params.model ?? provider.defaultModel
    }

    const candidates = invokeParams.contextCandidates ?? this.collectContext({
      workspaceId: invokeParams.workspaceId
    })

    const renderedText = renderContext(candidates)
    const tokenEstimate = estimateTokens([invokeParams.prompt, renderedText].join('\n\n'))
    const run = aiRepository.createRun(invokeParams)

    const contextPack = aiRepository.createContextPack({
      workspaceId: invokeParams.workspaceId,
      runId: run.id,
      candidates,
      renderedText,
      tokenEstimate,
      packingStrategy: 'included-candidates-v1'
    })

    events.emit('ai.run.started', run)

    try {
      const output = provider.providerId === 'openai-responses'
        ? await runOpenAiProvider({ params: invokeParams, provider, candidates, renderedContext: renderedText })
        : await runMockProvider(invokeParams, candidates)
      const completed = aiRepository.completeRun(run.id, output)
      events.emit('ai.run.completed', completed)
      return { run: completed, contextPack }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const failed = aiRepository.failRun(run.id, message)
      events.emit('ai.run.failed', failed)
      return { run: failed, contextPack }
    }
  },

  listProviders(params: ListAiProvidersParams): AiProvider[] {
    return aiRepository.listProviders(params.workspaceId)
  },

  listRuns(params: ListAiRunsParams) {
    aiRepository.ensureDefaults(params.workspaceId)
    return aiRepository.listRuns(params)
  },

  listTemplates(workspaceId: string): AiPromptTemplate[] {
    return aiRepository.listTemplates(workspaceId)
  },

  saveTemplate(template: AiPromptTemplate): AiPromptTemplate {
    return aiRepository.saveTemplate(template)
  }
}
