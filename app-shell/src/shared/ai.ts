export type AiProviderId = 'mock-local' | 'openai-responses' | string

export type AiOriginType = 'chat' | 'template' | 'chain' | 'workflow'
export type AiRunStatus = 'pending' | 'running' | 'completed' | 'failed'
export type AiContextSourceType =
  | 'active-document'
  | 'selected-document'
  | 'document-descendant'
  | 'manual-note'
  | 'prompt-variable'

export type AiProposalType = 'append-note' | 'replacement' | 'outline' | 'metadata' | 'new-document'
export type AiProposalStatus = 'pending' | 'accepted' | 'rejected'

export interface AiProvider {
  providerId: AiProviderId
  providerName: string
  secretName?: string | null
  baseUrl?: string | null
  defaultModel: string
  availableModels: string[]
  supportsStreaming: boolean
  supportsTools: boolean
}

export interface AiContextCandidate {
  id: string
  sourceType: AiContextSourceType
  sourceId: string
  title: string
  kind: string
  excerpt: string
  content: string
  estimatedTokens: number
  included: boolean
  priority: number
  reason: string
}

export interface AiContextPack {
  id: string
  workspaceId: string
  runId: string
  createdAt: string
  candidates: AiContextCandidate[]
  renderedText: string
  tokenEstimate: number
  packingStrategy: string
}

export interface AiPromptTemplate {
  id: string
  workspaceId: string
  name: string
  description: string
  body: string
  variables: string[]
  defaultModel: string
  defaultTemperature: number
  contextPolicy: Record<string, unknown>
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface AiRun {
  id: string
  workspaceId: string
  moduleId: string
  originType: AiOriginType
  originId: string
  providerId: AiProviderId
  model: string
  temperature: number
  status: AiRunStatus
  inputSummary: string
  outputText: string
  error: string | null
  createdAt: string
  completedAt: string | null
}

export interface AiPromptChainStep {
  id: string
  name: string
  templateId: string
  inputMap: Record<string, string>
  contextPolicy: Record<string, unknown>
  outputKey: string
  onError: 'stop' | 'continue'
}

export interface AiPromptChain {
  id: string
  workspaceId: string
  name: string
  description: string
  steps: AiPromptChainStep[]
  createdAt: string
  updatedAt: string
}

export interface AiProposal {
  id: string
  workspaceId: string
  runId: string
  targetDocumentId: string
  proposalType: AiProposalType
  sourceText: string
  proposedText: string
  status: AiProposalStatus
  createdAt: string
  resolvedAt: string | null
}

export interface CollectAiContextParams {
  workspaceId: string
  activeDocumentId?: string | null
  selectedDocumentIds?: string[]
  includeDescendants?: boolean
  manualNote?: string
}

export interface InvokeAiParams {
  workspaceId: string
  moduleId: string
  originType: AiOriginType
  originId?: string
  prompt: string
  variables?: Record<string, string>
  contextCandidates?: AiContextCandidate[]
  providerId?: AiProviderId
  model?: string
  temperature?: number
}

export interface AiInvokeResult {
  run: AiRun
  contextPack: AiContextPack
}

export interface ListAiProvidersParams {
  workspaceId: string
}

export interface ListAiRunsParams {
  workspaceId: string
  moduleId?: string
  originType?: AiOriginType
  limit?: number
}
