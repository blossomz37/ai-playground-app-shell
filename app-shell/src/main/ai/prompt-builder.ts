import type { AiContextCandidate, InvokeAiParams } from '@shared/ai'

// Single source of truth for the exact text packet sent to a provider.
// Both the live provider call and the provider-free preview path use this,
// so a preview always matches what would actually be sent.

function applyVariables(prompt: string, variables: Record<string, string> | undefined): string {
  let rendered = prompt
  for (const [key, value] of Object.entries(variables ?? {})) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    rendered = rendered.replace(new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g'), value)
  }
  return rendered
}

function renderVariables(variables: Record<string, string> | undefined): string {
  const entries = Object.entries(variables ?? {}).filter(([, value]) => value.trim())
  if (entries.length === 0) return ''

  return entries.map(([key, value]) => `${key}:\n${value}`).join('\n\n')
}

export function buildAiInput(
  params: InvokeAiParams,
  candidates: AiContextCandidate[],
  renderedContext: string
): string {
  const context = renderedContext.trim()
  const variables = renderVariables(params.variables)
  const prompt = applyVariables(params.prompt.trim(), params.variables)
  const includedTitles = candidates
    .filter(candidate => candidate.included)
    .map(candidate => `- ${candidate.title} (${candidate.kind})`)
    .join('\n')

  return [
    'Use the provided workspace context when it is relevant. If the context is incomplete, say what is missing.',
    context ? `Workspace context:\n${context}` : 'Workspace context:\nNo workspace context was included.',
    includedTitles ? `Included context items:\n${includedTitles}` : '',
    variables ? `Prompt variables:\n${variables}` : '',
    `User prompt:\n${prompt}`
  ].filter(Boolean).join('\n\n---\n\n')
}
