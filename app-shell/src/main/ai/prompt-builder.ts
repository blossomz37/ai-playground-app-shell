import type { AiContextCandidate, InvokeAiParams } from '@shared/ai'

// Single source of truth for the exact text packet sent to a provider.
// Both the live provider call and the provider-free preview path use this,
// so a preview always matches what would actually be sent.

const WRITING_VARIABLE_FALLBACKS: Record<string, string> = {
  selected_text: '[No selected text.]',
  user_input: '[No user input.]',
  before: '[No text before the cursor.]',
  after: '[No text after the cursor.]',
  selected_documents: '[No selected context documents.]',
  active_document_title: '[No active document title.]',
  document_kind: '[No document kind.]',
  workspace_name: '[No workspace name.]'
}

function includedCandidates(candidates: AiContextCandidate[]): AiContextCandidate[] {
  return candidates.filter(candidate => candidate.included)
}

function renderSelectedDocuments(candidates: AiContextCandidate[]): string {
  const included = includedCandidates(candidates)
  if (included.length === 0) return ''

  return included
    .map(candidate => [
      `## ${candidate.title} (${candidate.kind})`,
      `Source: ${candidate.reason}`,
      candidate.content.trim() || '[No document text.]'
    ].join('\n'))
    .join('\n\n---\n\n')
}

function writingVariableValues(params: InvokeAiParams, candidates: AiContextCandidate[]): Record<string, string> {
  const variables = params.writingVariables ?? {}
  return {
    selected_text: variables.selectedText ?? '',
    user_input: variables.userInput ?? '',
    before: variables.before ?? '',
    after: variables.after ?? '',
    selected_documents: renderSelectedDocuments(candidates),
    active_document_title: variables.activeDocumentTitle ?? '',
    document_kind: variables.documentKind ?? '',
    workspace_name: variables.workspaceName ?? ''
  }
}

function referencesVariable(prompt: string, key: string): boolean {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`{{\\s*${escapedKey}\\s*}}`).test(prompt)
}

function mergedVariables(params: InvokeAiParams, candidates: AiContextCandidate[]): Record<string, string> {
  const prompt = params.prompt
  const writingVariables = writingVariableValues(params, candidates)
  const referencedWritingVariables = Object.fromEntries(
    Object.entries(writingVariables).filter(([key, value]) => value.trim() || referencesVariable(prompt, key))
  )
  return {
    ...params.variables,
    ...referencedWritingVariables
  }
}

function valueForPrompt(key: string, value: string): string {
  const trimmed = value.trim()
  return trimmed || WRITING_VARIABLE_FALLBACKS[key] || ''
}

function applyVariables(prompt: string, variables: Record<string, string>): string {
  let rendered = prompt
  for (const [key, value] of Object.entries(variables)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    rendered = rendered.replace(new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g'), valueForPrompt(key, value))
  }
  return rendered
}

function renderVariables(variables: Record<string, string>): string {
  const entries = Object.entries(variables).filter(([key, value]) => value.trim() || key in WRITING_VARIABLE_FALLBACKS)
  if (entries.length === 0) return ''

  return entries.map(([key, value]) => `${key}:\n${valueForPrompt(key, value)}`).join('\n\n')
}

export function buildAiInput(
  params: InvokeAiParams,
  candidates: AiContextCandidate[],
  renderedContext: string
): string {
  const context = renderedContext.trim()
  const variables = mergedVariables(params, candidates)
  const renderedVariables = renderVariables(variables)
  const prompt = applyVariables(params.prompt.trim(), variables)
  const includedTitles = includedCandidates(candidates)
    .map(candidate => `- ${candidate.title} (${candidate.kind})`)
    .join('\n')

  return [
    'Use the provided workspace context when it is relevant. If the context is incomplete, say what is missing.',
    context ? `Workspace context:\n${context}` : 'Workspace context:\nNo workspace context was included.',
    includedTitles ? `Included context items:\n${includedTitles}` : '',
    renderedVariables ? `Prompt variables:\n${renderedVariables}` : '',
    `User prompt:\n${prompt}`
  ].filter(Boolean).join('\n\n---\n\n')
}
