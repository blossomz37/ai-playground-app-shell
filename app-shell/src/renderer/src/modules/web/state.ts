import { readable } from 'svelte/store'
import {
  WebStateSlice,
  type WebBookmark,
  type WebHistoryItem,
  type WebPersistenceSnapshot,
  type WebState,
  type WebTab
} from '@shared/state/web-state'
import { workspaceId } from '../../store'
import { addToast } from '../../store/toasts'
import { getModuleState } from '../module-state-registry'

export type { WebBookmark, WebHistoryItem, WebTab }

const webState = getModuleState<WebStateSlice>('shell.web', 'web')
let activeWorkspaceId = ''
let persistenceReady = false

function fromWebState<T>(selector: (state: WebState) => T) {
  return readable(selector(webState.getSnapshot()), (set) =>
    webState.subscribe((state) => set(selector(state)))
  )
}

export const webBookmarks = fromWebState(state => state.bookmarks)
export const selectedBookmarkId = fromWebState(state => state.selectedBookmarkId)
export const webTabs = fromWebState(state => state.tabs)
export const activeTabId = fromWebState(state => state.activeTabId)
export const activeTab = fromWebState(state => state.activeTab)
export const currentUrl = {
  subscribe: fromWebState(state => state.currentUrl).subscribe,
  set: (value: string) => webState.setCurrentUrl(value)
}
export const currentTitle = fromWebState(state => state.currentTitle)
export const webLoading = fromWebState(state => state.loading)
export const webHistory = fromWebState(state => state.history)
export const activeTabHistory = fromWebState(state => state.tabHistory)
export const canGoBack = fromWebState(state => state.canGoBack)
export const canGoForward = fromWebState(state => state.canGoForward)
export const currentBookmarked = fromWebState(state => state.currentBookmarked)

export function openBookmark(id: string): void {
  webState.openBookmark(id)
}

export function openBookmarkInNewTab(id: string): void {
  webState.openBookmarkInNewTab(id)
}

export function navigateTo(input: string, explicitTitle?: string): void {
  webState.navigateTo(input, explicitTitle)
}

export function openHistoryItem(id: string): void {
  webState.openHistoryItem(id)
}

export function syncLoadedPage(url: string, title?: string): void {
  webState.syncLoadedPage(url, title)
}

export function setActiveTabLoading(value: boolean): void {
  webState.setActiveTabLoading(value)
}

export function reloadPage(): void {
  webState.reloadPage()
}

export function goBack(): void {
  webState.goBack()
}

export function goForward(): void {
  webState.goForward()
}

export function toggleCurrentBookmark(): void {
  const result = webState.toggleCurrentBookmark()
  addToast('info', result === 'added' ? 'Bookmark added' : 'Bookmark removed')
}

export function newTab(input?: string, explicitTitle?: string): void {
  webState.newTab(input, explicitTitle)
}

export function selectTab(id: string): void {
  webState.selectTab(id)
}

export function closeTab(id: string): void {
  webState.closeTab(id)
}

export function closeActiveTab(): void {
  webState.closeTab(webState.getSnapshot().activeTabId)
}

function persistenceKey(wsId: string): string {
  return `modules.web.${wsId}.state`
}

async function loadWebPersistence(wsId: string): Promise<void> {
  activeWorkspaceId = wsId
  persistenceReady = false
  const snapshot = await window.shell.settings.get(persistenceKey(wsId)) as WebPersistenceSnapshot | undefined
  if (activeWorkspaceId !== wsId) return
  persistenceReady = true
  webState.hydrate(snapshot)
}

workspaceId.subscribe((wsId) => {
  void loadWebPersistence(wsId)
})

webState.subscribe(() => {
  if (!persistenceReady || !activeWorkspaceId) return
  void window.shell.settings.set(persistenceKey(activeWorkspaceId), webState.persistenceSnapshot())
})
