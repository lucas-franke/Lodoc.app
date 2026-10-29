import './demo-database'
import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { AppDnd } from '@/components/dnd/AppDnd'
import { Notifications } from '@/components/Notifications'
import { TooltipProvider } from '@/components/ui/tooltip'
import '@/index.css'
import './gallery.css'
import { applySavedAppearance } from '@/hooks/useAppearance'
import { Gallery } from './Gallery'
import { seedDemo } from './seed'

// The components page (/components/): the app's real components with its own stylesheet, on fresh demo data. It
// starts in the look saved in the app; the look it is switched to here isn't kept (previewAppearance), and light or
// dark is remembered under a key of its own.
applySavedAppearance()

void seedDemo().then((demo) =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="lodoc-gallery-theme">
        <TooltipProvider delayDuration={400}>
          <ConfirmProvider>
            {/* Cards can be dragged (onto a folder card, or the board) like in the app */}
            <AppDnd>
              <Gallery demo={demo} />
            </AppDnd>
          </ConfirmProvider>
          <Notifications />
        </TooltipProvider>
      </ThemeProvider>
    </StrictMode>,
  ),
)
