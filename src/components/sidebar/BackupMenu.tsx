import { ArchiveRestore, Download, FileText, FolderInput, Settings, Upload } from 'lucide-react'
import { AlertFilled } from '@/components/icons/AlertFilled'
import { useImportFile } from '@/hooks/useImportFile'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportBackup, useBackupStatus } from '@/hooks/useBackupStatus'
import { openSettings } from '@/hooks/useRoute'
import { emitAppEvent } from '@/lib/app-events'
import { cn } from '@/lib/utils'

/**
 * One footer control for export and import: the label, and where the backups stand in a small pill. Grey while
 * all is well; amber with a filled alert icon once a backup is due (none yet, a week since the last, or the automatic
 * backup paused or failing), so it is noticed. Automatic backups and keeping data safe live in Settings → Backup.
 */
export function BackupMenu({ hasNotes }: { hasNotes: boolean }) {
  const { auto, status, overdue, refresh } = useBackupStatus(hasNotes)
  const importFile = useImportFile()
  const autoSummary =
    auto.status === 'on' ? `Backing up to “${auto.folder}”` : auto.status === 'paused' ? 'Automatic backup paused' : 'Automatic backup: off'

  return (
    <>
      <DropdownMenu onOpenChange={(open) => open && refresh()}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Backup. ${status}${overdue ? ', backup recommended' : ''}`}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-sidebar-accent"
          >
            <ArchiveRestore className="size-(--icon) shrink-0 text-muted-foreground" />
            <span className="shrink-0">Backup</span>
            <span
              aria-hidden
              className={cn(
                'ml-auto flex min-w-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                overdue
                  ? 'bg-amber-100 font-medium text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'
                  : 'bg-muted text-muted-foreground',
              )}
              data-backup-pill
              data-overdue={overdue || undefined}
            >
              {/* Filled, so it shows at this size; the "!" in the pill color */}
              {overdue && <AlertFilled className="size-3.5 shrink-0" markClassName="text-amber-100 dark:text-sidebar" />}
              <span className="truncate">{status}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-60">
          <DropdownMenuItem onSelect={() => void exportBackup()}>
            <Download /> Export all notes (.json)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={importFile.pick}>
            <Upload /> Import from file…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => emitAppEvent('import-markdown-files')}>
            <FileText />
            <span className="flex flex-col">
              <span>Import Markdown…</span>
              <span className="text-xs text-muted-foreground">.md files, or a .zip (e.g. a Notion export)</span>
            </span>
          </DropdownMenuItem>
          {/* Folders can only be picked with a mouse-and-keyboard browser */}
          <DropdownMenuItem className="pointer-coarse:hidden" onSelect={() => emitAppEvent('import-markdown-folder')}>
            <FolderInput />
            <span className="flex flex-col">
              <span>Import a Markdown folder…</span>
              <span className="text-xs text-muted-foreground">With its subfolders and images (e.g. an Obsidian vault)</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openSettings('backup')}>
            <Settings />
            <span className="flex flex-col">
              <span>Backup settings…</span>
              <span className="text-xs text-muted-foreground">{autoSummary}</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {importFile.element}
    </>
  )
}
