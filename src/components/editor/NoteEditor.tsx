import type { PartialBlock } from '@blocknote/core'
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isFreshNote, noteWordCount, updateNote } from '@/db/notes'
import { formatDateTime, formatRelative, plural } from '@/lib/format'
import { registerFlush } from '@/lib/pending-saves'
import { AddCoverButton, CoverBanner } from './CoverBanner'
import { noteLinkItems } from './note-link-items'
import { NoteBacklinks } from './NoteLinks'
import { NoteOutline } from './NoteOutline'
import { outlineOf, type OutlineItem } from '@/lib/outline'
import { editorSchema } from './schema'
import { NoteTags } from '@/components/note/NoteTags'
import type { Note, StoredBlock } from '@/db/schema'

const SAVE_DELAY = 400

/** Stores files inline as data URLs, since there is no server to upload to. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Debounces writes and flushes pending changes when the note is switched,
 * the tab is hidden or the page unloads, so nothing typed is lost.
 */
function useDebouncedSave(noteId: string) {
  const pending = useRef<Partial<Pick<Note, 'title' | 'content'>>>({})
  const timer = useRef<number | undefined>(undefined)

  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    if (Object.keys(pending.current).length === 0) return undefined
    const changes = pending.current
    pending.current = {}
    return updateNote(noteId, changes)
  }, [noteId])

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    const unregister = registerFlush(flush)
    return () => {
      unregister()
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  const save = (changes: Partial<Pick<Note, 'title' | 'content'>>) => {
    Object.assign(pending.current, changes)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, SAVE_DELAY)
  }
  const isPending = useCallback((field: 'title' | 'content') => field in pending.current, [])
  return { save, isPending }
}

/**
 * Mount with `key={note.id}`: the editor is initialised once per note.
 * `embedded` is the compact variant used inside a board card: smaller title, tight padding and no
 * block side menu (the card is small), with the cursor placed at the end of the note.
 */
export function NoteEditor({ note, embedded = false }: { note: Note; embedded?: boolean }) {
  const { resolvedTheme } = useTheme()
  const [title, setTitle] = useState(note.title)
  const [startedUntitled] = useState(!note.title)
  const { save, isPending } = useDebouncedSave(note.id)

  // Pick up renames made elsewhere (e.g. the sidebar), unless a local edit is still unsaved
  useEffect(() => {
    if (!isPending('title')) setTitle(note.title)
  }, [note.title, isPending])

  const editor = useCreateBlockNote({
    schema: editorSchema,
    initialContent: note.content.length ? (note.content as PartialBlock<typeof editorSchema.blockSchema, typeof editorSchema.inlineContentSchema, typeof editorSchema.styleSchema>[]) : undefined,
    uploadFile: fileToDataUrl,
    // Accessible name for the editable area (screen readers otherwise announce just "edit text")
    domAttributes: { editor: { 'aria-label': 'Note content' } },
  })

  // The headings for the outline, kept in step with the editor (only re-rendered when they change)
  const [outline, setOutline] = useState<OutlineItem[]>(() => outlineOf(editor.document as never))
  const updateOutline = () => {
    const next = outlineOf(editor.document as never)
    setOutline((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
  }

  // In a card, start typing right away: cursor at the end (an untitled note starts in its title field instead)
  useEffect(() => {
    if (!embedded || startedUntitled) return
    editor.setTextCursorPosition(editor.document[editor.document.length - 1], 'end')
    editor.focus()
  }, [embedded, startedUntitled, editor])

  return (
    <div className={embedded ? 'bn-embedded w-full pt-2 pb-4' : 'mx-auto w-full max-w-(--page-width) px-4 pt-10 pb-32 sm:px-12'}>
      {!embedded && <CoverBanner note={note} />}
      <div className="group/title relative">
        {!embedded && <AddCoverButton note={note} />}
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            save({ title: e.target.value })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
              e.preventDefault()
              editor.setTextCursorPosition(editor.document[0], 'start')
              editor.focus()
            }
          }}
          placeholder="Untitled"
          aria-label="Note title"
          autoFocus={!note.title}
          className={
            embedded
              ? 'mb-1 w-full bg-transparent px-3 font-page text-lg font-semibold tracking-tight outline-none placeholder:text-muted-foreground'
              : 'mb-4 w-full bg-transparent px-(--page-gutter) font-page text-4xl font-bold tracking-tight outline-none placeholder:text-muted-foreground'
          }
        />
        {!embedded && <PageInfo note={note} title={title} />}
        {!embedded && <NoteTags note={note} />}
      </div>
      <BlockNoteView
        editor={editor}
        sideMenu={!embedded}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        onChange={() => {
          save({ content: editor.document as unknown as StoredBlock[] })
          if (!embedded) updateOutline()
        }}
      >
        {/* "@" links to another note (or creates one with the typed name) */}
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={(query) =>
            noteLinkItems(query, note.id, (noteId, linkTitle) =>
              editor.insertInlineContent([{ type: 'noteLink', props: { noteId, title: linkTitle } }, ' ']),
            )
          }
        />
      </BlockNoteView>
      {!embedded && <NoteBacklinks noteId={note.id} />}
      {!embedded && <NoteOutline items={outline} />}
    </div>
  )
}

/** A quiet line under the title: when it was edited and how long it is; for a brand-new empty note, that it isn't kept. */
function PageInfo({ note, title }: { note: Note; title: string }) {
  const empty = !title.trim() && note.content.length === 0
  return (
    <p className="-mt-3 mb-3 px-(--page-gutter) text-xs text-muted-foreground" data-page-info>
      {empty && note.updatedAt === note.createdAt && isFreshNote(note.id) ? (
        "Empty notes aren't kept when you leave them."
      ) : (
        <>
          <span title={formatDateTime(note.updatedAt)}>Edited {formatRelative(note.updatedAt)}</span> ·{' '}
          {plural(noteWordCount(note), 'word')}
        </>
      )}
    </p>
  )
}
