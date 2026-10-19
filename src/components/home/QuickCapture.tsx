import { CornerDownLeft } from 'lucide-react'
import { useRef, useState } from 'react'
import { createNote, updateNote } from '@/db/notes'
import { openNote } from '@/hooks/useRoute'
import { p } from '@/lib/blocks'
import { notify } from '@/lib/notify'

/**
 * A thought that has no home yet: typed here, Enter keeps it as a new note (in Unfiled) and the field is ready
 * for the next one, without leaving the overview. The first line becomes the title, further lines (Shift+Enter)
 * the text.
 */
export function QuickCapture() {
  const [text, setText] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)

  const save = async () => {
    const [first, ...rest] = text.trim().split('\n')
    if (!first) return
    setText('')
    const id = await createNote(null)
    const body = rest.map((line) => line.trim())
    await updateNote(id, {
      title: first.trim(),
      content: body.some(Boolean) ? body.map((line) => p(line)) : [],
    })
    notify('Saved as a note in Unfiled', { level: 'success', action: { label: 'Open', onClick: () => openNote(id) } })
    field.current?.focus()
  }

  return (
    <form
      className="mt-6 flex items-start gap-2 rounded-xl border bg-card p-2 pl-4 focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/30"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <textarea
        ref={field}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            void save()
          }
          if (e.key === 'Escape') setText('')
        }}
        placeholder="Write something down…"
        aria-label="Quick note: Enter saves it as a new note"
        className="max-h-48 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-base outline-none placeholder:text-muted-foreground [field-sizing:content]"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        aria-label="Save as a new note"
        title="Save as a new note (Enter)"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40"
      >
        <CornerDownLeft className="size-4" />
      </button>
    </form>
  )
}
