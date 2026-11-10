import { useLiveQuery } from 'dexie-react-hooks'
import { useTheme } from 'next-themes'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDateTime, plural } from '@/lib/format'
import {
  countParts,
  currentContents,
  describeCounts,
  describeProject,
  importProject,
  joinList,
  undoReplace,
  type ImportMode,
  type ProjectFile,
} from '@/lib/project-file'
import { openNote } from '@/hooks/useRoute'
import { getAppearance, replaceAppearance } from '@/hooks/useAppearance'
import { useConfirm } from '@/hooks/useConfirm'

/**
 * Brings a backup in and says so. Replace takes the file's look too and its message offers Undo, which puts back
 * everything the replace removed (and the look); it stays until closed. `fresh`: Lodoc held nothing, so there is
 * nothing to undo. A merge (bringing notes over from another device) keeps this device's look; files from before
 * settings were saved keep the current look either way.
 */
export function useRunImport() {
  const { theme, setTheme } = useTheme()
  return async (project: ProjectFile, mode: ImportMode, { fresh = false } = {}) => {
    const what = describeProject(project)
    const before = { theme, appearance: getAppearance() }
    try {
      const replaced = await importProject(project, mode)
      if (mode === 'merge' || !replaced) {
        notify(`Imported ${what} from a backup`, { level: 'success', logged: true })
        return true
      }
      const { settings } = project
      if (settings?.appearance) replaceAppearance(settings.appearance)
      if (settings?.theme) setTheme(settings.theme)
      openNote(null)
      if (fresh) {
        notify(`Imported ${what} from a backup`, { level: 'success', logged: true })
        return true
      }
      // Earlier messages offer Undo for things that are gone now
      toast.dismiss()
      notify(`Replaced everything with ${what} from a backup`, {
        level: 'success',
        logged: true,
        stay: true,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await undoReplace(replaced)
              replaceAppearance(before.appearance)
              if (before.theme) setTheme(before.theme)
              notify('Everything is back as it was before the replace', { level: 'success', logged: true })
            } catch (error) {
              notify(`Undo failed: ${error instanceof Error ? error.message : String(error)}`, { level: 'error' })
            }
          },
        },
      })
      return true
    } catch (error) {
      notify(`Import failed: ${error instanceof Error ? error.message : String(error)}`, { level: 'error' })
      return false
    }
  }
}

/**
 * Asks how to bring a backup file in, with what the file holds and what Lodoc holds now side by side. Merge is the
 * safe choice and has the focus; "Replace all…" asks once more, naming what will be deleted.
 */
export function ImportDialog({ project, onClose }: { project: ProjectFile | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const runImport = useRunImport()
  const confirm = useConfirm()
  const merge = useRef<HTMLButtonElement>(null)
  const current = useLiveQuery(() => (project ? currentContents() : undefined), [project])
  const takesLook = !!(project?.settings?.appearance || project?.settings?.theme)

  const run = async (mode: ImportMode) => {
    if (!project) return
    setBusy(true)
    const done = await runImport(project, mode)
    setBusy(false)
    if (done) onClose()
  }

  const askReplace = () => {
    if (!project || !current) return
    const lost = joinList([
      ...countParts(current),
      ...(current.scratchpad ? ['the Scratchpad'] : []),
      ...(current.trash ? [`${plural(current.trash, 'item')} in the Trash`] : []),
    ])
    confirm({
      title: 'Replace everything?',
      description: `${lost.charAt(0).toUpperCase() + lost.slice(1)} will be deleted and replaced with ${describeProject(project)} from the file.${takesLook ? " The file's look (theme, colors, fonts) is taken over too." : ''}`,
      action: 'Replace everything',
      cancel: 'Back',
      onConfirm: () => void run('replace'),
    })
  }

  return (
    <Dialog open={project !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent
        // The button that loses nothing gets the focus (it would land on the first one, "Replace all…")
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          merge.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Import backup</DialogTitle>
          <DialogDescription className="sr-only">Choose how to bring the backup file in</DialogDescription>
        </DialogHeader>
        {project && (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] rounded-lg border text-sm" data-import-facts>
            <dt className="px-3 py-2 text-muted-foreground">In the file</dt>
            <dd className="px-3 py-2">
              {describeProject(project)}
              <span className="block text-xs text-muted-foreground">Exported {formatDateTime(project.exportedAt)}</span>
            </dd>
            <dt className="border-t px-3 py-2 text-muted-foreground">In Lodoc now</dt>
            <dd className="border-t px-3 py-2">{current ? describeCounts(current) : '…'}</dd>
          </dl>
        )}
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Merge</span> adds the file to what you have. Where a note or board
          exists in both, the newer edit wins. Your look stays as it is.
        </p>
        <DialogFooter>
          <Button variant="outline" disabled={busy || !current} onClick={askReplace}>
            Replace all…
          </Button>
          <Button ref={merge} disabled={busy} onClick={() => run('merge')}>
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
