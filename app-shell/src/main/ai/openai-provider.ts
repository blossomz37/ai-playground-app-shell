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

interface OpenAiStreamEvent {
  type?: string
  delta?: string
  text?: string
  error?: {
    message?: string
  }
  response?: OpenAiResponseBody
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

function parseSseBlock(block: string): OpenAiStreamEvent | null {
  const data = block
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trimStart())
    .join('\n')
    .trim()

  if (!data || data === '[DONE]') return null

  try {
    return JSON.parse(data) as OpenAiStreamEvent
  } catch {
    return { type: 'error', error: { message: data } }
  }
}

async function readStreamingResponse(response: Response): Promise<string> {
  if (!response.body) throw new Error('OpenAI streaming response had no body.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let outputText = ''
  let finalText = ''

  function consume(block: string): void {
    const event = parseSseBlock(block)
    if (!event) return

    if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
      outputText += event.delta
      return
    }

    if (event.type === 'response.output_text.done' && typeof event.text === 'string') {
      finalText = event.text
      return
    }

    if (event.type === 'response.completed' && event.response) {
      const completedText = extractOutputText(event.response)
      if (completedText) finalText = completedText
      return
    }

    if (event.type === 'response.failed' || event.type === 'error') {
      throw new Error(event.error?.message ?? 'OpenAI streaming response failed.')
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })

    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() ?? ''
    for (const block of blocks) consume(block)

    if (done) break
  }

  if (buffer.trim()) consume(buffer)

  return (finalText || outputText).trim()
}

export async function runOpenAiProvider(args: {
  params: InvokeAiParams
  provider: AiProvider
  candidates: AiContextCandidate[]
  renderedContext: string
  signal?: AbortSignal
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
      store: false,
      stream: args.params.stream === true
    }),
    signal: args.signal
  })

  if (!response.ok) {
    const body = await parseResponse(response)
    throw new Error(body.error?.message ?? `OpenAI request failed with HTTP ${response.status}`)
  }

  if (args.params.stream === true) {
    const streamedText = await readStreamingResponse(response)
    if (!streamedText) throw new Error('OpenAI returned no text output.')
    return streamedText
  }

  const body = await parseResponse(response)
  const outputText = extractOutputText(body)
  if (!outputText) {
    throw new Error('OpenAI returned no text output.')
  }

  return outputText
}
