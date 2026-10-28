import { toast, useSonner } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

/**
 * The app's notifications (shown with `notify`). They close by themselves, except errors, and everything stays
 * readable in Activity. In the bottom-right corner, beside the page rather than over the text (phones: full
 * width at the bottom, sonner's own layout below 600px). When several are showing, a small "Clear all" button sits
 * just below the stack (which moves up to make room), never covering the newest one: centred under it, at the
 * 24px offset plus half the 356px toast width. All of it stays above what a page fixes to the bottom of the
 * screen (`useBottomUi`).
 */
export function Notifications() {
  const { toasts } = useSonner()
  const many = toasts.length >= 2
  return (
    <>
      <Toaster
        position="bottom-right"
        closeButton
        offset={{ bottom: `calc(${many ? 60 : 24}px + var(--toast-lift, 0px))` }}
        mobileOffset={{ bottom: `calc(${many ? 52 : 16}px + var(--toast-lift, 0px) + env(safe-area-inset-bottom))` }}
      />
      {many && (
        <button
          type="button"
          onClick={() => toast.dismiss()}
          className="fixed bottom-[calc(1rem+var(--toast-lift,0px)+env(safe-area-inset-bottom))] left-1/2 z-[999999999] -translate-x-1/2 min-[600px]:right-[202px] min-[600px]:left-auto min-[600px]:translate-x-1/2 rounded-full border bg-popover px-3 py-1 text-xs text-popover-foreground shadow-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 max-sm:bottom-[calc(0.75rem+var(--toast-lift,0px))]"
        >
          Clear all ({toasts.length})
        </button>
      )}
    </>
  )
}
