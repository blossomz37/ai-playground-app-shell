import type {
  AiContextCandidate,
  AiChatMessage,
  AiConversation,
  AiConversationLifecycleParams,
  AiInvokeResult,
  AiPreview,
  AiProposal,
  AiProvider,
  AiPromptTemplate,
  AiPromptTemplateLifecycleParams,
  AppendAiMessageParams,
  CollectAiContextParams,
  CreateAiProposalFromInvocationParams,
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
import { STRUCTURAL_FOLDER_KIND_LABEL, UNCATEGORIZED_KIND_LABEL } from '@shared/document-kinds'
import { documents } from '../core/documents'
import { events } from '../core/events'
import { aiRepository } from './repository'
import { runMockProvider } from './mock-provider'
import { runOpenAiProvider } from './openai-provider'
import { buildAiInput } from './prompt-builder'
import { DEMO_MODE_SETTING_KEY, isDemoModeEnabled } from '@shared/demo-mode'
import { getDb } from '../core/db'
import { parseDocumentsAiStructuredProposalOutput } from '@shared/ai-writing-prompts'

function demoModeEnabled(): boolean {
  const row = getDb()
    .prepare('SELECT value FROM shell_settings WHERE key = ?')
    .get(`shell.${DEMO_MODE_SETTING_KEY}`) as { value: string } | undefined
  if (!row) return false

  try {
    return isDemoModeEnabled(JSON.parse(row.value))
  } catch {
    return false
  }
}

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
  const preferredProviderId = demoModeEnabled() ? 'mock-local' : 'openai-responses'
  const provider = aiRepository.getProvider(workspaceId, providerId ?? preferredProviderId)
  if (provider) return provider

  const fallback = aiRepository.getProvider(workspaceId, preferredProviderId)
  if (!fallback) throw new Error('AI provider is not configured.')
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
        kind: doc.nodeType === 'folder' ? STRUCTURAL_FOLDER_KIND_LABEL : doc.kind ?? UNCATEGORIZED_KIND_LABEL,
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

  preview(params: InvokeAiParams): AiPreview {
    aiRepository.ensureDefaults(params.workspaceId)
    const provider = resolveProvider(params.workspaceId, params.providerId)

    const candidates = params.contextCandidates ?? this.collectContext({
      workspaceId: params.workspaceId
    })
    const renderedContext = renderContext(candidates)
    const previewParams: InvokeAiParams = {
      ...params,
      providerId: provider.providerId,
      model: params.model ?? provider.defaultModel
    }
    const renderedPrompt = buildAiInput(previewParams, candidates, renderedContext)

    return {
      providerId: provider.providerId,
      model: previewParams.model ?? provider.defaultModel,
      temperature: params.temperature ?? 0.7,
      renderedPrompt,
      includedTitles: candidates.filter(c => c.included).map(c => c.title),
      tokenEstimate: estimateTokens(renderedPrompt),
      providerRequestSent: false
    }
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
        : await runMockProvider(invokeParams, candidates, renderedText)
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

  createProposal(params: CreateAiProposalParams): AiProposal {
    const preview = this.preview(params.runParams)
    const run = aiRepository.createRun({
      ...params.runParams,
      providerId: preview.providerId,
      model: preview.model,
      temperature: preview.temperature
    })
    const proposedText = params.proposedText || preview.renderedPrompt
    const completed = aiRepository.completeRun(run.id, proposedText)

    return aiRepository.createProposal({
      workspaceId: params.workspaceId,
      runId: completed.id,
      targetDocumentId: params.targetDocumentId,
      proposalType: params.proposalType,
      sourceText: params.sourceText,
      proposedText
    })
  },

  async createProposalFromInvocation(params: CreateAiProposalFromInvocationParams): Promise<AiProposal> {
    const result = await this.invoke({
      ...params.runParams,
      workspaceId: params.workspaceId
    })
    if (result.run.status !== 'completed') {
      throw new Error(result.run.error ?? 'AI run failed before creating a proposal.')
    }

    const proposedText = params.outputFormat === 'documents-proposal-json'
      ? parseDocumentsAiStructuredProposalOutput(result.run.outputText)
      : result.run.outputText.trim()
    if (!proposedText) {
      throw new Error('AI run completed with no proposal text.')
    }

    return aiRepository.createProposal({
      workspaceId: params.workspaceId,
      runId: result.run.id,
      targetDocumentId: params.targetDocumentId,
      proposalType: params.proposalType,
      sourceText: params.sourceText,
      proposedText
    })
  },

  listProposals(params: ListAiProposalsParams): AiProposal[] {
    aiRepository.ensureDefaults(params.workspaceId)
    return aiRepository.listProposals(params)
  },

  acceptProposal(params: ResolveAiProposalParams): AiProposal {
    aiRepository.ensureDefaults(params.workspaceId)
    return aiRepository.acceptProposal(params)
  },

  rejectProposal(params: ResolveAiProposalParams): AiProposal {
    aiRepository.ensureDefaults(params.workspaceId)
    return aiRepository.rejectProposal(params)
  },

  listProviders(params: ListAiProvidersParams): AiProvider[] {
    return aiRepository.listProviders(params.workspaceId)
  },

  listRuns(params: ListAiRunsParams) {
    aiRepository.ensureDefaults(params.workspaceId)
    return aiRepository.listRuns(params)
  },

  listConversations(workspaceId: string): AiConversation[] {
    aiRepository.ensureDefaults(workspaceId)
    return aiRepository.listConversations(workspaceId)
  },

  listArchivedConversations(workspaceId: string): AiConversation[] {
    aiRepository.ensureDefaults(workspaceId)
    return aiRepository.listArchivedConversations(workspaceId)
  },

  createConversation(params: CreateAiConversationParams): AiConversation {
    aiRepository.ensureDefaults(params.workspaceId)
    return aiRepository.createConversation(params)
  },

  renameConversation(params: RenameAiConversationParams): AiConversation {
    aiRepository.ensureDefaults(params.workspaceId)
    return aiRepository.renameConversation(params)
  },

  archiveConversation(params: AiConversationLifecycleParams): AiConversation {
    aiRepository.ensureDefaults(params.workspaceId)
    return aiRepository.archiveConversation(params)
  },

  restoreConversation(params: AiConversationLifecycleParams): AiConversation {
    aiRepository.ensureDefaults(params.workspaceId)
    return aiRepository.restoreConversation(params)
  },

  deleteConversation(params: AiConversationLifecycleParams): { id: string } {
    aiRepository.ensureDefaults(params.workspaceId)
    return aiRepository.deleteConversation(params)
  },

  appendMessage(params: AppendAiMessageParams): AiChatMessage {
    aiRepository.ensureDefaults(params.workspaceId)
    return aiRepository.appendMessage(params)
  },

  listTemplates(workspaceId: string): AiPromptTemplate[] {
    return aiRepository.listTemplates(workspaceId)
  },

  listArchivedTemplates(workspaceId: string): AiPromptTemplate[] {
    return aiRepository.listArchivedTemplates(workspaceId)
  },

  saveTemplate(template: AiPromptTemplate): AiPromptTemplate {
    return aiRepository.saveTemplate(template)
  },

  renameTemplate(params: RenameAiPromptTemplateParams): AiPromptTemplate {
    return aiRepository.renameTemplate(params)
  },

  duplicateTemplate(params: AiPromptTemplateLifecycleParams): AiPromptTemplate {
    return aiRepository.duplicateTemplate(params)
  },

  archiveTemplate(params: AiPromptTemplateLifecycleParams): AiPromptTemplate {
    return aiRepository.archiveTemplate(params)
  },

  restoreTemplate(params: AiPromptTemplateLifecycleParams): AiPromptTemplate {
    return aiRepository.restoreTemplate(params)
  },

  deleteTemplate(params: AiPromptTemplateLifecycleParams): { id: string } {
    return aiRepository.deleteTemplate(params)
  }
}
