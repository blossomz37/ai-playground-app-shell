import type { AiContextCandidate, AiProvider, InvokeAiParams } from '@shared/ai'
import { secretsService } from '../core/secrets'

interface OpenAiOutputContent {
  type?: string
  text?: string
}

interface OpenAiOutputItem {
  type?: string
  content?: OpenAiOutputContent[]
}

interface OpenAiResponseBody {
  output_text?: string
  output?: OpenAiOutputItem[]
  error?: {
    message?: string
  }
}

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

function buildInput(params: InvokeAiParams, candidates: AiContextCandidate[], renderedContext: string): string {
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

function extractOutputText(body: OpenAiResponseBody): string {
  if (typeof body.output_text === 'string' && body.output_text.trim()) {
    return body.output_text
  }

  const text = body.output
    ?.flatMap(item => item.content ?? [])
    .filter(content => content.type === 'output_text' && typeof content.text === 'string')
    .map(content => content.text)
    .join('\n')
    .trim()

  return text || ''
}

async function parseResponse(response: Response): Promise<OpenAiResponseBody> {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text) as OpenAiResponseBody
  } catch {
    return { error: { message: text } }
  }
}

export async function runOpenAiProvider(args: {
  params: InvokeAiParams
  provider: AiProvider
  candidates: AiContextCandidate[]
  renderedContext: string
}): Promise<string> {
  const secretName = args.provider.secretName ?? 'OPENAI_API_KEY'
  const apiKey = secretsService.get(secretName)
  if (!apiKey) {
    throw new Error(`Missing ${secretName}. Add it in Settings > Secrets, or switch the provider back to Mock Local.`)
  }

  const response = await fetch(args.provider.baseUrl ?? 'https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: args.params.model ?? args.provider.defaultModel,
      input: buildInput(args.params, args.candidates, args.renderedContext),
      temperature: args.params.temperature ?? 0.7,
      store: false
    })
  })

  const body = await parseResponse(response)
  if (!response.ok) {
    throw new Error(body.error?.message ?? `OpenAI request failed with HTTP ${response.status}`)
  }

  const outputText = extractOutputText(body)
  if (!outputText) {
    throw new Error('OpenAI returned no text output.')
  }

  return outputText
}
