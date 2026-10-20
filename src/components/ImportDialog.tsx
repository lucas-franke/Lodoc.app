import { useTheme } from 'next-themes'
import { useState } from 'react'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/format'
import { describeProject, importProject, type ImportMode, type ProjectFile } from '@/lib/project-file'
import { openNote } from '@/hooks/useRoute'
import { replaceAppearance } from '@/hooks/useAppearance'

export function ImportDialog({ project, onClose }: { project: ProjectFile | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const { setTheme } = useTheme()
  const settings = project?.settings

  const run = async (mode: ImportMode) => {
    if (!project) return
    setBusy(true)
    try {
      await importProject(project, mode)
      // Replace takes the file's look too; a merge (bringing notes over from another device) keeps this one's.
      // Files from before settings were saved keep the current look either way.
      if (mode === 'replace' && settings?.appearance) replaceAppearance(settings.appearance)
      if (mode === 'replace' && settings?.theme) setTheme(settings.theme)
      if (mode === 'replace') openNote(null)
      notify(`Imported ${describeProject(project)}.`, { level: 'success', logged: true })
      onClose()
    } catch (error) {
      notify(`Import failed: ${error instanceof Error ? error.message : String(error)}`, { level: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={project !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import project</DialogTitle>
          <DialogDescription>
            {project &&
              `${describeProject(project)}, exported ${formatDateTime(project.exportedAt)}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Merge</span> adds the contents to your current ones. If a note
            or board exists in both, the more recently edited version is kept, and what you deleted here since stays
            deleted. Your look (theme, colors, fonts) stays as it is.
          </p>
          <p>
            <span className="font-medium text-foreground">Replace</span> deletes all current notes, folders and boards first.
          </p>
          {(settings?.appearance || settings?.theme) && <p>Replace also takes over the theme and appearance saved in the file.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => run('replace')}>
            Replace all
          </Button>
          <Button disabled={busy} onClick={() => run('merge')}>
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
