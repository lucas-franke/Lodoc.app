import { BookOpen, PenLine, Upload, type LucideIcon } from 'lucide-react'
import { createNote } from '@/db/notes'
import { useImportFile } from '@/hooks/useImportFile'
import { openNote } from '@/hooks/useRoute'
import { emitAppEvent } from '@/lib/app-events'
import { openGuideNote } from '@/lib/guide'
import { cn } from '@/lib/utils'

/** The overview before there is anything in it: what Lodoc is, and three ways to start. */
export function Welcome() {
  const importFile = useImportFile()
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-6 py-12" data-welcome>
      <h1 className="font-page text-4xl font-bold tracking-tight text-balance">Welcome to Lodoc</h1>
      <p className="mt-3 max-w-prose text-muted-foreground">
        Notes, boards and images, kept right here in this browser. No account needed, and it works offline.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <StartCard
          primary
          icon={PenLine}
          title="Start writing"
          text="A blank note, ready to type"
          onClick={async () => openNote(await createNote())}
        />
        <StartCard
          icon={BookOpen}
          title="Take the tour"
          text="A short guide to try things out in"
          onClick={async () => openNote(await openGuideNote())}
        />
        <StartCard icon={Upload} title="Restore a backup" text="Import a Lodoc export (.json)" onClick={importFile.pick} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Coming from another app?{' '}
        <button
          type="button"
          onClick={() => emitAppEvent('import-markdown-files')}
          className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          Import Markdown files
        </button>
      </p>
      <p className="mt-8 text-xs text-muted-foreground">
        <span className="pointer-coarse:hidden">
          <kbd className="font-sans">Ctrl</kbd> + <kbd className="font-sans">Alt</kbd> + <kbd className="font-sans">N</kbd> new
          note · <kbd className="font-sans">Ctrl</kbd> + <kbd className="font-sans">K</kbd> search and commands ·{' '}
        </span>
        Type <kbd className="font-sans">/</kbd> in a note for headings, lists, images and more
      </p>
      {importFile.element}
    </div>
  )
}

function StartCard({
  icon: Icon,
  title,
  text,
  onClick,
  primary = false,
}: {
  icon: LucideIcon
  title: string
  text: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 sm:flex-col sm:gap-6',
        primary
          ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-card hover:border-ring/60 hover:bg-accent/40',
      )}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', !primary && 'text-muted-foreground')} />
      <span>
        <span className="block font-medium">{title}</span>
        <span className={cn('mt-0.5 block text-sm', primary ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
          {text}
        </span>
      </span>
    </button>
  )
}
