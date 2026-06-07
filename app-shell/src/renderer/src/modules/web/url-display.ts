export type UrlSecurityTone = 'secure' | 'plain' | 'local' | 'pending'

export interface WebUrlMetadata {
  domain: string
  displayUrl: string
  protocolLabel: string
  securityLabel: string
  securityDescription: string
  tone: UrlSecurityTone
}

export function getWebUrlMetadata(input: string): WebUrlMetadata {
  const trimmed = input.trim()
  if (!trimmed) return pendingMetadata()

  try {
    const url = new URL(trimmed)
    const domain = url.hostname.replace(/^www\./, '') || url.protocol.replace(':', '')
    const path = url.pathname && url.pathname !== '/' ? url.pathname : ''
    const displayUrl = `${domain}${path}${url.search}`

    if (url.protocol === 'https:') {
      return {
        domain,
        displayUrl,
        protocolLabel: 'HTTPS',
        securityLabel: 'Secure',
        securityDescription: 'Secure HTTPS connection',
        tone: 'secure'
      }
    }

    if (url.protocol === 'http:') {
      return {
        domain,
        displayUrl,
        protocolLabel: 'HTTP',
        securityLabel: 'Not secure',
        securityDescription: 'Plain HTTP connection',
        tone: 'plain'
      }
    }

    return {
      domain,
      displayUrl,
      protocolLabel: url.protocol.replace(':', '').toUpperCase() || 'URL',
      securityLabel: 'Local',
      securityDescription: 'Local or app-managed address',
      tone: 'local'
    }
  } catch {
    return pendingMetadata(trimmed)
  }
}

export function formatUrlSecondary(input: string): string {
  return getWebUrlMetadata(input).displayUrl
}

export function formatDomain(input: string): string {
  return getWebUrlMetadata(input).domain
}

export function formatVisitedAt(input: string): string {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

function pendingMetadata(label = 'Enter a URL'): WebUrlMetadata {
  return {
    domain: label,
    displayUrl: label,
    protocolLabel: 'URL',
    securityLabel: 'Pending',
    securityDescription: 'Navigation has not loaded yet',
    tone: 'pending'
  }
}
