<script lang="ts">
  import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CaretLineLeftIcon,
    CaretLineRightIcon,
    XIcon
  } from 'phosphor-svelte'
  import { onMount } from 'svelte'
  import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
  import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'
  import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'
  import type { AssetRecord } from '@shared/module-contract'

  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  interface Props {
    asset: AssetRecord
    onClose: () => void
  }

  let { asset, onClose }: Props = $props()

  let loadedAssetId = $state<string | null>(null)
  let pdfDocument = $state<PDFDocumentProxy | null>(null)
  let pageNumber = $state(1)
  let fitMode = $state<'width' | 'page'>('width')
  let status = $state<'idle' | 'loading' | 'ready' | 'rendering' | 'error'>('idle')
  let errorMessage = $state('')
  let renderVersion = 0
  let scheduledRender = 0
  let canvas: HTMLCanvasElement | undefined = $state()
  let pageHost: HTMLDivElement | undefined = $state()

  let pageCount = $derived(pdfDocument?.numPages ?? (typeof asset.metadata.pageCount === 'number' ? asset.metadata.pageCount : 0))
  let canGoPrevious = $derived(pageNumber > 1 && pageCount > 0)
  let canGoNext = $derived(pageCount > 0 && pageNumber < pageCount)

  onMount(() => {
    void loadPdf(asset.id)
    return () => {
      if (scheduledRender) window.cancelAnimationFrame(scheduledRender)
      resetPdfDocument()
    }
  })

  async function loadPdf(assetId: string): Promise<void> {
    resetPdfDocument()
    loadedAssetId = assetId
    status = 'loading'
    errorMessage = ''
    pageNumber = 1

    try {
      const pdfData = await window.shell.assets.readPdf(assetId)
      const bytes = Uint8Array.from(atob(pdfData.dataBase64), (char) => char.charCodeAt(0))
      const loaded = await pdfjsLib.getDocument({
        data: bytes,
        disableAutoFetch: true,
        disableStream: true
      }).promise

      if (loadedAssetId !== assetId) {
        await loaded.destroy()
        return
      }

      pdfDocument = loaded
      status = 'ready'
      scheduleRender()
    } catch (error) {
      if (loadedAssetId !== assetId) return
      pdfDocument = null
      status = 'error'
      errorMessage = error instanceof Error ? error.message : 'PDF could not be loaded.'
    }
  }

  async function renderPage(): Promise<void> {
    if (!pdfDocument || !canvas || !pageHost) return
    const version = ++renderVersion
    status = 'rendering'

    try {
      const page = await pdfDocument.getPage(pageNumber)
      if (version !== renderVersion) return

      const baseViewport = page.getViewport({ scale: 1 })
      const maxWidth = Math.max(260, pageHost.clientWidth - 32)
      const maxHeight = Math.max(260, pageHost.clientHeight - 32)
      const fitScale = fitMode === 'page'
        ? Math.min(maxWidth / baseViewport.width, maxHeight / baseViewport.height)
        : maxWidth / baseViewport.width
      const scale = Math.max(0.25, Math.min(fitScale, 3))
      const viewport = page.getViewport({ scale })
      const outputScale = window.devicePixelRatio || 1
      const context = canvas.getContext('2d')
      if (!context) throw new Error('PDF canvas is unavailable.')

      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`

      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)

      await page.render({
        canvasContext: context,
        viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined
      }).promise

      if (version === renderVersion) status = 'ready'
    } catch (error) {
      if (version !== renderVersion) return
      status = 'error'
      errorMessage = error instanceof Error ? error.message : 'PDF page could not be rendered.'
    }
  }

  function close(): void {
    onClose()
  }

  function previousPage(): void {
    if (!canGoPrevious) return
    pageNumber -= 1
    scheduleRender()
  }

  function nextPage(): void {
    if (!canGoNext) return
    pageNumber += 1
    scheduleRender()
  }

  function firstPage(): void {
    if (pageCount < 1) return
    pageNumber = 1
    scheduleRender()
  }

  function lastPage(): void {
    if (pageCount < 1) return
    pageNumber = pageCount
    scheduleRender()
  }

  function commitPageInput(value: string): void {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || pageCount < 1) {
      return
    }
    const nextPageNumber = Math.min(pageCount, Math.max(1, parsed))
    if (nextPageNumber === pageNumber) return
    pageNumber = nextPageNumber
    scheduleRender()
  }

  function scheduleRender(): void {
    if (scheduledRender) window.cancelAnimationFrame(scheduledRender)
    scheduledRender = window.requestAnimationFrame(() => {
      scheduledRender = 0
      void renderPage()
    })
  }

  function resetPdfDocument(): void {
    renderVersion += 1
    const currentDocument = pdfDocument
    pdfDocument = null
    if (currentDocument) void currentDocument.destroy()
  }

  function trackCanvas(node: HTMLCanvasElement): () => void {
    canvas = node
    scheduleRender()
    return () => {
      if (canvas === node) canvas = undefined
    }
  }

  function trackPageHost(node: HTMLDivElement): () => void {
    pageHost = node
    scheduleRender()
    return () => {
      if (pageHost === node) pageHost = undefined
    }
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape') close()
    if (event.key === 'ArrowLeft') previousPage()
    if (event.key === 'ArrowRight') nextPage()
  }}
  onresize={scheduleRender}
/>

<div class="pdf-modal-backdrop" role="presentation" onclick={close}>
  <div
    class="pdf-modal"
    role="dialog"
    aria-modal="true"
    aria-label={`PDF reader: ${asset.label}`}
    tabindex="-1"
    data-capture-pdf-reader
    onclick={(event) => event.stopPropagation()}
    onkeydown={(event) => event.stopPropagation()}
  >
    <header class="pdf-modal-header">
      <div class="pdf-title">
        <span>{asset.label}</span>
        <span>{asset.originalName}</span>
      </div>
      <div class="pdf-controls" aria-label="PDF page controls">
        <button type="button" class="icon-btn" aria-label="First page" title="First page" disabled={!canGoPrevious} onclick={firstPage}>
          <CaretLineLeftIcon size={17} weight="bold" />
        </button>
        <button type="button" class="icon-btn" aria-label="Previous page" title="Previous page" disabled={!canGoPrevious} onclick={previousPage}>
          <ArrowLeftIcon size={17} weight="bold" />
        </button>
        <label class="page-input-label">
          <span class="sr-only">Current page</span>
          <input
            class="page-input"
            type="number"
            min="1"
            max={pageCount || 1}
            value={pageNumber}
            onblur={(event) => commitPageInput(event.currentTarget.value)}
            onkeydown={(event) => {
              if (event.key === 'Enter') commitPageInput(event.currentTarget.value)
            }}
          />
        </label>
        <span class="page-total">/ {pageCount || '-'}</span>
        <button type="button" class="icon-btn" aria-label="Next page" title="Next page" disabled={!canGoNext} onclick={nextPage}>
          <ArrowRightIcon size={17} weight="bold" />
        </button>
        <button type="button" class="icon-btn" aria-label="Last page" title="Last page" disabled={!canGoNext} onclick={lastPage}>
          <CaretLineRightIcon size={17} weight="bold" />
        </button>
      </div>
      <label class="fit-control">
        <span class="sr-only">PDF fit mode</span>
        <select bind:value={fitMode} onchange={scheduleRender}>
          <option value="width">Fit width</option>
          <option value="page">Fit page</option>
        </select>
      </label>
      <button class="modal-close" type="button" title="Close reader" aria-label="Close reader" onclick={close}>
        <XIcon size={18} weight="bold" />
      </button>
    </header>

    <div class="pdf-page-host" {@attach trackPageHost}>
      {#if status === 'loading'}
        <div class="pdf-message">Loading PDF...</div>
      {:else if status === 'error'}
        <div class="pdf-message error">
          <strong>PDF unavailable</strong>
          <span>{errorMessage}</span>
        </div>
      {/if}
      <canvas class:rendering={status === 'rendering'} {@attach trackCanvas}></canvas>
    </div>
  </div>
</div>

<style>
  .pdf-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: stretch;
    justify-content: center;
    padding: var(--space-4);
    background: color-mix(in srgb, var(--color-bg-base) 72%, rgba(0, 0, 0, 0.82));
  }
  .pdf-modal {
    display: flex;
    flex-direction: column;
    width: min(1180px, 96vw);
    max-height: 92vh;
    min-height: min(760px, 92vh);
    color: var(--color-fg-primary);
    background: var(--color-bg-base);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    box-shadow: 0 20px 70px rgba(0, 0, 0, 0.28);
    overflow: hidden;
  }
  .pdf-modal-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: var(--space-3);
    min-height: 52px;
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--border-subtle);
    background: var(--color-bg-surface);
  }
  .pdf-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .pdf-title span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--font-size-sm);
    font-weight: 700;
  }
  .pdf-title span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
  }
  .pdf-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .icon-btn,
  .modal-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    background: var(--color-bg-overlay);
  }
  .icon-btn:hover:not(:disabled),
  .modal-close:hover,
  .fit-control select:hover {
    color: var(--color-fg-primary);
    background: var(--color-bg-active);
  }
  .icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .page-input {
    width: 54px;
    height: 32px;
    padding: 0 var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
    font: inherit;
    font-size: var(--font-size-sm);
    text-align: center;
  }
  .page-total {
    min-width: 34px;
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
  }
  .fit-control select {
    height: 32px;
    width: 104px;
    padding: 0 var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
    font: inherit;
    font-size: var(--font-size-sm);
  }
  .icon-btn:focus-visible,
  .modal-close:focus-visible,
  .page-input:focus-visible,
  .fit-control select:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 1px;
  }
  .pdf-page-host {
    position: relative;
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: var(--space-4);
    background: color-mix(in srgb, var(--color-bg-overlay) 72%, var(--color-bg-base));
  }
  canvas {
    display: block;
    max-width: none;
    background: white;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
  }
  canvas.rendering {
    opacity: 0.72;
  }
  .pdf-message {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 1;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    max-width: min(520px, 80%);
    padding: var(--space-4);
    color: var(--color-fg-muted);
    text-align: center;
    background: var(--color-bg-base);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
  }
  .pdf-message.error strong {
    color: var(--color-fg-primary);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (max-width: 760px) {
    .pdf-modal-header {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-2);
    }
    .pdf-controls,
    .fit-control {
      grid-column: 1 / -1;
    }
    .pdf-controls {
      justify-content: center;
    }
    .fit-control select {
      width: 100%;
    }
  }
</style>
