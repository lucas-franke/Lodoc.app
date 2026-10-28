import { useLiveQuery } from 'dexie-react-hooks'
import { ArchiveRestore, Download, Folder, FolderSync, HardDrive, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { SectionBlock } from '@/components/settings/controls'
import { Button } from '@/components/ui/button'
import { db } from '@/db/db'
import { exportBackup, useBackupStatus, usePersistedStorage } from '@/hooks/useBackupStatus'
import { useImportFile } from '@/hooks/useImportFile'
import { autoBackupSupported, backUpNow, chooseBackupFolder, resumeAutoBackup, stopAutoBackup } from '@/lib/auto-backup'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * The Backup tab of Settings: the backup file, automatic backups into a folder, and how safe the data is in
 * this browser. The sidebar's Backup menu keeps the quick export and imports.
 */
export function BackupSettings() {
  const hasNotes = useLiveQuery(async () => (await db.notes.count()) > 0, [], false)
  const { auto, status, urgent, now } = useBackupStatus(hasNotes)
  const importFile = useImportFile()
  const persisted = usePersistedStorage()
  const used = useStorageUsed()

  return (
    <div>
      <SectionBlock icon={ArchiveRestore} title="Backup file" hint="Notes, boards, images and your look, as one .json file">
        {/* With automatic backup on, its "Last saved" below is the status */}
        {auto.status === 'off' && (
          <p className={cn('text-sm', urgent && 'text-amber-700 dark:text-amber-400')} data-backup-status>
            {status}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="border-control-border" onClick={() => void exportBackup()}>
            <Download /> Export all notes
          </Button>
          <Button variant="outline" size="sm" className="border-control-border" onClick={importFile.pick}>
            <Upload /> Import from file…
          </Button>
        </div>
      </SectionBlock>

      <SectionBlock icon={FolderSync} title="Automatic backup" hint="Into a folder on this computer, whenever something changes">
        {auto.status === 'off' &&
          (autoBackupSupported ? (
            <Button variant="outline" size="sm" className="border-control-border" onClick={() => void chooseBackupFolder()}>
              <FolderSync /> Choose a folder…
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Needs Chrome or Edge on a computer.</p>
          ))}
        {auto.status !== 'off' && (
          <>
            {/* Each fact with the action that belongs to it */}
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:grid-cols-[6rem_minmax(0,max-content)_auto] sm:justify-start">
              <Fact
                label="Folder"
                value={
                  // The place the user chose, set apart from the text around it
                  <span
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-medium"
                    title={auto.folder}
                    data-backup-folder
                  >
                    <Folder aria-hidden className="size-(--icon-sm) shrink-0 text-muted-foreground" />
                    <span className="truncate">{auto.folder}</span>
                  </span>
                }
                action={
                  <Button variant="outline" size="sm" className={ACTION} onClick={() => void chooseBackupFolder()}>
                    Change…
                  </Button>
                }
              />
              {auto.status === 'paused' ? (
                <Fact
                  label="Status"
                  value={
                    <span className="text-amber-700 dark:text-amber-400" data-auto-backup-status>
                      Paused. The browser asks once per visit before writing here.
                    </span>
                  }
                  action={
                    <Button variant="outline" size="sm" className={ACTION} onClick={() => void resumeAutoBackup()}>
                      <RefreshCw /> Resume
                    </Button>
                  }
                />
              ) : (
                <Fact
                  label="Last saved"
                  value={
                    <span className={cn(auto.error && 'text-amber-700 dark:text-amber-400')} data-auto-backup-status>
                      {auto.error
                        ? `Could not save: ${auto.error}`
                        : auto.lastSaved
                          ? formatRelative(auto.lastSaved, now)
                          : 'Not yet'}
                    </span>
                  }
                  action={
                    <Button variant="outline" size="sm" className={ACTION} onClick={() => void backUpNow()}>
                      <RefreshCw /> Back up now
                    </Button>
                  }
                />
              )}
            </dl>
            <p className="text-xs text-muted-foreground">The newest 7 backups are kept; older automatic ones are removed.</p>
            <Button variant="ghost" size="sm" className="-ml-2.5 self-start" onClick={() => void stopAutoBackup()}>
              <X /> Stop automatic backup
            </Button>
          </>
        )}
      </SectionBlock>

      <SectionBlock
        icon={HardDrive}
        title="In this browser"
        hint={used !== null ? `Using ${used}, stored only in this browser` : 'Stored only in this browser'}
        last
      >
        {persisted.supported &&
          (persisted.value ? (
            // Granted for good (browsers can't hand it back): a status, not a switch that can't be moved
            <div className="flex items-start gap-3" data-persist-status>
              <ShieldCheck aria-hidden className="mt-0.5 size-(--icon) shrink-0 text-emerald-700 dark:text-emerald-400" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Kept safe</p>
                <p className="text-xs text-muted-foreground">The browser won't clear your notes when space runs low.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Keep data safe</p>
                <p className="text-xs text-muted-foreground">Asks the browser not to clear your notes when space runs low.</p>
                {persisted.denied && (
                  <p className="text-xs text-amber-700 dark:text-amber-400" role="status">
                    The browser didn't allow it yet. It often does once Lodoc is installed or used more.
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" className="border-control-border" onClick={() => void persisted.request()}>
                <ShieldCheck /> Keep data safe
              </Button>
            </div>
          ))}
      </SectionBlock>
      {importFile.element}
    </div>
  )
}

/** A row's action: in its own column on wider screens, under the value on phones */
const ACTION = 'justify-self-start border-control-border max-sm:col-start-2'

/** A label, its value and the action that belongs to it, in the automatic backup's list */
function Fact({ label, value, action }: { label: string; value: ReactNode; action: ReactNode }) {
  return (
    <div className="col-span-full grid grid-cols-subgrid items-center gap-y-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{value}</dd>
      <dd className="contents">{action}</dd>
    </div>
  )
}

/** How much this site stores in the browser, as "3.2 MB" (null where the browser doesn't say) */
function useStorageUsed() {
  const [used, setUsed] = useState<string | null>(null)
  useEffect(() => {
    void navigator.storage
      ?.estimate?.()
      .then(({ usage }) => {
        if (usage === undefined) return
        const mb = usage / 1024 / 1024
        setUsed(mb < 1 ? `${Math.max(1, Math.round(usage / 1024))} KB` : `${mb.toFixed(mb < 10 ? 1 : 0)} MB`)
      })
      .catch(() => undefined)
  }, [])
  return used
}
