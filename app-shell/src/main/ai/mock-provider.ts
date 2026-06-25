import type { AiContextCandidate, InvokeAiParams } from '@shared/ai'
import { buildAiInput } from './prompt-builder'

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
  candidates: AiContextCandidate[],
  renderedContext = ''
): Promise<string> {
  const contextSummary = summarizeContext(candidates)
  const renderedPrompt = buildAiInput(params, candidates, renderedContext)

  return [
    `Mock ${params.originType} run complete.`,
    '',
    'Rendered prompt:',
    renderedPrompt.trim().slice(0, 1200) || '(empty prompt)',
    '',
    'Included context:',
    contextSummary,
    '',
    'This response came from the shared AI orchestration layer, so Chat, Prompt Studio, and Workflow Runner can exercise the same run/context pipeline before live model wiring is added.'
  ].filter(Boolean).join('\n')
}
