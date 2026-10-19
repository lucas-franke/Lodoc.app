import { toast, useSonner } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

/**
 * The app's notifications (shown with `notify`). They close by themselves, except errors and the first-run
 * hint, and everything stays readable in Activity. When several are showing, a small "Clear all" button sits
 * just below the stack (which moves up to make room), never covering the newest one.
 */
export function Notifications() {
  const { toasts } = useSonner()
  const many = toasts.length >= 2
  return (
    <>
      <Toaster position="bottom-center" closeButton offset={{ bottom: many ? 60 : 24 }} mobileOffset={{ bottom: `calc(${many ? 52 : 16}px + env(safe-area-inset-bottom))` }} />
      {many && (
        <button
          type="button"
          onClick={() => toast.dismiss()}
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-[999999999] -translate-x-1/2 rounded-full border bg-popover px-3 py-1 text-xs text-popover-foreground shadow-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 max-sm:bottom-3"
        >
          Clear all ({toasts.length})
        </button>
      )}
    </>
  )
}
