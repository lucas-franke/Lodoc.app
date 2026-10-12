import type { Note } from '@/db/schema'
import { defaultGradient, gradientById } from './gradients'

export type ResolvedCover = { kind: 'image'; assetId: string } | { kind: 'gradient'; id: string }

/**
 * What a note shows as its cover. A note that was never given one gets a generated gradient (unless
 * automatic covers are switched off in Appearance); `cover: null` means the user removed it on purpose.
 */
export function resolveCover(note: Pick<Note, 'id' | 'cover'>, auto = true): ResolvedCover | null {
  if (note.cover === null) return null
  if (note.cover === undefined) return auto ? { kind: 'gradient', id: defaultGradient(note.id).id } : null
  if ('assetId' in note.cover) return { kind: 'image', assetId: note.cover.assetId }
  return { kind: 'gradient', id: gradientById(note.cover.gradient).id }
}
