import { isTouchDevice, type PartialBlock } from '@blocknote/core'
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isImageFile } from '@/db/assets'
import { isFreshNote, noteWordCount, updateNote } from '@/db/notes'
import { formatDateTime, formatRelative, plural } from '@/lib/format'
import { blobToDataUrl, compressImage, NOTE_IMAGE } from '@/lib/image-compress'
import { useCaptionEditor } from './CaptionEditor'
import { MobileFormatBar } from './MobileFormatBar'
import { useWideScreen } from '@/hooks/useWideScreen'
import { useCaretNearTop } from './caret-scroll'
import { cleanCopiedText } from './clipboard'
import { indentSelectedFile, nestImagesAddedInLists } from './list-images'
import { registerFlush } from '@/lib/pending-saves'
import { AddCoverButton, CoverBanner } from './CoverBanner'
import { noteLinkItems } from './note-link-items'
import { NoteBacklinks } from './NoteLinks'
import { NoteOutline, OutlineButton } from './NoteOutline'
import { outlineOf, type OutlineItem } from '@/lib/outline'
import { editorSchema } from './schema'
import { arrowsExtension } from './arrows'
import { emptyLinesExtension } from './empty-lines'
import { NoteTags } from '@/components/note/NoteTags'
import type { Note, StoredBlock } from '@/db/schema'

const SAVE_DELAY = 400

/** Stores files inline as data URLs, since there is no server to upload to. Images are compressed first. */
async function uploadFile(file: File): Promise<string> {
  return blobToDataUrl(await compressImage(file, NOTE_IMAGE))
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
    uploadFile,
    extensions: [arrowsExtension, emptyLinesExtension],
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

  /**
   * BlockNote only takes files dropped onto the text itself. Images dropped elsewhere on the page (the empty
   * space below a short note, the title, the margins) go at the top when dropped above the text, otherwise
   * at the end. In a board card the board takes such drops instead (as image items).
   */
  const dropImages = (e: React.DragEvent) => {
    // Already handled: by BlockNote (on the text) or the cover
    if (e.nativeEvent.defaultPrevented) return
    const files = [...e.dataTransfer.files].filter(isImageFile)
    if (!files.length) return
    e.preventDefault()
    const atStart = e.clientY < (editor.domElement?.getBoundingClientRect().top ?? 0)
    const blocks = editor.document
    let ref = atStart ? blocks[0] : blocks[blocks.length - 1]
    let placement: 'before' | 'after' = atStart ? 'before' : 'after'
    for (const file of files) {
      const image = { type: 'image' as const, props: { name: file.name } }
      // An empty line is replaced instead of being left next to the image
      const empty = Array.isArray(ref.content) && ref.content.length === 0
      const block = empty ? editor.updateBlock(ref, image) : editor.insertBlocks([image], ref, placement)[0]
      ref = block
      placement = 'after'
      editor
        .uploadFile!(file, block.id)
        .then((url) => editor.updateBlock(block.id, { props: { url: url as string } }))
        .catch(() => editor.removeBlocks([block.id]))
    }
  }

  const pageRef = useRef<HTMLDivElement>(null)
  useCaretNearTop(pageRef, !embedded)

  useEffect(() => nestImagesAddedInLists(editor), [editor])
  const caption = useCaptionEditor(editor)
  // Phones get a fixed format bar at the bottom instead of the toolbar floating over the selection
  const wide = useWideScreen()
  const formatBar = !embedded && !wide && isTouchDevice()

  return (
    <div
      ref={pageRef}
      className={
        embedded
          ? 'bn-embedded relative w-full pt-2 pb-4'
          : // On phones a cover can scroll out of view even on a short note, so the cursor can reach the top
            'relative mx-auto min-h-full w-full max-w-(--page-width) px-1 pt-10 pb-32 sm:px-12 max-md:has-[[data-testid=note-cover]]:min-h-[calc(100%+18rem)]'
      }
      onDoubleClick={caption.onDoubleClick}
      // After BlockNote has filled the clipboard: no base64 images in the plain-text copy
      onCopy={(e) => cleanCopiedText(e.nativeEvent)}
      onCut={(e) => cleanCopiedText(e.nativeEvent)}
      onKeyDownCapture={(e) => indentSelectedFile(editor, e.nativeEvent)}
      onDragOver={
        embedded
          ? undefined
          : (e) => {
              if (!e.dataTransfer.types.includes('Files')) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }
      }
      onDrop={embedded ? undefined : dropImages}
    >
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
        {!embedded && <PageInfo note={note} title={title} outline={outline} />}
        {!embedded && <NoteTags note={note} />}
      </div>
      <BlockNoteView
        editor={editor}
        sideMenu={!embedded}
        formattingToolbar={!formatBar}
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
        {formatBar && <MobileFormatBar />}
      </BlockNoteView>
      {caption.field}
      {!embedded && <NoteBacklinks noteId={note.id} />}
      {!embedded && <NoteOutline items={outline} />}
    </div>
  )
}

/** A quiet line under the title: when it was edited and how long it is; for a brand-new empty note, that it isn't kept. */
function PageInfo({ note, title, outline }: { note: Note; title: string; outline: OutlineItem[] }) {
  const empty = !title.trim() && note.content.length === 0
  return (
    <div className="-mt-3 mb-3 flex items-center gap-2 px-(--page-gutter) text-xs text-muted-foreground" data-page-info>
      <p>
        {empty && note.updatedAt === note.createdAt && isFreshNote(note.id) ? (
          "Empty notes aren't kept when you leave them."
        ) : (
          <>
            <span title={formatDateTime(note.updatedAt)}>Edited {formatRelative(note.updatedAt)}</span> ·{' '}
            {plural(noteWordCount(note), 'word')}
          </>
        )}
      </p>
      <OutlineButton items={outline} />
    </div>
  )
}
