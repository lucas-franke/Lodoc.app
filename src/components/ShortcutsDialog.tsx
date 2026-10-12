import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const GROUPS: { title: string; items: [keys: string[], what: string][] }[] = [
  {
    title: 'Everywhere',
    items: [
      [['Ctrl', 'K'], 'Search and commands'],
      [['Ctrl', 'Alt', 'N'], 'New note in the folder you are in'],
      [['Ctrl', '\\'], 'Show or hide the sidebar'],
      [['?'], 'This list'],
    ],
  },
  {
    title: 'In a note',
    items: [
      [['/'], 'Insert a block (heading, list, table, image…)'],
      [['#', 'Space'], 'Heading (## and ### for smaller ones)'],
      [['-', 'Space'], 'Bulleted list'],
      [['[]', 'Space'], 'Checklist'],
      [['Ctrl', 'K'], 'Link (with text selected)'],
    ],
  },
  {
    title: 'On a board',
    items: [
      [['Ctrl', 'V'], 'Paste an image'],
      [['Delete'], 'Remove the selected items (notes are kept)'],
      [['Esc'], 'Finish editing a card'],
      [['Double-click'], 'Edit a card in place'],
    ],
  },
]

/** All keyboard shortcuts in one place (opened with "?" or from the command palette). */
export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>On a Mac, use ⌘ instead of Ctrl.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-5 overflow-y-auto">
          {GROUPS.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">{g.title}</h3>
              <dl className="space-y-1.5">
                {g.items.map(([keys, what]) => (
                  <div key={what} className="flex items-center justify-between gap-4 text-sm">
                    <dt>{what}</dt>
                    <dd className="flex shrink-0 gap-1">
                      {keys.map((k) => (
                        <kbd key={k} className="min-w-6 rounded border bg-muted px-1.5 py-0.5 text-center font-sans text-xs">
                          {k}
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
