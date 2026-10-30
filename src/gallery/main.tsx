import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { Notifications } from '@/components/Notifications'
import { TooltipProvider } from '@/components/ui/tooltip'
import '@/index.css'
import './gallery.css'
import { applySavedAppearance } from '@/hooks/useAppearance'
import { setAssetSource } from '@/hooks/useAssetUrl'
import { Gallery } from './Gallery'
import { samplePicture } from './samples'

// The components page (/components/): the app's own parts and stylesheet on sample content in memory. No database:
// images come from the sample pictures, and nothing is saved except the look chosen under Appearance (the same
// setting as in the app). light or dark is the app's own setting too (next-themes' default key).
applySavedAppearance()
setAssetSource(samplePicture)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={400}>
        <ConfirmProvider>
          <Gallery />
        </ConfirmProvider>
        <Notifications />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)
