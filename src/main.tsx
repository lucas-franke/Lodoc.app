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
import { startAutoBackup } from '@/lib/auto-backup'

// Appearance settings (font, corners, …) are applied before the first render, so nothing jumps
applySavedAppearance()
// Deleted items older than the trash period are removed for good
void purgeOldTrash()
// Automatic backups into a folder, if the user set them up
void startAutoBackup()

// Works offline once loaded (and can be installed as an app); only in the built app, not during development
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js'))
}

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
