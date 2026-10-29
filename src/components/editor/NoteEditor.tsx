import { isTouchDevice, type PartialBlock } from '@blocknote/core'
import { FormattingToolbar, FormattingToolbarController, SuggestionMenuController, useCreateBlockNote, useDictionary } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import { en } from '@blocknote/core/locales'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isImageFile } from '@/db/assets'
import { addNoteTag, isFreshNote, noteWordCount, removeNoteTag, updateNote } from '@/db/notes'
import { formatDateTime, formatRelative, plural } from '@/lib/format'
import { blobToDataUrl, compressImage, NOTE_IMAGE } from '@/lib/image-compress'
import { useCaptionEditor } from './CaptionEditor'
import { MobileFormatBar } from './MobileFormatBar'
import { useCaretNearTop, useRoomForMenus } from './caret-scroll'
import { useChecklistJoy } from './checklist-joy'
import { takeArrived } from '@/lib/collect'
import { onNoteRestored } from '@/db/versions'
import { playOnce } from '@/lib/joy'
import { cleanCopiedText } from './clipboard'
import { indentSelectedFile, nestImagesAddedInLists } from './list-images'
import { registerFlush } from '@/lib/pending-saves'
import { blockTypeItems } from './Callout'
import { AddCoverButton, CoverBanner } from './CoverBanner'
import { noteLinkItems } from './note-link-items'
import { NoteBacklinks } from './NoteLinks'
import { NoteOutline, OutlineButton } from './NoteOutline'
import { outlineOf, type OutlineItem } from '@/lib/outline'
import { editorSchema } from './schema'
import { arrowsExtension } from './arrows'
import { emptyLinesExtension } from './empty-lines'
import { templateHintsExtension } from './template-hints'
import { inlineTags, inlineTagsExtension, tagMenuItems, tagMenuShouldOpen } from './inline-tags'
import { slashItems } from './slash-items'
import { ABOVE_FORMAT_BAR } from './touch-menus'
import { useWideScreen } from '@/hooks/useWideScreen'
import { NoteTags } from '@/components/note/NoteTags'
import type { Note, StoredBlock } from '@/db/schema'
import { cn } from '@/lib/utils'

const SAVE_DELAY = 400

/** BlockNote's texts, with an empty checklist item saying "To-do" rather than "List" */
const dictionary = { ...en, placeholders: { ...en.placeholders, checkListItem: 'To-do' } }
/** The overview's note says what it is for while it is empty */
const padDictionary = { ...dictionary, placeholders: { ...dictionary.placeholders, emptyDocument: 'Something to keep in view: a plan, a list, a reminder…' } }

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
 * `pad` is the overview's own note: as compact, but without a title, and it waits to be clicked.
 */
export function NoteEditor({ note, embedded = false, pad = false }: { note: Note; embedded?: boolean; pad?: boolean }) {
  const compact = embedded || pad
  const { resolvedTheme } = useTheme()
  const [title, setTitle] = useState(note.title)
  // Browsers without `field-sizing: content` (Safari, Firefox) get the title's height set by hand
  const titleField = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const field = titleField.current
    if (!field || CSS.supports('field-sizing', 'content')) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }, [title])
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
    dictionary: pad ? padDictionary : dictionary,
    extensions: [arrowsExtension, emptyLinesExtension, templateHintsExtension, inlineTagsExtension],
    // Accessible name for the editable area (screen readers otherwise announce just "edit text")
    domAttributes: { editor: { 'aria-label': pad ? 'Scratchpad' : 'Note content' } },
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
  useCaretNearTop(pageRef, !compact)
  useChecklistJoy(pageRef)

  // #tags written in the text become the note's tags, and go when they are taken out (editor/inline-tags.ts).
  // Compared with the tags the text had before, so tags added in the tag field are left alone.
  const writtenTags = useRef<Set<string> | null>(null)
  useEffect(() => {
    writtenTags.current = inlineTags(editor.prosemirrorState)
  }, [editor])
  const syncWrittenTags = () => {
    const before = writtenTags.current
    if (!before) return
    const now = inlineTags(editor.prosemirrorState)
    for (const tag of now) if (!before.has(tag)) void addNoteTag(note.id, tag)
    for (const tag of before) if (!now.has(tag)) void removeNoteTag(note.id, tag)
    writtenTags.current = now
  }

  // An earlier version was put back (note history): the editor only reads the note when it opens, so it's told
  useEffect(
    () =>
      onNoteRestored(({ noteId, title: restoredTitle, content }) => {
        if (noteId !== note.id) return
        setTitle(restoredTitle)
        editor.replaceBlocks(editor.document, content.length ? (content as never) : [{ type: 'paragraph' }])
      }),
    [note.id, editor],
  )

  // Opened because something was shared into this note: the new line at the top drops in
  useEffect(() => {
    // Taken once (StrictMode runs effects twice), so the timer isn't cancelled by the cleanup in between
    if (!takeArrived(note.id)) return
    window.setTimeout(() => {
      const first = editor.domElement?.querySelector('.bn-block-group > .bn-block-outer')
      if (first) playOnce(first, 'joy-arrived')
    }, 120)
  }, [note.id, editor])

  useEffect(() => nestImagesAddedInLists(editor), [editor])
  const caption = useCaptionEditor(editor)
  // Touch screens (phones and tablets) get a fixed format bar at the bottom instead of the toolbar floating over
  // the selection, which a phone's own selection menu covers and which never offers Undo or a block type
  const formatBar = !compact && isTouchDevice()
  const wide = useWideScreen()
  useRoomForMenus(editor, pageRef, formatBar)

  return (
    <div
      ref={pageRef}
      className={
        compact
          ? cn('bn-embedded relative w-full', pad ? 'py-2' : 'pt-2 pb-4')
          : // On phones a cover can scroll out of view even on a short note, so the cursor can reach the top
            'relative mx-auto min-h-full w-full max-w-(--page-width) px-1 pt-10 pb-32 sm:px-12 narrow:has-[[data-testid=note-cover]]:min-h-[calc(100%+18rem)]'
      }
      onDoubleClick={caption.onDoubleClick}
      // After BlockNote has filled the clipboard: no base64 images in the plain-text copy
      onCopy={(e) => cleanCopiedText(e.nativeEvent)}
      onCut={(e) => cleanCopiedText(e.nativeEvent)}
      onKeyDownCapture={(e) => indentSelectedFile(editor, e.nativeEvent)}
      onDragOver={
        compact
          ? undefined
          : (e) => {
              if (!e.dataTransfer.types.includes('Files')) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }
      }
      onDrop={compact ? undefined : dropImages}
    >
      {!compact && <CoverBanner note={note} />}
      <div className={cn('group/title relative', pad && 'hidden')}>
        {!compact && <AddCoverButton note={note} />}
        {/* A textarea, so a long title wraps instead of being cut off; it stays one paragraph (no line breaks) */}
        <textarea
          ref={titleField}
          rows={1}
          value={title}
          onChange={(e) => {
            const value = e.target.value.replace(/\s*\n\s*/g, ' ')
            setTitle(value)
            save({ title: value })
          }}
          onKeyDown={(e) => {
            const field = e.currentTarget
            const atEnd = field.selectionStart === field.value.length
            if (e.key === 'Enter' || (e.key === 'ArrowDown' && atEnd)) {
              e.preventDefault()
              editor.setTextCursorPosition(editor.document[0], 'start')
              editor.focus()
            }
          }}
          placeholder="Untitled"
          aria-label="Note title"
          autoFocus={!note.title}
          className={cn(
            'block w-full resize-none overflow-hidden bg-transparent font-page tracking-tight text-balance outline-none placeholder:text-muted-foreground [field-sizing:content]',
            embedded ? 'mb-1 px-3 text-lg font-semibold' : 'mb-4 px-(--page-gutter) text-4xl leading-tight font-bold max-sm:text-3xl',
          )}
        />
        {!compact && <PageInfo note={note} title={title} outline={outline} />}
        {!compact && <NoteTags note={note} />}
      </div>
      <BlockNoteView
        editor={editor}
        sideMenu={!compact}
        // Our own toolbar below (its block type menu has callouts), or the format bar on touch screens
        formattingToolbar={false}
        // "/" is our own menu below, with callouts (slash-items.tsx)
        slashMenu={false}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        onChange={() => {
          save({ content: editor.document as unknown as StoredBlock[] })
          if (!compact) updateOutline()
          syncWrittenTags()
        }}
        // A tag counts once the caret leaves it, so moving away (without typing) also adds it
        onSelectionChange={syncWrittenTags}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          floatingUIOptions={formatBar ? ABOVE_FORMAT_BAR : undefined}
          getItems={async (query) => slashItems(editor, query, formatBar && !wide)}
        />
        {/* "@" links to another note (or creates one with the typed name) */}
        <SuggestionMenuController
          triggerCharacter="@"
          floatingUIOptions={formatBar ? ABOVE_FORMAT_BAR : undefined}
          getItems={(query) =>
            noteLinkItems(query, note.id, (noteId, linkTitle) =>
              editor.insertInlineContent([{ type: 'noteLink', props: { noteId, title: linkTitle } }, ' ']),
            )
          }
        />
        {/* "#" after a space: the tags already in use (or a new one) */}
        <SuggestionMenuController
          triggerCharacter="#"
          shouldOpen={tagMenuShouldOpen}
          floatingUIOptions={formatBar ? ABOVE_FORMAT_BAR : undefined}
          getItems={(query) => tagMenuItems(query, (tag) => editor.insertInlineContent(['#' + tag + ' ']))}
        />
        {formatBar ? <MobileFormatBar /> : <FormattingToolbarController formattingToolbar={NoteToolbar} />}
      </BlockNoteView>
      {caption.field}
      {!compact && <NoteBacklinks noteId={note.id} />}
      {!compact && <NoteOutline items={outline} />}
    </div>
  )
}

/** BlockNote's toolbar over selected text, with callouts in its block type menu */
function NoteToolbar() {
  return <FormattingToolbar blockTypeSelectItems={blockTypeItems(useDictionary())} />
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
            {/* Edits here change what new notes from it start with */}
            {note.template && <span title="New notes from this template start as a copy of it">Template · </span>}
            <span title={formatDateTime(note.updatedAt)}>Edited {formatRelative(note.updatedAt)}</span> ·{' '}
            {plural(noteWordCount(note), 'word')}
          </>
        )}
      </p>
      <OutlineButton items={outline} />
    </div>
  )
}
