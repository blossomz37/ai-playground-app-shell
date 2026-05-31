import { nativeImage } from 'electron'
import { readFileSync } from 'fs'
import { PDFDocument } from 'pdf-lib'
import type { AssetImportCandidate } from '@shared/module-contract'

const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])
const thumbnailExtensions = new Set(['pdf'])
const thumbnailMaxEdge = 512

export async function metadataForImportedAsset(
  filePath: string,
  extension: string
): Promise<Pick<AssetImportCandidate, 'image' | 'pdf'>> {
  return {
    image: imageMetadataFor(filePath, extension),
    pdf: await pdfMetadataFor(filePath, extension)
  }
}

function imageMetadataFor(filePath: string, extension: string): AssetImportCandidate['image'] | undefined {
  if (!imageExtensions.has(extension)) return undefined

  const image = nativeImage.createFromPath(filePath)
  if (image.isEmpty()) return undefined

  const size = image.getSize()
  if (size.width <= 0 || size.height <= 0) return undefined

  return {
    width: size.width,
    height: size.height,
    thumbnailDataUrl: dataUrlForNativeImage(image)
  }
}

async function pdfMetadataFor(filePath: string, extension: string): Promise<AssetImportCandidate['pdf'] | undefined> {
  if (extension !== 'pdf') return undefined

  const [documentMetadata, thumbnailDataUrl] = await Promise.all([
    readPdfDocumentMetadata(filePath),
    thumbnailDataUrlForFile(filePath, extension)
  ])

  return {
    ...documentMetadata,
    thumbnailDataUrl
  }
}

async function readPdfDocumentMetadata(
  filePath: string
): Promise<Omit<NonNullable<AssetImportCandidate['pdf']>, 'thumbnailDataUrl'>> {
  try {
    const pdf = await PDFDocument.load(readFileSync(filePath), { ignoreEncryption: true })
    return {
      pageCount: pdf.getPageCount(),
      title: emptyToNull(pdf.getTitle()),
      author: emptyToNull(pdf.getAuthor())
    }
  } catch {
    return {
      pageCount: null,
      title: null,
      author: null
    }
  }
}

async function thumbnailDataUrlForFile(filePath: string, extension: string): Promise<string | null> {
  if (!thumbnailExtensions.has(extension)) return null

  try {
    const thumbnail = await nativeImage.createThumbnailFromPath(filePath, {
      width: thumbnailMaxEdge,
      height: thumbnailMaxEdge
    })
    return thumbnail.isEmpty() ? null : thumbnail.toDataURL()
  } catch {
    return null
  }
}

function dataUrlForNativeImage(image: Electron.NativeImage): string | null {
  const size = image.getSize()
  const scale = Math.min(1, thumbnailMaxEdge / Math.max(size.width, size.height))
  const thumbnail = image.resize({
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
    quality: 'good'
  })

  return thumbnail.isEmpty() ? null : thumbnail.toDataURL()
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
