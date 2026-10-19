/** A BlockNote block as stored JSON; cast to BlockNote's `Block` type at the editor boundary. */
export type StoredBlock = { type: string } & Record<string, unknown>

export interface Folder {
  id: string
  name: string
  parentId: string | null
  order: number
  createdAt: number
}

export type NoteCoverValue = { assetId: string } | { gradient: string }

/** The image asset a cover uses, if it is an image. */
export const coverAssetId = (note: { cover?: NoteCoverValue | null } | undefined) =>
  note?.cover && 'assetId' in note.cover ? note.cover.assetId : undefined

export interface Note {
  id: string
  title: string
  /** BlockNote document (JSON) */
  content: StoredBlock[]
  folderId: string | null
  /** Manual position among its siblings in the sidebar (ascending; pinned notes still come first) */
  order: number
  favorite: boolean
  pinned: boolean
  /** Reserved for auto-tagging rules (not used in the UI yet) */
  tags: string[]
  /**
   * Header: an image (in the assets table) or a gradient from the palette. Missing = a generated
   * gradient is shown; null = the user removed the cover.
   */
  cover?: NoteCoverValue | null
  /** A daily journal note: the day it is for ("2026-10-20"), so "Today's journal" finds it again */
  journal?: string
  /** Offered under "From template": new notes start as a copy of it (the note itself stays an ordinary note) */
  template?: boolean
  createdAt: number
  updatedAt: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

/** How much of a note a card shows: cover, title, preview and meta / cover and title / title only. */
export type NoteCardView = 'full' | 'cover' | 'title'
export const NOTE_CARD_VIEWS: NoteCardView[] = ['full', 'cover', 'title']

// A type alias (not an interface) so it is assignable to React Flow's Record<string, unknown> node data
type BoardNodeBase = {
  id: string
  /** Position and size in canvas coordinates */
  x: number
  y: number
  width: number
  height: number
}

/** An item on a board. Note nodes only reference a note; its content is never copied. */
export type BoardNode = BoardNodeBase &
  (
    | {
        type: 'note'
        noteId: string
        /** Missing means 'full' */
        view?: NoteCardView
        /** Height to go back to when a 'title' card is expanded again */
        restoreHeight?: number
      }
    | { type: 'text'; text: string; size: 's' | 'm' | 'l' }
    | { type: 'image'; assetId: string; alt?: string }
    /** An area that groups the items on top of it; moving it moves them along */
    | { type: 'frame'; title: string }
  )

/** An arrow from one item on a board to another */
export interface BoardEdge {
  id: string
  source: string
  target: string
  label?: string
}

/** A topic board: free-form canvas with references to notes, text annotations and images. */
export interface Board {
  id: string
  title: string
  /** The folder it lives in, next to notes; missing or null = top level (the sidebar's Boards section) */
  folderId?: string | null
  createdAt: number
  updatedAt: number
  viewport: Viewport
  /** The view new note cards start with (and the toolbar last applied); missing means 'full' */
  noteView?: NoteCardView
  /** Array order is the z-order (last = on top); frames always stay behind the other items */
  nodes: BoardNode[]
  /** Arrows between items; missing in boards from before arrows existed */
  edges?: BoardEdge[]
}

/** Image bytes, kept out of the board document so boards stay small. */
export interface Asset {
  id: string
  blob: Blob
  mimeType: string
  name: string
  width: number
  height: number
  createdAt: number
}

/**
 * Something deleted, kept for a while so it can be restored: the deleted items themselves plus the cards their
 * notes had on other boards (those are put back too). Images stay in `assets` while an entry still uses them.
 */
export interface TrashEntry {
  id: string
  kind: 'note' | 'folder' | 'board'
  /** Title of the deleted item at the time, for the trash list */
  title: string
  deletedAt: number
  notes: Note[]
  folders: Folder[]
  boards: Board[]
  /** Note cards removed from boards that were not deleted themselves, with their arrows */
  cards: { boardId: string; node: BoardNode; edges?: BoardEdge[] }[]
}

/**
 * One line in Activity: a change to the notes (created, renamed, moved, …), something deleted, or a message
 * the app showed (a toast). Kept for a while on this device only; not part of backups.
 */
export interface ActivityEntry {
  id: string
  at: number
  kind: 'change' | 'deleted' | 'message'
  /** What happened, e.g. "Created", "Moved to Trash", or the whole message */
  text: string
  /** What it happened to: linked (with its current name) while it still exists */
  item?: { type: 'note' | 'folder' | 'board'; id: string; title: string }
  level?: 'success' | 'error' | 'info'
  /** For deletions: the trash entry, as long as it can still be restored */
  trashId?: string
}
