import { useEffect, type RefObject } from 'react'
import { burst, playOnce } from '@/lib/joy'

// Ticking a checklist item: the box pops. Ticking the last open item of a list (two items or more): a few
// dots drift up from it as well.

const isCheckbox = (el: EventTarget | null): el is HTMLInputElement =>
  el instanceof HTMLInputElement && el.type === 'checkbox' && !!el.closest('.bn-editor')

/** The checklist items next to this one, without gaps (the list it belongs to), itself included */
function listOf(input: HTMLInputElement): HTMLElement[] {
  const outer = input.closest('.bn-block-outer')
  if (!outer?.parentElement) return []
  const isItem = (el: Element | null) => !!el?.querySelector(':scope > .bn-block > .bn-block-content[data-content-type="checkListItem"]')
  const items: Element[] = [outer]
  for (let el = outer.previousElementSibling; isItem(el); el = el!.previousElementSibling) items.unshift(el!)
  for (let el = outer.nextElementSibling; isItem(el); el = el!.nextElementSibling) items.push(el!)
  return items.map((el) => el.querySelector<HTMLElement>(':scope > .bn-block > .bn-block-content')!)
}

export function useChecklistJoy(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const onChange = (e: Event) => {
      const input = e.target
      if (!isCheckbox(input) || !input.checked) return
      playOnce(input, 'joy-pop')
      const list = listOf(input)
      const own = input.closest('.bn-block-content')
      // The editor marks the item as checked after this event, so this one counts as done already
      const allDone = list.length >= 2 && list.every((item) => item === own || item.dataset.checked === 'true')
      if (allDone) {
        const r = input.getBoundingClientRect()
        burst(r.left + r.width / 2, r.top + r.height / 2)
      }
    }
    el.addEventListener('change', onChange, true)
    return () => el.removeEventListener('change', onChange, true)
  }, [root])
}
