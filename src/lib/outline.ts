// The headings of a note, for its outline (NoteOutline)

type Block = { id: string; type: string; props?: { level?: number }; content?: unknown; children?: Block[] }
export type OutlineItem = { id: string; level: number; text: string }

/** The note's headings in order (nested ones too), for the outline */
export function outlineOf(blocks: Block[]): OutlineItem[] {
  const out: OutlineItem[] = []
  const walk = (list: Block[]) => {
    for (const b of list) {
      if (b.type === 'heading') {
        const text = Array.isArray(b.content)
          ? (b.content as { text?: string }[]).map((c) => c.text ?? '').join('')
          : ''
        if (text.trim()) out.push({ id: b.id, level: b.props?.level ?? 1, text: text.trim() })
      }
      if (b.children?.length) walk(b.children)
    }
  }
  walk(blocks)
  return out
}

/** Only notes with this many headings get an outline; shorter ones don't need it */
export const OUTLINE_MIN = 3
