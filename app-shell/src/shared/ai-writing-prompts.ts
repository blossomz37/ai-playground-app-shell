import type { AiPromptTemplate } from './ai'

export type DocumentsAiPromptAction =
  | 'rewrite-selection'
  | 'continue-from-cursor'
  | 'summarize-active-document'

interface DocumentsAiPromptDefinition {
  action: DocumentsAiPromptAction
  name: string
  description: string
  body: string
}

export const DOCUMENTS_AI_PROMPT_DEFINITIONS: DocumentsAiPromptDefinition[] = [
  {
    action: 'rewrite-selection',
    name: 'Documents: Rewrite Selection',
    description: 'Rewrite selected text while preserving the document voice.',
    body: [
      'Rewrite the selected passage while preserving the document voice.',
      '',
      'Instruction: {{user_input}}',
      '',
      'Selected text:',
      '{{selected_text}}',
      '',
      'Before the selection:',
      '{{before}}',
      '',
      'After the selection:',
      '{{after}}',
      '',
      'Selected context documents:',
      '{{selected_documents}}'
    ].join('\n')
  },
  {
    action: 'continue-from-cursor',
    name: 'Documents: Continue From Cursor',
    description: 'Continue the active document from the cursor.',
    body: [
      'Continue the active document from the cursor in the same voice and continuity.',
      '',
      'Instruction: {{user_input}}',
      '',
      'Text before the cursor:',
      '{{before}}',
      '',
      'Text after the cursor:',
      '{{after}}',
      '',
      'Selected context documents:',
      '{{selected_documents}}'
    ].join('\n')
  },
  {
    action: 'summarize-active-document',
    name: 'Documents: Summarize Active Document',
    description: 'Summarize the active document for a working writer.',
    body: [
      'Summarize the active document for a working writer.',
      '',
      'Title: {{active_document_title}}',
      'Kind: {{document_kind}}',
      'Workspace: {{workspace_name}}',
      '',
      'Document and selected context:',
      '{{selected_documents}}'
    ].join('\n')
  }
]

export function documentsAiPromptTemplateId(
  workspaceId: string,
  action: DocumentsAiPromptAction
): string {
  return `builtin.documents.${action}.${workspaceId}`
}

export function documentsAiPromptDefinition(
  action: DocumentsAiPromptAction
): DocumentsAiPromptDefinition {
  const definition = DOCUMENTS_AI_PROMPT_DEFINITIONS.find(item => item.action === action)
  if (!definition) throw new Error(`Unknown Documents AI prompt action: ${action}`)
  return definition
}

export function createDocumentsAiPromptTemplate(params: {
  workspaceId: string
  action: DocumentsAiPromptAction
  now: string
  defaultModel: string
}): AiPromptTemplate {
  const definition = documentsAiPromptDefinition(params.action)
  return {
    id: documentsAiPromptTemplateId(params.workspaceId, params.action),
    workspaceId: params.workspaceId,
    name: definition.name,
    description: definition.description,
    body: definition.body,
    variables: Array.from(definition.body.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)).map(match => match[1]),
    defaultModel: params.defaultModel,
    defaultTemperature: 0.7,
    contextPolicy: {
      includeSelectedContext: true,
      documentsAction: params.action
    },
    tags: ['built-in', 'documents', 'writing'],
    isProtected: true,
    createdAt: params.now,
    updatedAt: params.now,
    archivedAt: null
  }
}
