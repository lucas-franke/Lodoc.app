import type { BlockNoteEditor } from '@blocknote/core'
import { useRef, useState, type CSSProperties, type MouseEvent } from 'react'

type Editor = BlockNoteEditor<any, any, any> // eslint-disable-line @typescript-eslint/no-explicit-any

type Editing = { blockId: string; initial: string; style: CSSProperties }

/**
 * Double-click an image caption to edit it in place (or an image without one to add a caption), instead of
 * going through the image toolbar's "Edit caption" popover. The field is laid over the caption, outside the
 * editor's own DOM, so the editor doesn't handle its keys. Put `onDoubleClick` on a positioned element
 * around the editor and render `field` inside it.
 */
export function useCaptionEditor(editor: Editor) {
  const [editing, setEditing] = useState<Editing | null>(null)

  const onDoubleClick = (e: MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    const fileBlock = target.closest<HTMLElement>('[data-file-block]')
    const blockEl = fileBlock?.closest<HTMLElement>('[data-id]')
    if (!fileBlock || !blockEl || !editor.isEditable) return
    const caption = target.closest<HTMLElement>('.bn-file-caption')
    // On the image itself, only to add a caption that isn't there yet
    const media = !caption && !fileBlock.querySelector('.bn-file-caption') ? target.closest('img, video') : null
    if (!caption && !media) return
    const block = editor.getBlock(blockEl.dataset.id!)
    if (!block || typeof block.props?.caption !== 'string') return

    e.preventDefault()
    const page = e.currentTarget.getBoundingClientRect()
    const anchor = (caption ?? media!).getBoundingClientRect()
    const width = Math.max(anchor.width, 160)
    setEditing({
      blockId: block.id,
      initial: block.props.caption,
      style: {
        top: (caption ? anchor.top : anchor.bottom + 4) - page.top,
        left: anchor.left - page.left + (anchor.width - width) / 2,
        width,
        fontSize: caption ? getComputedStyle(caption).fontSize : undefined,
        textAlign: caption ? (getComputedStyle(caption).textAlign as CSSProperties['textAlign']) : 'center',
      },
    })
  }

  const field = editing && (
    <CaptionField
      key={editing.blockId}
      editing={editing}
      onDone={(caption) => {
        if (caption !== null && editor.getBlock(editing.blockId)) {
          editor.updateBlock(editing.blockId, { props: { caption } })
        }
        setEditing(null)
      }}
    />
  )
  return { onDoubleClick, field }
}

function CaptionField({ editing, onDone }: { editing: Editing; onDone: (caption: string | null) => void }) {
  const [value, setValue] = useState(editing.initial)
  const done = useRef(false)
  const finish = (caption: string | null) => {
    if (done.current) return
    done.current = true
    onDone(caption === null ? null : caption.trim())
  }
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(value)
        if (e.key === 'Escape') finish(null)
      }}
      placeholder="Add a caption"
      aria-label="Caption"
      style={editing.style}
      className="absolute z-10 rounded-sm bg-background px-1 py-1 font-page text-[0.8em] outline-none ring-2 ring-ring/50 md:text-[14px]"
    />
  )
}
