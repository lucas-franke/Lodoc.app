import Dexie, { type EntityTable } from 'dexie'
import type { ActivityEntry, Asset, Board, Folder, Note, NoteVersion, TrashEntry, VersionImage } from './schema'

// The database keeps its original name (from before the app was called Lodoc), or existing notes would vanish. The
// components page (src/gallery) names one of its own, so its live examples never touch anyone's notes.
const name = (globalThis as { __lodocDatabase?: string }).__lodocDatabase ?? 'localnotes'
export const db = new Dexie(name) as Dexie & {
  notes: EntityTable<Note, 'id'>
  folders: EntityTable<Folder, 'id'>
  boards: EntityTable<Board, 'id'>
  assets: EntityTable<Asset, 'id'>
  trash: EntityTable<TrashEntry, 'id'>
  activity: EntityTable<ActivityEntry, 'id'>
  versions: EntityTable<NoteVersion, 'id'>
  versionImages: EntityTable<VersionImage, 'hash'>
}

db.version(1).stores({
  notes: 'id, folderId, favorite, pinned, updatedAt',
  folders: 'id, parentId',
})

// v2: manual note order. Existing notes keep their previous order (most recently edited first).
db.version(2)
  .stores({
    notes: 'id, folderId, favorite, pinned, updatedAt',
    folders: 'id, parentId',
  })
  .upgrade((tx) =>
    tx
      .table('notes')
      .toCollection()
      .modify((note: Note) => {
        if (typeof note.order !== 'number') note.order = -note.updatedAt
      }),
  )

// v3: boards (infinite canvas) and the image bytes they use. Purely additive, notes and folders stay as they are.
db.version(3).stores({
  boards: 'id, createdAt',
  assets: 'id',
})

// v4: a trash for deleted notes, folders and boards (restorable for a while). Purely additive.
db.version(4).stores({
  trash: 'id, deletedAt',
})

// v5: Activity, a log of changes, deletions and messages (db/activity.ts). Purely additive.
db.version(5).stores({
  activity: 'id, at, item.id',
})

// v6: note history (db/versions.ts): earlier states of notes, and the images they use, stored once. Purely additive.
db.version(6).stores({
  versions: 'id, noteId, at',
  versionImages: 'hash',
})
