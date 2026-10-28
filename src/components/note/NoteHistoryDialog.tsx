import type { PartialBlock } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import { useLiveQuery } from 'dexie-react-hooks'
import { History, RotateCcw } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { editorSchema } from '@/components/editor/schema'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { db } from '@/db/db'
import { noteTitle, noteWordCount } from '@/db/notes'
import type { Note, NoteVersion } from '@/db/schema'
import { listVersions, loadVersion, restoreVersion } from '@/db/versions'
import { formatDateTime, formatRelative, plural } from '@/lib/format'
import { openNoteHistory } from '@/lib/note-history'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'

type Blocks = PartialBlock<typeof editorSchema.blockSchema, typeof editorSchema.inlineContentSchema, typeof editorSchema.styleSchema>[]

/** A note's earlier versions (db/versions.ts): pick one to see it, and put it back if you like. Loaded lazily. */
export default function NoteHistoryDialog({ noteId }: { noteId: string }) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId])
  const versions = useLiveQuery(() => listVersions(noteId), [noteId])
  const [picked, setPicked] = useState<string | null>(null)
  const selected = picked ?? versions?.[0]?.id ?? null
  const close = () => openNoteHistory(null)

  const restore = async () => {
    if (!selected) return
    const version = versions?.find((v) => v.id === selected)
    await restoreVersion(selected)
    close()
    notify(`Restored the version from ${version ? formatDateTime(version.at) : 'earlier'}`, {
      level: 'success',
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[min(44rem,calc(100dvh-2rem))] flex-col gap-4 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>History of “{note ? noteTitle(note) : '…'}”</DialogTitle>
          <DialogDescription>Earlier versions, kept for 90 days.</DialogDescription>
        </DialogHeader>
        {versions && versions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <History className="size-6" aria-hidden />
            No earlier versions yet. They appear once the note has been changed.
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[15rem_1fr]">
            <ul aria-label="Versions" className="flex min-h-0 gap-1 overflow-auto max-md:-mx-1 max-md:px-1 max-md:[scrollbar-width:none] md:flex-col">
              {versions?.map((v) => (
                <li key={v.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setPicked(v.id)}
                    aria-current={v.id === selected ? 'true' : undefined}
                    className={cn(
                      'w-full rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60',
                      v.id === selected && 'bg-accent font-medium',
                    )}
                  >
                    <span className="block whitespace-nowrap" title={formatDateTime(v.at)}>
                      {formatRelative(v.at)}
                    </span>
                    <span className="block text-xs font-normal whitespace-nowrap text-muted-foreground">
                      {formatDateTime(v.at).split(', ')[1]} · {plural(noteWordCount({ ...v } as unknown as Note), 'word')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="min-h-64 overflow-auto rounded-lg border bg-background" data-history-preview>
              {selected && <VersionPreview key={selected} id={selected} />}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Close
          </Button>
          <Button onClick={() => void restore()} disabled={!selected}>
            <RotateCcw /> Restore this version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** A version shown as the note looked then, read-only */
function VersionPreview({ id }: { id: string }) {
  const [version, setVersion] = useState<NoteVersion | null>(null)
  useEffect(() => {
    let current = true
    void loadVersion(id).then((v) => current && setVersion(v ?? null))
    return () => {
      current = false
    }
  }, [id])
  if (!version) return null
  return (
    <div className="py-4">
      <p className="mb-2 px-(--page-gutter) font-page text-2xl font-bold tracking-tight">{version.title || 'Untitled'}</p>
      <ReadOnlyBlocks content={version.content as unknown as Blocks} />
    </div>
  )
}

function ReadOnlyBlocks({ content }: { content: Blocks }) {
  const { resolvedTheme } = useTheme()
  const editor = useCreateBlockNote({ schema: editorSchema, initialContent: content.length ? content : undefined })
  return (
    <BlockNoteView
      editor={editor}
      editable={false}
      sideMenu={false}
      formattingToolbar={false}
      slashMenu={false}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
    />
  )
}
