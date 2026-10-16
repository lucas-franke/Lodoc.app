import { nanoid } from 'nanoid'
import { db } from './db'
import { coverAssetId, type Asset } from './schema'
import { compressLoadedImage, loadImage, type CompressOptions } from '@/lib/image-compress'

/** Larger images are scaled down and re-encoded on import to keep the database and exports reasonable. */
const BOARD_IMAGE: CompressOptions = { maxSide: 2048, quality: 0.85 }
/** Used when the browser can't tell the size of an image (e.g. an SVG without dimensions). */
const FALLBACK_SIZE = { width: 300, height: 200 }

export const isImageFile = (file: File) => file.type.startsWith('image/')

/**
 * Stores an image file in the assets table and returns it (with its stored size).
 * Throws an Error with a readable message for files that are not readable images.
 */
export async function addImageAsset(file: File): Promise<Asset> {
  if (!isImageFile(file)) throw new Error(`"${file.name || 'This file'}" is not an image.`)

  const { img, revoke } = await loadImage(file)
  try {
    let blob: Blob = file
    let width = img.naturalWidth || FALLBACK_SIZE.width
    let height = img.naturalHeight || FALLBACK_SIZE.height

    // Keeps the original when compressing wouldn't make it smaller (or it's a GIF/SVG)
    const compressed = await compressLoadedImage(img, file, BOARD_IMAGE)
    if (compressed) ({ blob, width, height } = compressed)

    const asset: Asset = {
      id: nanoid(),
      blob,
      mimeType: blob.type || file.type,
      name: file.name || 'image',
      width,
      height,
      createdAt: Date.now(),
    }
    await db.assets.add(asset)
    return asset
  } finally {
    revoke()
  }
}

/**
 * Deletes the given images unless something still uses them: an image item on a board or a note's
 * cover.
 */
export async function pruneAssets(assetIds: Iterable<string | undefined>) {
  const candidates = new Set([...assetIds].filter((id): id is string => !!id))
  if (!candidates.size) return
  await db.transaction('rw', [db.boards, db.notes, db.assets, db.trash], async () => {
    for (const board of await db.boards.toArray()) {
      for (const n of board.nodes) if (n.type === 'image') candidates.delete(n.assetId)
    }
    await db.notes.each((note) => {
      const id = coverAssetId(note)
      if (id) candidates.delete(id)
    })
    // Deleted items in the trash keep their images until the trash entry is gone
    await db.trash.each((entry) => {
      for (const note of entry.notes) {
        const id = coverAssetId(note)
        if (id) candidates.delete(id)
      }
      for (const board of entry.boards) for (const n of board.nodes) if (n.type === 'image') candidates.delete(n.assetId)
    })
    await db.assets.bulkDelete([...candidates])
  })
}
