import { ObservableSlice } from './observable'

export interface WebBookmark {
  id: string
  title: string
  url: string
  icon: string
}

export interface WebHistoryItem {
  id: string
  tabId: string
  title: string
  url: string
  visitedAt: string
}

export interface WebTab {
  id: string
  title: string
  url: string
  requestedUrl: string
  loading: boolean
  historyStack: WebHistoryItem[]
  historyIndex: number
  createdAt: string
  lastVisitedAt: string
}

export interface WebState {
  bookmarks: WebBookmark[]
  selectedBookmarkId: string
  tabs: WebTab[]
  activeTabId: string
  activeTab: WebTab
  currentUrl: string
  requestedUrl: string
  currentTitle: string
  loading: boolean
  history: WebHistoryItem[]
  tabHistory: WebHistoryItem[]
  canGoBack: boolean
  canGoForward: boolean
  currentBookmarked: boolean
}

export interface WebPersistenceSnapshot {
  version?: 2
  bookmarks?: WebBookmark[]
  selectedBookmarkId?: string
  tabs?: WebTab[]
  activeTabId?: string
  globalHistory?: WebHistoryItem[]

  // v1 migration fields from the pre-tabbed Web module.
  currentUrl?: string
  currentTitle?: string
  historyStack?: Array<Partial<WebHistoryItem> & { title: string; url: string }>
  historyIndex?: number
}

const initialBookmarks: WebBookmark[] = [
  { id: '1', title: 'Wikipedia', url: 'https://wikipedia.org', icon: '🌐' },
  { id: '2', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: '📖' },
  { id: '3', title: 'Research Paper', url: 'https://arxiv.org', icon: '📄' }
]

const defaultUrl = 'https://wikipedia.org'
const maxGlobalHistory = 200

export class WebStateSlice extends ObservableSlice<WebState> {
  private bookmarks = initialBookmarks
  private selectedBookmarkId = '1'
  private tabs: WebTab[] = [this.createTab(defaultUrl, 'Wikipedia')]
  private activeTabId = this.tabs[0]?.id ?? ''
  private globalHistory: WebHistoryItem[] = [...(this.tabs[0]?.historyStack ?? [])]

  getSnapshot(): WebState {
    const activeTab = this.getActiveTab()
    return {
      bookmarks: this.bookmarks,
      selectedBookmarkId: this.selectedBookmarkId,
      tabs: this.tabs,
      activeTabId: this.activeTabId,
      activeTab,
      currentUrl: activeTab.url,
      requestedUrl: activeTab.requestedUrl,
      currentTitle: activeTab.title,
      loading: activeTab.loading,
      history: [...this.globalHistory].reverse(),
      tabHistory: [...activeTab.historyStack].reverse(),
      canGoBack: activeTab.historyIndex > 0,
      canGoForward: activeTab.historyIndex < activeTab.historyStack.length - 1,
      currentBookmarked: this.bookmarks.some(bookmark => this.sameUrl(bookmark.url, activeTab.url))
    }
  }

  setCurrentUrl(value: string): void {
    this.updateActiveTab({ url: value })
  }

  syncLoadedPage(url: string, title?: string): void {
    const activeTab = this.getActiveTab()
    const normalizedUrl = this.normalizeUrl(url)
    const resolvedTitle = title?.trim() || activeTab.title || this.titleFromUrl(normalizedUrl)

    this.updateCurrentHistoryEntry(activeTab.id, normalizedUrl, resolvedTitle)
    this.updateActiveTab({
      url: normalizedUrl,
      title: resolvedTitle,
      loading: false,
      lastVisitedAt: this.now()
    })
  }

  setActiveTabLoading(value: boolean): void {
    this.updateActiveTab({ loading: value })
  }

  openBookmark(id: string): void {
    const bookmark = this.bookmarks.find(item => item.id === id)
    if (!bookmark) return
    this.selectedBookmarkId = id
    this.navigateTo(bookmark.url, bookmark.title)
  }

  openBookmarkInNewTab(id: string): void {
    const bookmark = this.bookmarks.find(item => item.id === id)
    if (!bookmark) return
    this.selectedBookmarkId = id
    this.newTab(bookmark.url, bookmark.title)
  }

  renameBookmark(id: string, title: string): WebBookmark | null {
    const nextTitle = title.trim()
    if (!nextTitle) return null

    let renamed: WebBookmark | null = null
    this.bookmarks = this.bookmarks.map(bookmark => {
      if (bookmark.id !== id) return bookmark
      renamed = { ...bookmark, title: nextTitle }
      return renamed
    })

    if (renamed) this.emit()
    return renamed
  }

  navigateTo(input: string, explicitTitle?: string): void {
    const url = this.normalizeUrl(input)
    const title = explicitTitle ?? this.titleFromUrl(url)
    this.navigateActiveTab(url, title)
  }

  openHistoryItem(id: string): void {
    const item = this.globalHistory.find(entry => entry.id === id)
    if (!item) return
    this.navigateTo(item.url, item.title)
  }

  clearHistory(): void {
    this.globalHistory = []
    this.tabs = this.tabs.map(tab => {
      const currentEntry = tab.historyStack[tab.historyIndex]
      const retainedEntry = currentEntry
        ? { ...currentEntry, title: tab.title, url: tab.url }
        : this.createHistoryItem(tab.id, tab.url, tab.title, tab.lastVisitedAt)
      return {
        ...tab,
        historyStack: [retainedEntry],
        historyIndex: 0
      }
    })
    this.emit()
  }

  newTab(input = defaultUrl, explicitTitle?: string): void {
    const tab = this.createTab(input, explicitTitle)
    this.tabs = [...this.tabs, tab]
    this.activeTabId = tab.id
    this.selectedBookmarkId = this.findBookmarkId(tab.url)
    this.appendGlobalHistory(tab.historyStack[tab.historyIndex])
    this.emit()
  }

  selectTab(id: string): void {
    if (!this.tabs.some(tab => tab.id === id)) return
    this.tabs = this.tabs.map(tab => tab.id === id ? { ...tab, requestedUrl: tab.url } : tab)
    this.activeTabId = id
    const activeTab = this.getActiveTab()
    this.selectedBookmarkId = this.findBookmarkId(activeTab.url)
    this.emit()
  }

  closeTab(id: string): void {
    if (this.tabs.length <= 1) {
      const replacement = this.createTab()
      this.tabs = [replacement]
      this.activeTabId = replacement.id
      this.selectedBookmarkId = this.findBookmarkId(replacement.url)
      this.appendGlobalHistory(replacement.historyStack[replacement.historyIndex])
      this.emit()
      return
    }

    const closingIndex = this.tabs.findIndex(tab => tab.id === id)
    if (closingIndex < 0) return

    const nextTabs = this.tabs.filter(tab => tab.id !== id)
    if (this.activeTabId === id) {
      const nextIndex = Math.min(closingIndex, nextTabs.length - 1)
      this.activeTabId = nextTabs[nextIndex]?.id ?? nextTabs[0]?.id ?? ''
    }

    this.tabs = nextTabs
    const activeTab = this.getActiveTab()
    this.selectedBookmarkId = this.findBookmarkId(activeTab.url)
    this.emit()
  }

  reloadPage(): void {
    this.setActiveTabLoading(true)
  }

  goBack(): void {
    const activeTab = this.getActiveTab()
    if (activeTab.historyIndex <= 0) return
    const nextIndex = activeTab.historyIndex - 1
    const entry = activeTab.historyStack[nextIndex]
    if (!entry) return
    this.applyTabState(activeTab.id, {
      historyIndex: nextIndex,
      url: entry.url,
      requestedUrl: entry.url,
      title: entry.title,
      loading: true,
      lastVisitedAt: this.now()
    })
  }

  goForward(): void {
    const activeTab = this.getActiveTab()
    if (activeTab.historyIndex >= activeTab.historyStack.length - 1) return
    const nextIndex = activeTab.historyIndex + 1
    const entry = activeTab.historyStack[nextIndex]
    if (!entry) return
    this.applyTabState(activeTab.id, {
      historyIndex: nextIndex,
      url: entry.url,
      requestedUrl: entry.url,
      title: entry.title,
      loading: true,
      lastVisitedAt: this.now()
    })
  }

  toggleCurrentBookmark(): 'added' | 'removed' {
    const activeTab = this.getActiveTab()
    const url = this.normalizeUrl(activeTab.url)
    const existing = this.bookmarks.find(bookmark => this.sameUrl(bookmark.url, url))
    if (existing) {
      this.bookmarks = this.bookmarks.filter(bookmark => bookmark.id !== existing.id)
      this.selectedBookmarkId = ''
      this.emit()
      return 'removed'
    }

    const bookmark: WebBookmark = {
      id: this.id('bookmark'),
      title: activeTab.title || this.titleFromUrl(url),
      url,
      icon: '🌐'
    }
    this.bookmarks = [bookmark, ...this.bookmarks]
    this.selectedBookmarkId = bookmark.id
    this.emit()
    return 'added'
  }

  hydrate(snapshot: WebPersistenceSnapshot | undefined): void {
    if (!snapshot) {
      this.emit()
      return
    }

    this.bookmarks = snapshot.bookmarks && snapshot.bookmarks.length > 0 ? snapshot.bookmarks : initialBookmarks

    if (snapshot.tabs && snapshot.tabs.length > 0) {
      this.tabs = snapshot.tabs.map(tab => this.normalizeTab(tab))
      this.activeTabId = this.tabs.some(tab => tab.id === snapshot.activeTabId)
        ? snapshot.activeTabId ?? this.tabs[0]?.id ?? ''
        : this.tabs[0]?.id ?? ''
      this.globalHistory = this.normalizeGlobalHistory(snapshot.globalHistory, this.tabs)
    } else {
      const migratedTab = this.migrateV1Tab(snapshot)
      this.tabs = [migratedTab]
      this.activeTabId = migratedTab.id
      this.globalHistory = [...migratedTab.historyStack]
    }

    const activeTab = this.getActiveTab()
    this.selectedBookmarkId = this.findBookmarkId(activeTab.url) || snapshot.selectedBookmarkId || ''
    this.emit()
  }

  persistenceSnapshot(): WebPersistenceSnapshot {
    return {
      version: 2,
      bookmarks: this.bookmarks,
      selectedBookmarkId: this.selectedBookmarkId,
      tabs: this.tabs,
      activeTabId: this.activeTabId,
      globalHistory: this.globalHistory
    }
  }

  private navigateActiveTab(input: string, explicitTitle?: string): void {
    const activeTab = this.getActiveTab()
    const url = this.normalizeUrl(input)
    const title = explicitTitle ?? this.titleFromUrl(url)
    const entry = this.createHistoryItem(activeTab.id, url, title)
    const historyStack = activeTab.historyStack.slice(0, activeTab.historyIndex + 1)
    historyStack.push(entry)

    this.applyTabState(activeTab.id, {
      title,
      url,
      requestedUrl: url,
      loading: true,
      historyStack,
      historyIndex: historyStack.length - 1,
      lastVisitedAt: entry.visitedAt
    })
    this.appendGlobalHistory(entry)
  }

  private createTab(input = defaultUrl, explicitTitle?: string): WebTab {
    const url = this.normalizeUrl(input)
    const title = explicitTitle ?? this.titleFromUrl(url)
    const now = this.now()
    const id = this.id('tab')
    const firstHistory = this.createHistoryItem(id, url, title, now)
    return {
      id,
      title,
      url,
      requestedUrl: url,
      loading: false,
      historyStack: [firstHistory],
      historyIndex: 0,
      createdAt: now,
      lastVisitedAt: now
    }
  }

  private normalizeTab(tab: WebTab): WebTab {
    const id = tab.id || this.id('tab')
    const url = this.normalizeUrl(tab.url || defaultUrl)
    const historyStack = tab.historyStack && tab.historyStack.length > 0
      ? tab.historyStack.map(entry => this.normalizeHistoryItem(entry, id))
      : [this.createHistoryItem(id, url, tab.title || this.titleFromUrl(url), tab.lastVisitedAt)]
    const historyIndex = Math.max(0, Math.min(tab.historyIndex ?? historyStack.length - 1, historyStack.length - 1))
    const currentEntry = historyStack[historyIndex]
    const title = tab.title || currentEntry?.title || this.titleFromUrl(url)
    return {
      id,
      title,
      url: currentEntry?.url ?? url,
      requestedUrl: tab.requestedUrl || currentEntry?.url || url,
      loading: false,
      historyStack,
      historyIndex,
      createdAt: tab.createdAt || this.now(),
      lastVisitedAt: tab.lastVisitedAt || currentEntry?.visitedAt || this.now()
    }
  }

  private migrateV1Tab(snapshot: WebPersistenceSnapshot): WebTab {
    const id = this.id('tab')
    const historyStack = snapshot.historyStack && snapshot.historyStack.length > 0
      ? snapshot.historyStack.map(entry => this.normalizeHistoryItem(entry, id))
      : [this.createHistoryItem(id, snapshot.currentUrl || defaultUrl, snapshot.currentTitle)]
    const historyIndex = Math.max(0, Math.min(snapshot.historyIndex ?? historyStack.length - 1, historyStack.length - 1))
    const currentEntry = historyStack[historyIndex]
    const now = this.now()
    return {
      id,
      title: snapshot.currentTitle || currentEntry?.title || this.titleFromUrl(currentEntry?.url ?? defaultUrl),
      url: currentEntry?.url ?? snapshot.currentUrl ?? defaultUrl,
      requestedUrl: currentEntry?.url ?? snapshot.currentUrl ?? defaultUrl,
      loading: false,
      historyStack,
      historyIndex,
      createdAt: now,
      lastVisitedAt: currentEntry?.visitedAt || now
    }
  }

  private normalizeGlobalHistory(history: WebHistoryItem[] | undefined, tabs: WebTab[]): WebHistoryItem[] {
    if (history && history.length > 0) {
      const fallbackTabId = tabs[0]?.id ?? this.activeTabId
      return history.map(entry => this.normalizeHistoryItem(entry, entry.tabId || fallbackTabId)).slice(-maxGlobalHistory)
    }

    return tabs
      .flatMap(tab => tab.historyStack)
      .sort((left, right) => left.visitedAt.localeCompare(right.visitedAt))
      .slice(-maxGlobalHistory)
  }

  private updateActiveTab(patch: Partial<WebTab>): void {
    const activeTab = this.getActiveTab()
    this.applyTabState(activeTab.id, patch)
  }

  private applyTabState(id: string, patch: Partial<WebTab>): void {
    this.tabs = this.tabs.map(tab => tab.id === id ? { ...tab, ...patch } : tab)
    const activeTab = this.getActiveTab()
    this.selectedBookmarkId = this.findBookmarkId(activeTab.url)
    this.emit()
  }

  private updateCurrentHistoryEntry(tabId: string, url: string, title: string): void {
    const activeTab = this.getActiveTab()
    const currentEntry = activeTab.historyStack[activeTab.historyIndex]
    if (!currentEntry) return

    const updatedEntry = { ...currentEntry, url, title }
    const historyStack = activeTab.historyStack.map(entry => entry.id === currentEntry.id ? updatedEntry : entry)
    this.tabs = this.tabs.map(tab => tab.id === tabId ? { ...tab, historyStack } : tab)
    this.globalHistory = this.globalHistory.map(entry => entry.id === currentEntry.id ? updatedEntry : entry)
  }

  private appendGlobalHistory(entry: WebHistoryItem | undefined): void {
    if (!entry) return
    const last = this.globalHistory[this.globalHistory.length - 1]
    if (last && this.sameUrl(last.url, entry.url) && last.tabId === entry.tabId) {
      this.globalHistory = [...this.globalHistory.slice(0, -1), entry]
      return
    }
    this.globalHistory = [...this.globalHistory, entry].slice(-maxGlobalHistory)
  }

  private getActiveTab(): WebTab {
    return this.tabs.find(tab => tab.id === this.activeTabId) ?? this.tabs[0] ?? this.createTab()
  }

  private findBookmarkId(url: string): string {
    return this.bookmarks.find(bookmark => this.sameUrl(bookmark.url, url))?.id ?? ''
  }

  private createHistoryItem(tabId: string, input: string, explicitTitle?: string, visitedAt = this.now()): WebHistoryItem {
    const url = this.normalizeUrl(input)
    return {
      id: this.id('history'),
      tabId,
      title: explicitTitle?.trim() || this.titleFromUrl(url),
      url,
      visitedAt
    }
  }

  private normalizeHistoryItem(entry: Partial<WebHistoryItem> & { title?: string; url?: string }, tabId: string): WebHistoryItem {
    const url = this.normalizeUrl(entry.url || defaultUrl)
    return {
      id: entry.id || this.id('history'),
      tabId: entry.tabId || tabId,
      title: entry.title?.trim() || this.titleFromUrl(url),
      url,
      visitedAt: entry.visitedAt || this.now()
    }
  }

  private normalizeUrl(input: string): string {
    const trimmed = input.trim()
    if (!trimmed) return defaultUrl
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

  private now(): string {
    return new Date().toISOString()
  }

  private id(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}
