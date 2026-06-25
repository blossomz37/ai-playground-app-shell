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

export type AiChatMessageRole = 'user' | 'assistant'

export interface AiChatMessage {
  id: string
  workspaceId: string
  conversationId: string
  role: AiChatMessageRole
  content: string
  runId: string | null
  createdAt: string
}

export interface AiConversation {
  id: string
  workspaceId: string
  title: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  messages: AiChatMessage[]
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

export interface AiWritingVariables {
  selectedText?: string
  userInput?: string
  before?: string
  after?: string
  activeDocumentTitle?: string
  documentKind?: string
  workspaceName?: string
}

export interface InvokeAiParams {
  workspaceId: string
  moduleId: string
  originType: AiOriginType
  originId?: string
  prompt: string
  variables?: Record<string, string>
  writingVariables?: AiWritingVariables
  contextCandidates?: AiContextCandidate[]
  providerId?: AiProviderId
  model?: string
  temperature?: number
}

export interface AiInvokeResult {
  run: AiRun
  contextPack: AiContextPack
}

export interface AiPreview {
  providerId: AiProviderId
  model: string
  temperature: number
  renderedPrompt: string
  includedTitles: string[]
  tokenEstimate: number
  providerRequestSent: false
}

export interface CreateAiConversationParams {
  workspaceId: string
  title?: string
}

export interface RenameAiConversationParams {
  workspaceId: string
  id: string
  title: string
}

export interface AiConversationLifecycleParams {
  workspaceId: string
  id: string
}

export interface AppendAiMessageParams {
  workspaceId: string
  conversationId: string
  role: AiChatMessageRole
  content: string
  runId?: string | null
}

export interface RenameAiPromptTemplateParams {
  workspaceId: string
  id: string
  name: string
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
