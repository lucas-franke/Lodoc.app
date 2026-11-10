import { useLiveQuery } from 'dexie-react-hooks'
import { Hash, MoreHorizontal, Search } from 'lucide-react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { CardSection, NoteCard } from '@/components/folder/FolderView'
import { SortMenu } from '@/components/folder/SortMenu'
import { RowDropdownMenu } from '@/components/ItemMenu'
import { CardViewToggle } from '@/components/note/CardViewToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/db/db'
import { isListed, normalizeTag, noteText, sortNotesBy, tagCounts } from '@/db/notes'
import type { Note } from '@/db/schema'
import { renameTag } from '@/db/tags'
import { useConfirm } from '@/hooks/useConfirm'
import { useNoteCardView } from '@/hooks/useNoteCardView'
import { useNoteSort } from '@/hooks/useNoteSort'
import { openTag } from '@/hooks/useRoute'
import { useAppEvent } from '@/lib/app-events'
import { plural } from '@/lib/format'
import { notify } from '@/lib/notify'
import { tagMenuEntries, takeTagRename } from './tag-actions'

/**
 * All notes with one tag (#/tag/<name>), sorted and filtered like a folder's notes, plus the other tags to jump
 * between them. The ⋯ beside the name renames the tag on every note (merging it into a tag that exists already)
 * or takes it off all of them.
 */
export function TagView({ tag }: { tag: string }) {
  const notes = useLiveQuery(() => db.notes.filter(isListed).toArray(), [], undefined as Note[] | undefined)
  const [cardView, setCardView] = useNoteCardView()
  const [sort, setSort] = useNoteSort()
  const [filter, setFilter] = useState('')
  // "Rename" in the sidebar's menu opens this page and starts here
  const [renaming, setRenaming] = useState(() => takeTagRename(tag))
  useAppEvent('rename-tag', useCallback((asked) => asked === tag && takeTagRename(tag) && setRenaming(true), [tag]))
  const confirm = useConfirm()
  if (!notes) return null
  const all = sortNotesBy(notes.filter((n) => n.tags.includes(tag)), sort.key, sort.direction)
  const q = filter.trim().toLowerCase()
  const tagged = q ? all.filter((n) => noteText(n).toLowerCase().includes(q)) : all
  const counts = tagCounts(notes)
  const others = counts.filter((t) => t.tag !== tag)

  const rename = (typed: string | null) => {
    setRenaming(false)
    const next = typed === null ? '' : normalizeTag(typed)
    if (!next || next === tag) return
    const run = async () => {
      const count = await renameTag(tag, next)
      openTag(next)
      notify(`#${tag} is now #${next} on ${plural(count, 'note')}`, { level: 'success', logged: true })
    }
    // A name that is in use merges the two tags, which can't be taken apart again: ask first
    if (others.some((t) => t.tag === next)) {
      confirm({
        title: `Merge #${tag} into #${next}?`,
        description: `${plural(all.length, 'note')} with #${tag} will get #${next} instead. #${tag} disappears from the sidebar.`,
        action: 'Merge',
        plain: true,
        onConfirm: () => void run(),
      })
    } else void run()
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-12 pb-32 sm:px-12 2xl:max-w-6xl">
      <div className="flex items-center gap-2">
        <Hash aria-hidden className="size-8 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        {renaming ? (
          <TagNameField initial={tag} onDone={rename} />
        ) : (
          <h1 className="min-w-0 flex-1 truncate font-page text-4xl font-bold tracking-tight max-sm:text-3xl">{tag}</h1>
        )}
        {/* Only while it is a tag at all (a link to a removed tag still opens this page) */}
        {all.length > 0 && (
          <RowDropdownMenu
            align="end"
            entries={tagMenuEntries(tag, () => setRenaming(true))}
            trigger={
              <Button variant="ghost" size="icon-sm" className="icons-lg shrink-0" aria-label="Tag actions">
                <MoreHorizontal />
              </Button>
            }
          />
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{plural(all.length, 'note')} with this tag</p>
      {others.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Other tags">
          {others.map((t) => (
            <li key={t.tag}>
              <a
                href={`#/tag/${encodeURIComponent(t.tag)}`}
                className="block rounded-full border px-2 py-0.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                #{t.tag} <span className="tabular-nums">{t.count}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {all.length > 0 && (
        <div className="relative mt-6 w-full sm:w-56">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-(--icon) -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setFilter('')}
            placeholder="Filter these notes"
            aria-label="Filter these notes"
            className="pl-8"
          />
        </div>
      )}
      {all.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No note has this tag (any more).</p>
      ) : tagged.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No note with this tag matches "{filter.trim()}".</p>
      ) : (
        <CardSection
          title="Notes"
          sectionKey="tag-notes"
          action={
            <div className="flex items-center gap-2">
              <CardViewToggle value={cardView} onChange={setCardView} label="Card view" />
              <SortMenu sort={sort} onChange={setSort} />
            </div>
          }
        >
          {tagged.map((note) => (
            <NoteCard key={note.id} note={note} view={cardView} />
          ))}
        </CardSection>
      )}
    </div>
  )
}

/** The tag's name as a field in place of the title: Enter or leaving it renames, Escape cancels */
function TagNameField({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  const finish = (name: string | null) => {
    if (done.current) return
    done.current = true
    onDone(name)
  }
  useLayoutEffect(() => {
    // Right away (a phone keeps the keyboard opened for it), and again once the menu has handed the focus back
    const focus = () => {
      ref.current?.focus()
      ref.current?.select()
    }
    focus()
    const t = window.setTimeout(focus, 60)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          // Or the same key press would go on to the "Merge?" question that may open, and answer it with Cancel
          e.preventDefault()
          finish(value)
        }
        if (e.key === 'Escape') finish(null)
      }}
      aria-label="Tag name"
      autoCapitalize="none"
      spellCheck={false}
      className="min-w-0 flex-1 rounded-md bg-transparent font-page text-4xl font-bold tracking-tight outline-none ring-2 ring-ring/40 max-sm:text-3xl"
    />
  )
}
