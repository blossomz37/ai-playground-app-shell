import type { AiContextCandidate, AiProvider, InvokeAiParams } from '@shared/ai'
import { secretsService } from '../core/secrets'
import { AI_API_KEY_REQUIRED_MESSAGE } from '@shared/demo-mode'
import { buildAiInput } from './prompt-builder'

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
    throw new Error(AI_API_KEY_REQUIRED_MESSAGE)
  }

  const response = await fetch(args.provider.baseUrl ?? 'https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: args.params.model ?? args.provider.defaultModel,
      input: buildAiInput(args.params, args.candidates, args.renderedContext),
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
