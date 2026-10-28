import { useEffect } from 'react'
import { leavePage, type ReturnSection } from '@/hooks/useRoute'

/** Escape belongs to whatever is open on top (a menu, a dialog, a tooltip) or to the field being typed in */
const escapeTaken = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement | null
  return (
    e.defaultPrevented ||
    !!target?.closest('input, textarea, select, [contenteditable="true"]') ||
    !!document.querySelector('[role=dialog], [role=alertdialog], [role=menu], [role=listbox], [role=tooltip]')
  )
}

/** Escape on Settings or Activity goes back to the page it was opened from (like its "Back to …" link) */
export function useEscapeToLeave(section: ReturnSection) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || escapeTaken(e)) return
      e.preventDefault()
      leavePage(section)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [section])
}
