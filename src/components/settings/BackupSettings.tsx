import { useLiveQuery } from 'dexie-react-hooks'
import { ArchiveRestore, Download, FolderSync, HardDrive, RefreshCw, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SectionBlock, SwitchRow } from '@/components/settings/controls'
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
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <SectionBlock icon={ArchiveRestore} title="Backup file" hint="All notes, boards, images and your look in one .json file">
        <p className={cn('text-sm', urgent && 'text-amber-700 dark:text-amber-400')} data-backup-status>
          {status}
        </p>
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
            <p className="text-xs text-muted-foreground">
              This browser can't write to a folder. Chrome or Edge on a computer can; until then, export a backup file now
              and then.
            </p>
          ))}
        {auto.status === 'paused' && (
          <>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Paused. The browser asks once per visit before writing to “{auto.folder}”.
            </p>
            <Button variant="outline" size="sm" className="border-control-border" onClick={() => void resumeAutoBackup()}>
              <RefreshCw /> Resume
            </Button>
          </>
        )}
        {auto.status === 'on' && (
          <>
            <p className={cn('text-sm', auto.error && 'text-amber-700 dark:text-amber-400')} data-auto-backup-status>
              {auto.error
                ? `Could not save to “${auto.folder}”: ${auto.error}`
                : `Backing up to “${auto.folder}”${auto.lastSaved ? `, last saved ${formatRelative(auto.lastSaved, now)}` : ''}.`}
            </p>
            <p className="text-xs text-muted-foreground">The newest 7 backups are kept; older automatic ones are removed.</p>
            <Button variant="outline" size="sm" className="border-control-border" onClick={() => void backUpNow()}>
              <RefreshCw /> Back up now
            </Button>
          </>
        )}
        {auto.status !== 'off' && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="border-control-border" onClick={() => void chooseBackupFolder()}>
              <FolderSync /> Choose another folder…
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void stopAutoBackup()}>
              <X /> Stop
            </Button>
          </div>
        )}
      </SectionBlock>

      <SectionBlock icon={HardDrive} title="In this browser" hint="Notes, boards and images are stored only here" last>
        {persisted.supported && (
          <SwitchRow
            id="settings-persist"
            label="Keep data safe"
            hint={
              persisted.value
                ? 'On: the browser keeps your notes even when space runs low. Only clearing the site data removes them.'
                : 'Asks the browser not to clear your notes when space runs low'
            }
            checked={persisted.value}
            // Browsers can't hand the guarantee back, so once on it stays on
            disabled={persisted.value}
            onChange={(on) => on && void persisted.request()}
          />
        )}
        {used !== null && (
          <p className="text-xs text-muted-foreground" data-storage-used>
            Using {used} in this browser.
          </p>
        )}
        <p className="text-xs text-muted-foreground">Clearing this browser's data removes them, so export a backup now and then.</p>
      </SectionBlock>
      {importFile.element}
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
