import { useLiveQuery } from 'dexie-react-hooks'
import { Hash, Plus, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { db } from '@/db/db'
import { addNoteTag, normalizeTag, removeNoteTag, tagCounts } from '@/db/notes'
import type { Note } from '@/db/schema'

/** The note's tags under its title: each links to all notes with that tag; "Add tag" suggests existing ones. */
export function NoteTags({ note }: { note: Note }) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  // Suggestions: the tags other notes use (computed only while adding)
  const known = useLiveQuery(async () => (adding ? tagCounts(await db.notes.toArray()).map((t) => t.tag) : []), [adding], [])

  const commit = (keepOpen: boolean) => {
    // Take the text and clear the field first, so typing the next tag right away isn't wiped by this save
    const tag = value
    setValue('')
    if (keepOpen) input.current?.focus()
    else setAdding(false)
    if (normalizeTag(tag)) void addNoteTag(note.id, tag)
  }

  if (!note.tags.length && !adding) {
    return (
      <div className="-mt-1 mb-3 px-(--page-gutter)">
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded text-xs text-muted-foreground opacity-0 outline-none group-focus-within/title:opacity-100 group-hover/title:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60 pointer-coarse:opacity-100"
        >
          <Plus className="size-3" /> Add tag
        </button>
      </div>
    )
  }

  return (
    <ul className="-mt-1 mb-3 flex flex-wrap items-center gap-1.5 px-(--page-gutter)" aria-label="Tags">
      {note.tags.map((tag) => (
        <li key={tag} className="flex items-center rounded-full border bg-muted/50 text-xs">
          <a
            href={`#/tag/${encodeURIComponent(tag)}`}
            className="flex items-center gap-0.5 rounded-l-full py-0.5 pl-2 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Hash className="size-3 text-muted-foreground" />
            {tag}
          </a>
          <button
            type="button"
            onClick={() => void removeNoteTag(note.id, tag)}
            aria-label={`Remove tag ${tag}`}
            className="rounded-r-full px-1.5 py-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <X className="size-3" />
          </button>
        </li>
      ))}
      <li>
        {adding ? (
          <>
            <input
              ref={input}
              autoFocus
              value={value}
              list={listId}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  commit(true)
                } else if (e.key === 'Escape') {
                  setValue('')
                  setAdding(false)
                }
              }}
              onBlur={() => commit(false)}
              placeholder="Tag name"
              aria-label="New tag"
              className="h-6 w-28 rounded-full border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            />
            <datalist id={listId}>
              {known.filter((t) => !note.tags.includes(t)).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label="Add tag"
            className="flex size-6 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Plus className="size-3" />
          </button>
        )}
      </li>
    </ul>
  )
}
