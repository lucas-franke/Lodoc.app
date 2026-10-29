import type { BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from '@blocknote/core'
import { SuggestionMenu } from '@blocknote/core/extensions'
import { useExtensionState } from '@blocknote/react'
import { useEffect, useLayoutEffect, type RefObject } from 'react'
import { WIDE_SCREEN } from '@/lib/appearance'

/** Where the cursor should sit, from the top of the visible part of the page */
const TOP_GAP = 24
/** Cursors in the upper part of what's visible are left where they are */
const UPPER_PART = 0.4
/** The room a "/", "@" or "#" menu wants beside the cursor: its first label and three rows, and the gaps around it */
const MENU_ROOM = 200

/** The cursor's position on screen: the caret in the text, or the focused field itself. */
function caretRect(): DOMRect | undefined {
  const active = document.activeElement
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return active.getBoundingClientRect()
  const selection = window.getSelection()
  if (!selection?.rangeCount) return undefined
  const rect = selection.getRangeAt(0).getBoundingClientRect()
  if (rect.height) return rect
  // A collapsed range in an empty line has no size: use the line instead
  const node = selection.focusNode
  return (node instanceof Element ? node : node?.parentElement)?.getBoundingClientRect()
}

/**
 * Scrolls `scroller` so the cursor is near the top of what's visible: the part of the page not covered by
 * the on-screen keyboard (the visual viewport), so it stays in view while typing.
 */
function bringCaretToTop(scroller: HTMLElement) {
  const caret = caretRect()
  if (!caret) return
  const box = scroller.getBoundingClientRect()
  const vv = window.visualViewport
  const top = Math.max(box.top, vv?.offsetTop ?? 0)
  const bottom = Math.min(box.bottom, vv ? vv.offsetTop + vv.height : window.innerHeight)
  const inUpperPart = caret.top >= top && caret.top <= top + (bottom - top) * UPPER_PART
  if (!inUpperPart) scroller.scrollBy({ top: caret.top - top - TOP_GAP })
}

/**
 * On phones the keyboard takes half the screen, and a cover pushes a new note's title down into it. While
 * the page has focus, the cursor is brought to the top: when a field is focused and when the keyboard
 * opens. Wider screens keep the browser's own behaviour.
 */
export function useCaretNearTop(page: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = page.current
    const scroller = el?.parentElement
    if (!enabled || !el || !scroller) return
    const narrow = () => !window.matchMedia(WIDE_SCREEN).matches
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (narrow() && el.contains(document.activeElement)) bringCaretToTop(scroller)
      })
    }
    el.addEventListener('focusin', update)
    // The keyboard opening (or closing) resizes the visual viewport
    window.visualViewport?.addEventListener('resize', update)
    // A new note opens with its title focused
    update()
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('focusin', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [page, enabled])
}

/**
 * On a phone with the keyboard up, a cursor halfway down leaves a suggestion menu little room either below or above
 * it (the format bar takes the bottom). When one opens there, the cursor is brought to the top first, so the list
 * gets the room under it.
 */
export function useRoomForMenus<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(
  editor: BlockNoteEditor<B, I, S>,
  page: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const open = useExtensionState(SuggestionMenu, { editor, selector: (state) => Boolean(state?.show) })
  useLayoutEffect(() => {
    const scroller = page.current?.parentElement
    if (!open || !enabled || !scroller || window.matchMedia(WIDE_SCREEN).matches) return
    const caret = caretRect()
    if (!caret) return
    const box = scroller.getBoundingClientRect()
    const vv = window.visualViewport
    const bar = document.querySelector('.note-format-bar')?.getBoundingClientRect()
    const top = Math.max(box.top, vv?.offsetTop ?? 0)
    const bottom = Math.min(box.bottom, bar?.top ?? Infinity, vv ? vv.offsetTop + vv.height : window.innerHeight)
    if (Math.max(caret.top - top, bottom - caret.bottom) < MENU_ROOM) scroller.scrollBy({ top: caret.top - top - TOP_GAP })
  }, [open, enabled, page])
}
