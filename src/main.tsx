import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.tsx'
import { applySavedAppearance } from '@/hooks/useAppearance'

// Appearance settings (font, corners, …) are applied before the first render, so nothing jumps
applySavedAppearance()

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
        <Toaster position="bottom-center" closeButton duration={Infinity} />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)
