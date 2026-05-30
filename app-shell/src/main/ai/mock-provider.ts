import type { AiContextCandidate, InvokeAiParams } from '@shared/ai'

function summarizeContext(candidates: AiContextCandidate[]): string {
  const included = candidates.filter(c => c.included)
  if (included.length === 0) return 'No workspace context was included.'

  return included
    .slice(0, 3)
    .map(c => `${c.title} (${c.kind}): ${c.excerpt}`)
    .join('\n')
}

export async function runMockProvider(
  params: InvokeAiParams,
  candidates: AiContextCandidate[]
): Promise<string> {
  const variables = Object.entries(params.variables ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')

  const contextSummary = summarizeContext(candidates)
  const promptPreview = params.prompt.trim().slice(0, 500)

  return [
    `Mock ${params.originType} run complete.`,
    '',
    'Prompt:',
    promptPreview || '(empty prompt)',
    '',
    'Included context:',
    contextSummary,
    variables ? `\nVariables:\n${variables}` : '',
    '',
    'This response came from the shared AI orchestration layer, so Chat, Prompt Studio, and Workflow Runner can exercise the same run/context pipeline before live model wiring is added.'
  ].filter(Boolean).join('\n')
}
