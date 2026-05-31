import { ObservableSlice } from './observable'

export interface WebBookmark {
  id: string
  title: string
  url: string
  icon: string
}

export interface WebHistoryItem {
  id: string
  title: string
  url: string
}

export interface WebState {
  bookmarks: WebBookmark[]
  selectedBookmarkId: string
  currentUrl: string
  currentTitle: string
  loading: boolean
  history: WebHistoryItem[]
  canGoBack: boolean
  canGoForward: boolean
  currentBookmarked: boolean
}

const initialBookmarks: WebBookmark[] = [
  { id: '1', title: 'Wikipedia', url: 'https://wikipedia.org', icon: '🌐' },
  { id: '2', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: '📖' },
  { id: '3', title: 'Research Paper', url: 'https://arxiv.org', icon: '📄' }
]

const initialHistory: WebHistoryItem[] = [
  { id: 'history-1', title: 'Wikipedia', url: 'https://wikipedia.org' }
]

export interface WebPersistenceSnapshot {
  bookmarks: WebBookmark[]
  selectedBookmarkId: string
  currentUrl: string
  currentTitle: string
  historyStack: WebHistoryItem[]
  historyIndex: number
}

export class WebStateSlice extends ObservableSlice<WebState> {
  private bookmarks = initialBookmarks
  private selectedBookmarkId = '1'
  private currentUrl = 'https://wikipedia.org'
  private currentTitle = 'Wikipedia'
  private loading = false
  private historyStack = initialHistory
  private historyIndex = 0
  private loadingTimer: ReturnType<typeof setTimeout> | null = null

  getSnapshot(): WebState {
    return {
      bookmarks: this.bookmarks,
      selectedBookmarkId: this.selectedBookmarkId,
      currentUrl: this.currentUrl,
      currentTitle: this.currentTitle,
      loading: this.loading,
      history: [...this.historyStack].reverse(),
      canGoBack: this.historyIndex > 0,
      canGoForward: this.historyIndex < this.historyStack.length - 1,
      currentBookmarked: this.bookmarks.some(bookmark => this.sameUrl(bookmark.url, this.currentUrl))
    }
  }

  setCurrentUrl(value: string): void {
    this.currentUrl = value
    this.emit()
  }

  syncLoadedPage(url: string, title?: string): void {
    this.currentUrl = this.normalizeUrl(url)
    this.currentTitle = title?.trim() || this.titleFromUrl(this.currentUrl)

    const bookmark = this.bookmarks.find(entry => this.sameUrl(entry.url, this.currentUrl))
    this.selectedBookmarkId = bookmark?.id ?? ''
    this.emit()
  }

  openBookmark(id: string): void {
    const bookmark = this.bookmarks.find(item => item.id === id)
    if (!bookmark) return
    this.selectedBookmarkId = id
    this.navigateTo(bookmark.url, bookmark.title)
  }

  navigateTo(input: string, explicitTitle?: string): void {
    const url = this.normalizeUrl(input)
    const title = explicitTitle ?? this.titleFromUrl(url)
    this.applyPage({ id: `history-${Date.now()}`, title, url }, true)
  }

  reloadPage(): void {
    this.setLoading(true)
  }

  goBack(): void {
    if (this.historyIndex <= 0) return
    this.historyIndex -= 1
    this.applyPage(this.historyStack[this.historyIndex], false)
  }

  goForward(): void {
    if (this.historyIndex >= this.historyStack.length - 1) return
    this.historyIndex += 1
    this.applyPage(this.historyStack[this.historyIndex], false)
  }

  toggleCurrentBookmark(): 'added' | 'removed' {
    const url = this.normalizeUrl(this.currentUrl)
    const existing = this.bookmarks.find(bookmark => this.sameUrl(bookmark.url, url))
    if (existing) {
      this.bookmarks = this.bookmarks.filter(bookmark => bookmark.id !== existing.id)
      this.selectedBookmarkId = ''
      this.emit()
      return 'removed'
    }

    const bookmark: WebBookmark = {
      id: `bookmark-${Date.now()}`,
      title: this.currentTitle || this.titleFromUrl(url),
      url,
      icon: '🌐'
    }
    this.bookmarks = [bookmark, ...this.bookmarks]
    this.selectedBookmarkId = bookmark.id
    this.emit()
    return 'added'
  }

  private applyPage(item: WebHistoryItem, pushHistory: boolean): void {
    this.currentUrl = item.url
    this.currentTitle = item.title

    const bookmark = this.bookmarks.find(entry => this.sameUrl(entry.url, item.url))
    this.selectedBookmarkId = bookmark?.id ?? ''

    if (pushHistory) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1)
      this.historyStack.push(item)
      this.historyIndex = this.historyStack.length - 1
    }

    this.setLoading(true)
  }

  hydrate(snapshot: WebPersistenceSnapshot | undefined): void {
    if (!snapshot) {
      this.emit()
      return
    }

    this.bookmarks = snapshot.bookmarks.length > 0 ? snapshot.bookmarks : initialBookmarks
    this.selectedBookmarkId = snapshot.selectedBookmarkId
    this.currentUrl = snapshot.currentUrl || 'https://wikipedia.org'
    this.currentTitle = snapshot.currentTitle || this.titleFromUrl(this.currentUrl)
    this.historyStack = snapshot.historyStack.length > 0 ? snapshot.historyStack : initialHistory
    this.historyIndex = Math.max(0, Math.min(snapshot.historyIndex, this.historyStack.length - 1))
    this.loading = false
    this.emit()
  }

  persistenceSnapshot(): WebPersistenceSnapshot {
    return {
      bookmarks: this.bookmarks,
      selectedBookmarkId: this.selectedBookmarkId,
      currentUrl: this.currentUrl,
      currentTitle: this.currentTitle,
      historyStack: this.historyStack,
      historyIndex: this.historyIndex
    }
  }

  private setLoading(value: boolean): void {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer)
      this.loadingTimer = null
    }

    this.loading = value
    this.emit()

    if (value) {
      this.loadingTimer = setTimeout(() => {
        this.loading = false
        this.loadingTimer = null
        this.emit()
      }, 500)
    }
  }

  private normalizeUrl(input: string): string {
    const trimmed = input.trim()
    if (!trimmed) return 'https://example.com'
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  private canonicalUrl(input: string): string {
    try {
      const url = new URL(this.normalizeUrl(input))
      url.hostname = url.hostname.replace(/^www\./, '')
      url.hash = ''
      const rendered = url.toString()
      return rendered.endsWith('/') ? rendered.slice(0, -1) : rendered
    } catch {
      return this.normalizeUrl(input).replace(/\/$/, '')
    }
  }

  private sameUrl(left: string, right: string): boolean {
    return this.canonicalUrl(left) === this.canonicalUrl(right)
  }

  private titleFromUrl(url: string): string {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '')
      return host.split('.')[0]?.replace(/^\w/, char => char.toUpperCase()) || url
    } catch {
      return url
    }
  }
}
