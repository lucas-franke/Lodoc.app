import { ArchiveRestore, Check, Download, FolderSync, PauseCircle, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { notify } from '@/lib/notify'
import { ImportDialog } from '@/components/ImportDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportProject, getLastExport, readProjectFile, type ProjectFile } from '@/lib/project-file'
import { useAppEvent } from '@/lib/app-events'
import {
  autoBackupSupported,
  backUpNow,
  chooseBackupFolder,
  resumeAutoBackup,
  stopAutoBackup,
  useAutoBackup,
} from '@/lib/auto-backup'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

const EXPORT_REMINDER_DAYS = 7
/** After this long (or never, once there are notes) the status line itself turns amber */
const EXPORT_WARNING_DAYS = 30
const DAY = 24 * 60 * 60 * 1000

/**
 * One calm footer control for export/import. An overdue backup shows a small amber dot
 * instead of loud warning text; the explanation lives inside the menu.
 */
export function BackupMenu({ hasNotes }: { hasNotes: boolean }) {
  const [lastExport, setLastExport] = useState(getLastExport)
  const [importing, setImporting] = useState<ProjectFile | null>(null)
  // "Now" for the status text; refreshed when the menu opens and after an export
  const [now, setNow] = useState(Date.now)
  const fileInput = useRef<HTMLInputElement>(null)
  // An export from the command palette updates the status line too
  useAppEvent(
    'backup-exported',
    useCallback(() => {
      setLastExport(getLastExport())
      setNow(Date.now())
    }, []),
  )

  const auto = useAutoBackup()
  const paused = auto.status === 'paused'
  const autoError = auto.status === 'on' && !!auto.error
  const status = paused
    ? 'Automatic backup paused'
    : autoError
      ? 'Automatic backup failed'
      : lastExport
        ? `${auto.status === 'on' ? 'Saved to folder' : 'Last backup'} ${formatRelative(lastExport, now)}`
        : 'Never backed up'
  const overdue = paused || autoError || (hasNotes && (!lastExport || now - lastExport > EXPORT_REMINDER_DAYS * DAY))
  const urgent = paused || autoError || (hasNotes && (!lastExport || now - lastExport > EXPORT_WARNING_DAYS * DAY))
  const persisted = usePersistedStorage()

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setImporting(await readProjectFile(file))
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not read the file.', { level: 'error' })
    }
  }

  return (
    <>
      <DropdownMenu onOpenChange={(open) => open && setNow(Date.now())}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Backup. ${status}${overdue ? ', backup recommended' : ''}`}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-sidebar-accent"
          >
            <ArchiveRestore className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                Backup
                {overdue && <span className="size-2 rounded-full bg-amber-500" aria-hidden />}
              </span>
              <span className={cn('block truncate text-xs', urgent ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
                {status}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-60">
          <DropdownMenuItem
           
            onSelect={async () => {
              await exportProject()
              const time = Date.now()
              setLastExport(time)
              setNow(time)
            }}
          >
            <Download /> Export all notes (.json)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <Upload /> Import from file…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {autoBackupSupported && auto.status === 'off' && (
            <DropdownMenuItem onSelect={() => void chooseBackupFolder()}>
              <FolderSync />
              <span className="flex flex-col">
                <span>Back up automatically…</span>
                <span className="text-xs text-muted-foreground">Into a folder on this computer, whenever something changes</span>
              </span>
            </DropdownMenuItem>
          )}
          {auto.status === 'paused' && (
            <DropdownMenuItem onSelect={() => void resumeAutoBackup()}>
              <PauseCircle />
              <span className="flex flex-col">
                <span>Resume automatic backup</span>
                <span className="text-xs text-muted-foreground">The browser asks once per visit before writing to “{auto.folder}”</span>
              </span>
            </DropdownMenuItem>
          )}
          {auto.status === 'on' && (
            <>
              <p className="px-2 py-1.5 text-xs leading-relaxed text-muted-foreground" data-auto-backup-status>
                {auto.error
                  ? `Could not save to “${auto.folder}”: ${auto.error}`
                  : `Backing up to “${auto.folder}”${auto.lastSaved ? `, last saved ${formatRelative(auto.lastSaved, now)}` : ''}. The last ${7} days are kept.`}
              </p>
              <DropdownMenuItem onSelect={() => void backUpNow()}>
                <RefreshCw /> Back up to folder now
              </DropdownMenuItem>
            </>
          )}
          {auto.status !== 'off' && (
            <>
              <DropdownMenuItem onSelect={() => void chooseBackupFolder()}>
                <FolderSync /> Choose another folder…
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void stopAutoBackup()}>
                <X /> Stop automatic backup
              </DropdownMenuItem>
            </>
          )}
          {(autoBackupSupported || auto.status !== 'off') && <DropdownMenuSeparator />}
          {persisted.supported && !persisted.value && (
            <DropdownMenuItem onSelect={() => void persisted.request()}>
              <ShieldCheck />
              <span className="flex flex-col">
                <span>Keep data safe in this browser</span>
                <span className="text-xs text-muted-foreground">Asks the browser not to clear it when space runs low</span>
              </span>
            </DropdownMenuItem>
          )}
          {/* Once granted it's a state, not an action: shown as a plain row with "On" */}
          {persisted.supported && persisted.value && (
            <div className="flex min-h-9 items-center gap-1.5 px-2 py-2 text-sm" data-persisted>
              <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">Data kept safe</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="size-3.5" /> On
              </span>
            </div>
          )}
          <p className="px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
            Notes, boards and images are stored only in this browser
            {persisted.value ? ', which keeps them even when space runs low' : ''}. Export regularly to keep a copy.
          </p>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          void onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <ImportDialog project={importing} onClose={() => setImporting(null)} />
    </>
  )
}

/** Whether the browser keeps this site's data when storage runs low (navigator.storage.persist). */
function usePersistedStorage() {
  const supported = typeof navigator !== 'undefined' && !!navigator.storage?.persist
  const [value, setValue] = useState(false)
  useEffect(() => {
    if (supported) void navigator.storage.persisted().then(setValue)
  }, [supported])
  const request = async () => {
    const granted = await navigator.storage.persist()
    setValue(granted)
    if (granted) notify('Your notes are now kept safe in this browser', { level: 'success' })
    else notify("The browser didn't allow it. Regular backups keep your notes safe.")
  }
  return { supported, value, request }
}
