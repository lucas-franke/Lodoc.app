/** Formats that can be redrawn on a canvas without losing anything (GIFs may be animated, SVGs are vectors). */
const COMPRESSIBLE = /^image\/(png|jpeg|webp)$/

export const isCompressible = (type: string) => COMPRESSIBLE.test(type)

/**
 * `portable` writes JPEG (or PNG where there is transparency) instead of WebP, for images that get
 * copied out of the app: Google Docs, for one, refuses pasted WebP images.
 */
export type CompressOptions = { maxSide: number; quality: number; portable?: boolean }

const PORTABLE = /^image\/(png|jpeg)$/

export function loadImage(blob: Blob): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  const url = URL.createObjectURL(blob)
  const img = new Image()
  return new Promise((resolve, reject) => {
    img.onload = () => resolve({ img, revoke: () => URL.revokeObjectURL(url) })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This image could not be read.'))
    }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = ctx.getImageData(0, 0, width, height)
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true
  return false
}

/**
 * Scales an already loaded image down to `maxSide` and re-encodes it as WebP (or JPEG/PNG where the
 * browser can't write WebP, or when `portable`). Returns null when that wouldn't make the file smaller,
 * except that a `portable` request always converts a WebP original.
 */
export async function compressLoadedImage(
  img: HTMLImageElement,
  original: Blob,
  { maxSide, quality, portable = false }: CompressOptions,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  if (!isCompressible(original.type) || !img.naturalWidth || !img.naturalHeight) return null
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  let blob = portable ? null : await canvasToBlob(canvas, 'image/webp', quality)
  // Browsers that can't write WebP silently fall back to PNG
  if (blob?.type !== 'image/webp') {
    const type = hasTransparency(ctx, canvas.width, canvas.height) ? 'image/png' : 'image/jpeg'
    blob = await canvasToBlob(canvas, type, quality)
  }
  if (!blob) return null
  const mustConvert = portable && !PORTABLE.test(original.type)
  return mustConvert || blob.size < original.size ? { blob, width: canvas.width, height: canvas.height } : null
}

/** Shrinks an image file; anything that can't (or needn't) be compressed comes back as it was. */
export async function compressImage(blob: Blob, options: CompressOptions): Promise<Blob> {
  if (!isCompressible(blob.type)) return blob
  const { img, revoke } = await loadImage(blob)
  try {
    return (await compressLoadedImage(img, blob, options))?.blob ?? blob
  } finally {
    revoke()
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Images inside notes: stored inline in the note, so kept small (still sharp on a full-width page), and
 * in formats that survive being copied into other apps.
 */
export const NOTE_IMAGE: CompressOptions = { maxSide: 1600, quality: 0.82, portable: true }
