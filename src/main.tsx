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
import { startAutoBackup } from '@/lib/auto-backup'
import { shrinkNoteImages } from '@/lib/shrink-note-images'

// Appearance settings (font, corners, …) are applied before the first render, so nothing jumps
applySavedAppearance()
// Deleted items older than the trash period are removed for good
void purgeOldTrash()
// Activity keeps the last 90 days
void purgeOldActivity()
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
