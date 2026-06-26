<!-- Web InspectorView — active tab and session info -->
<script lang="ts">
  import { onMount } from 'svelte'
  import type { WebCredentialAccount, WebCredentialStoreInfo } from '@shared/module-contract'
  import { activeTabHistory, currentBookmarked, currentTitle, currentUrl, toggleCurrentBookmark, webLoading, webTabs } from './state'
  import { formatUrlSecondary, getWebUrlMetadata } from './url-display'
  import { addToast } from '../../store/toasts'

  let urlMetadata = $derived(getWebUrlMetadata($currentUrl))
  let credentialOrigin = $derived(originFromUrl($currentUrl))
  let credentialInfo = $state<WebCredentialStoreInfo | null>(null)
  let credentialAccounts = $state<WebCredentialAccount[]>([])
  let selectedCredentialAccount = $state('')
  let credentialAccount = $state('')
  let credentialSecret = $state('')
  let credentialLoading = $state(false)
  let credentialBusy = $state(false)
  let loadedCredentialOrigin = $state<string | null>(null)

  onMount(() => {
    const unsubscribe = currentUrl.subscribe((url) => {
      const origin = originFromUrl(url)
      if (!credentialInfo || !origin || origin === loadedCredentialOrigin) return
      void loadCredentialAccounts(origin)
    })

    void (async () => {
      credentialInfo = await window.shell.webCredentials.info()
      await loadCredentialAccounts()
    })()

    return unsubscribe
  })

  function originFromUrl(value: string): string | null {
    try {
      const origin = new URL(value).origin
      return origin.startsWith('http://') || origin.startsWith('https://') ? origin : null
    } catch {
      return null
    }
  }

  function activeWebContentsId(): number | null {
    const surface = document.querySelector('webview.web-surface') as { getWebContentsId?: () => number } | null
    return surface?.getWebContentsId?.() ?? null
  }

  async function loadCredentialAccounts(origin = credentialOrigin): Promise<void> {
    loadedCredentialOrigin = origin
    if (!origin || credentialInfo?.supported === false) {
      credentialAccounts = []
      selectedCredentialAccount = ''
      return
    }

    credentialLoading = true
    try {
      credentialAccounts = await window.shell.webCredentials.list(origin)
      selectedCredentialAccount = credentialAccounts[0]?.account ?? ''
    } catch (error) {
      credentialAccounts = []
      selectedCredentialAccount = ''
      addToast('error', error instanceof Error ? error.message : 'Could not load credentials')
    } finally {
      credentialLoading = false
    }
  }

  async function saveCredential(): Promise<void> {
    const origin = credentialOrigin
    const account = credentialAccount.trim()
    if (!origin || !account || !credentialSecret) return

    credentialBusy = true
    try {
      await window.shell.webCredentials.save({ origin, account, secret: credentialSecret })
      selectedCredentialAccount = account
      credentialAccount = ''
      credentialSecret = ''
      await loadCredentialAccounts(origin)
      selectedCredentialAccount = account
      addToast('info', 'Credential saved to Keychain')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Could not save credential')
    } finally {
      credentialBusy = false
    }
  }

  async function fillCredential(): Promise<void> {
    const origin = credentialOrigin
    const webContentsId = activeWebContentsId()
    if (!origin || !selectedCredentialAccount || webContentsId === null) return

    credentialBusy = true
    try {
      const result = await window.shell.webCredentials.fill({
        origin,
        account: selectedCredentialAccount,
        webContentsId
      })
      addToast(result.filledSecret ? 'info' : 'warn', result.filledSecret ? 'Credential filled' : 'No password field found')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Could not fill credential')
    } finally {
      credentialBusy = false
    }
  }

  async function deleteCredential(): Promise<void> {
    const origin = credentialOrigin
    const account = selectedCredentialAccount
    if (!origin || !account) return

    credentialBusy = true
    try {
      await window.shell.webCredentials.delete({ origin, account })
      await loadCredentialAccounts(origin)
      addToast('info', 'Credential deleted')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Could not delete credential')
    } finally {
      credentialBusy = false
    }
  }
</script>

<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Page</h3>
    <div class="page-card">
      <span class="page-domain">{urlMetadata.domain}</span>
      <h4>{$currentTitle}</h4>
      <p>{urlMetadata.displayUrl}</p>
      <div class="page-actions">
        <span class="load-state" class:loading={$webLoading}>{$webLoading ? 'Loading' : 'Ready'}</span>
        <button type="button" class:active={$currentBookmarked} onclick={toggleCurrentBookmark}>
          {$currentBookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
      </div>
    </div>
  </section>

  <details class="section details-section">
    <summary>Open work</summary>
    <div class="meta-grid">
      <span class="meta-label">Tabs</span><span class="meta-value">{$webTabs.length} open</span>
      <span class="meta-label">Status</span><span class="meta-value">{urlMetadata.securityLabel}</span>
      <span class="meta-label">Saved</span><span class="meta-value">{$currentBookmarked ? 'In bookmarks' : 'Not bookmarked'}</span>
    </div>
  </details>

  <details class="section details-section" open>
    <summary>Credentials</summary>
    <div class="credential-stack">
      <div class="credential-meta">
        <span>{credentialInfo?.appIdentity ?? 'Keychain'}</span>
        <span>{credentialOrigin ?? 'No web origin'}</span>
      </div>
      {#if credentialInfo?.promptBehavior}
        <p class="credential-note">{credentialInfo.promptBehavior}</p>
      {/if}

      {#if credentialInfo?.supported === false}
        <p class="credential-note">macOS Keychain is unavailable in this runtime.</p>
      {:else if credentialOrigin}
        {#if credentialAccounts.length > 0}
          <div class="credential-row">
            <select class="field-input" bind:value={selectedCredentialAccount} disabled={credentialBusy || credentialLoading}>
              {#each credentialAccounts as credential (credential.account)}
                <option value={credential.account}>{credential.account}</option>
              {/each}
            </select>
          </div>
          <div class="credential-actions">
            <button type="button" onclick={fillCredential} disabled={!selectedCredentialAccount || credentialBusy}>Fill</button>
            <button type="button" class="danger" onclick={deleteCredential} disabled={!selectedCredentialAccount || credentialBusy}>Delete</button>
          </div>
        {/if}

        <input
          class="field-input"
          type="text"
          placeholder="Account"
          bind:value={credentialAccount}
          autocomplete="username"
          disabled={credentialBusy}
        />
        <input
          class="field-input"
          type="password"
          placeholder="Password/token"
          bind:value={credentialSecret}
          autocomplete="current-password"
          disabled={credentialBusy}
          onkeydown={(event) => event.key === 'Enter' && saveCredential()}
        />
        <button
          type="button"
          class="save-credential"
          onclick={saveCredential}
          disabled={!credentialAccount.trim() || !credentialSecret || credentialBusy}
        >Save</button>
      {/if}
    </div>
  </details>

  <details class="section details-section">
    <summary>Recent in this tab</summary>
    <div class="history-stack">
      {#each $activeTabHistory.slice(0, 6) as item (item.id)}
        <div class="history-row">
          <span class="history-title">{item.title}</span>
          <span class="history-url">{formatUrlSecondary(item.url)}</span>
        </div>
      {/each}
    </div>
  </details>
</div>

<style>
  .inspector-view {
    padding: var(--space-3);
  }

  .section {
    margin-bottom: var(--space-3);
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-2);
  }

  .page-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-bg-overlay);
  }

  .page-domain {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .page-card h4 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .page-card p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .page-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }

  .load-state {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .load-state.loading {
    color: var(--color-accent);
  }

  .page-actions button {
    min-width: 0;
    padding: 4px var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    background: var(--color-bg-surface);
    font-size: var(--font-size-xs);
    font-weight: 700;
    cursor: pointer;
  }

  .page-actions button.active {
    color: var(--color-accent);
  }

  .meta-grid {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-1) var(--space-3);
    font-size: var(--font-size-sm);
  }

  .details-section {
    border-top: var(--border-subtle);
    padding-top: var(--space-2);
  }

  .details-section summary {
    color: var(--color-fg-muted);
    cursor: pointer;
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }

  .details-section[open] summary {
    margin-bottom: var(--space-2);
    color: var(--color-fg-secondary);
  }

  .meta-label {
    color: var(--color-fg-muted);
  }

  .meta-value {
    color: var(--color-fg-secondary);
    min-width: 0;
  }

  .credential-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .credential-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    overflow-wrap: anywhere;
  }

  .credential-note {
    margin: 0;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    line-height: 1.35;
  }

  .credential-row {
    display: flex;
    gap: var(--space-2);
  }

  .field-input {
    width: 100%;
    min-width: 0;
    padding: var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    outline: none;
  }

  .field-input:focus {
    border-color: var(--color-accent);
  }

  .credential-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .credential-actions button,
  .save-credential {
    min-width: 0;
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    background: var(--color-bg-surface);
    font-size: var(--font-size-xs);
    font-weight: 700;
    cursor: pointer;
  }

  .credential-actions button:hover,
  .save-credential:hover {
    color: var(--color-fg-primary);
    background: var(--color-bg-overlay);
  }

  .credential-actions button:disabled,
  .save-credential:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .credential-actions button.danger:hover {
    color: var(--color-danger);
  }

  .history-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .history-row {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
  }

  .history-title {
    font-size: var(--font-size-xs);
    color: var(--color-fg-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .history-url {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 900px) {
    .inspector-view {
      padding: var(--space-3);
    }
  }
</style>
