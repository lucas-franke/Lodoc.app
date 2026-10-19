import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { Notifications } from '@/components/Notifications'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.tsx'
import { applySavedAppearance } from '@/hooks/useAppearance'
import { purgeOldTrash } from '@/db/trash'
import { purgeOldActivity } from '@/db/activity'
import { discardLeftoverNotes } from '@/db/notes'
import { startAutoBackup } from '@/lib/auto-backup'
import { shrinkNoteImages } from '@/lib/shrink-note-images'
import { followThemeColor } from '@/lib/theme-color'
import { collectShared, markArrived, takeSharedFromUrl } from '@/lib/collect'
import { openTodaysJournal, takeJournalFromUrl } from '@/lib/journal'
import { notify } from '@/lib/notify'

// Appearance settings (font, corners, …) are applied before the first render, so nothing jumps
applySavedAppearance()
// The phone's status bar matches the page background (tint, dark mode)
followThemeColor()
// Deleted items older than the trash period are removed for good
void purgeOldTrash()
// Activity keeps the last 90 days
void purgeOldActivity()
// Empty notes an earlier session ended on (a reload, a closed app) aren't kept
const openNoteId = /^#\/note\/([^/]+)/.exec(location.hash)?.[1]
void discardLeftoverNotes(openNoteId ? decodeURIComponent(openNoteId) : null)
// Automatic backups into a folder, if the user set them up
void startAutoBackup()
// Images added to notes before uploads were compressed are shrunk once, in the background
void shrinkNoteImages()

// Works offline once loaded (and can be installed as an app); only in the built app, not during development
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js'))
}

// A file dropped where nothing takes it would make the browser open it in place of the app: ignore it instead
const isFileDrag = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')
window.addEventListener('dragover', (e) => {
  if (!isFileDrag(e) || e.defaultPrevented) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'none'
})
window.addEventListener('drop', (e) => {
  if (isFileDrag(e)) e.preventDefault()
})

// Ask the browser not to evict IndexedDB under storage pressure
void navigator.storage?.persist?.()

const render = () =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider delayDuration={400}>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
          {/* Toasts stay until dismissed (each has a close button); bottom-center keeps them clear of the board's + button and zoom bar */}
          <Notifications />
        </TooltipProvider>
      </ThemeProvider>
    </StrictMode>,
  )

// Opened from another app's share sheet: the shared text or link goes into the collect note first, which then opens
const shared = takeSharedFromUrl()
if (shared) {
  void collectShared(shared)
    .then(({ noteId, title, created, added }) => {
      location.hash = `#/note/${encodeURIComponent(noteId)}`
      if (added) markArrived(noteId)
      render()
      if (!added) notify('Nothing to add: the share had no text or link')
      else if (created) notify(`Things you share to Lodoc are collected in "${title}". To collect in another note, choose "Collect here" in its menu.`, { level: 'success' })
      else notify(`Added to "${title}"`, { level: 'success' })
    })
    .catch(() => {
      render()
      notify('Could not add what was shared', { level: 'error' })
    })
} else if (takeJournalFromUrl()) {
  // The app icon's "Today's journal" shortcut
  void openTodaysJournal()
    .then((id) => (location.hash = `#/note/${encodeURIComponent(id)}`))
    .finally(render)
} else {
  render()
}
