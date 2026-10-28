import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { keyLabel } from '@/lib/keyboard'
import { SHORTCUT_GROUPS } from '@/lib/shortcuts'

/** All keyboard shortcuts in one place (opened with "?" or from the command palette). */
export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-5 overflow-y-auto">
          {SHORTCUT_GROUPS.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">{g.title}</h3>
              <dl className="space-y-1.5">
                {g.items.map(([keys, what]) => (
                  <div key={what} className="flex items-center justify-between gap-4 text-sm">
                    <dt>{what}</dt>
                    <dd className="flex shrink-0 gap-1">
                      {keys.map((k) => (
                        <kbd key={k} className="min-w-6 rounded border bg-muted px-1.5 py-0.5 text-center font-sans text-xs">
                          {keyLabel(k)}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
