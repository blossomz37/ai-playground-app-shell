import { derived, get, writable } from 'svelte/store'
import { addToast } from '../../store/toasts'

export interface WebBookmark {
  id: string
  title: string
  url: string
  icon: string
}

interface WebHistoryItem {
  id: string
  title: string
  url: string
}

export const webBookmarks = writable<WebBookmark[]>([
  { id: '1', title: 'Wikipedia', url: 'https://wikipedia.org', icon: '🌐' },
  { id: '2', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: '📖' },
  { id: '3', title: 'Research Paper', url: 'https://arxiv.org', icon: '📄' }
])

export const selectedBookmarkId = writable('1')
export const currentUrl = writable('https://wikipedia.org')
export const currentTitle = writable('Wikipedia')
export const webLoading = writable(false)
export const webHistory = writable<WebHistoryItem[]>([
  { id: 'history-1', title: 'Wikipedia', url: 'https://wikipedia.org' }
])

const historyStack: WebHistoryItem[] = [{ id: 'history-1', title: 'Wikipedia', url: 'https://wikipedia.org' }]
const historyIndex = writable(0)

export const canGoBack = derived(historyIndex, $index => $index > 0)
export const canGoForward = derived(historyIndex, $index => $index < historyStack.length - 1)
export const currentBookmarked = derived(
  [webBookmarks, currentUrl],
  ([$bookmarks, $url]) => $bookmarks.some(bookmark => bookmark.url === normalizeUrl($url))
)

export function openBookmark(id: string): void {
  const bookmark = get(webBookmarks).find(item => item.id === id)
  if (!bookmark) return
  selectedBookmarkId.set(id)
  navigateTo(bookmark.url, bookmark.title)
}

export function navigateTo(input: string, explicitTitle?: string): void {
  const url = normalizeUrl(input)
  const title = explicitTitle ?? titleFromUrl(url)
  applyPage({ id: `history-${Date.now()}`, title, url }, true)
}

export function reloadPage(): void {
  webLoading.set(true)
  setTimeout(() => webLoading.set(false), 500)
}

export function goBack(): void {
  const index = get(historyIndex)
  if (index <= 0) return
  historyIndex.set(index - 1)
  applyPage(historyStack[index - 1], false)
}

export function goForward(): void {
  const index = get(historyIndex)
  if (index >= historyStack.length - 1) return
  historyIndex.set(index + 1)
  applyPage(historyStack[index + 1], false)
}

export function toggleCurrentBookmark(): void {
  const url = normalizeUrl(get(currentUrl))
  const existing = get(webBookmarks).find(bookmark => bookmark.url === url)
  if (existing) {
    webBookmarks.update(bookmarks => bookmarks.filter(bookmark => bookmark.id !== existing.id))
    selectedBookmarkId.set('')
    addToast('info', 'Bookmark removed')
    return
  }

  const bookmark: WebBookmark = {
    id: `bookmark-${Date.now()}`,
    title: get(currentTitle) || titleFromUrl(url),
    url,
    icon: '🌐'
  }
  webBookmarks.update(bookmarks => [bookmark, ...bookmarks])
  selectedBookmarkId.set(bookmark.id)
  addToast('info', 'Bookmark added')
}

function applyPage(item: WebHistoryItem, pushHistory: boolean): void {
  currentUrl.set(item.url)
  currentTitle.set(item.title)
  webLoading.set(true)

  const bookmark = get(webBookmarks).find(entry => entry.url === item.url)
  selectedBookmarkId.set(bookmark?.id ?? '')

  if (pushHistory) {
    const index = get(historyIndex)
    historyStack.splice(index + 1)
    historyStack.push(item)
    historyIndex.set(historyStack.length - 1)
    webHistory.set([...historyStack].reverse())
  }

  setTimeout(() => webLoading.set(false), 500)
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return 'https://example.com'
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function titleFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host.split('.')[0]?.replace(/^\w/, char => char.toUpperCase()) || url
  } catch {
    return url
  }
}
