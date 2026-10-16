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
      // Files from before settings were saved keep the current look
      if (settings?.appearance) replaceAppearance(settings.appearance)
      if (settings?.theme) setTheme(settings.theme)
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
              `${describeProject(project)}, exported ${new Date(project.exportedAt).toLocaleString()}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Merge</span> adds the contents to your current ones. If a note
            or board exists in both, the more recently edited version is kept.
          </p>
          <p>
            <span className="font-medium text-foreground">Replace</span> deletes all current notes, folders and boards first.
          </p>
          {(settings?.appearance || settings?.theme) && (
            <p>Either way, the theme and appearance settings saved in the file are applied too.</p>
          )}
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
