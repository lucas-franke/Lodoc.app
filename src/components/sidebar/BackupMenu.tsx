import { ArchiveRestore, Download, FileText, FolderInput, Settings, Upload } from 'lucide-react'
import { useImportFile } from '@/hooks/useImportFile'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportBackup, useBackupStatus } from '@/hooks/useBackupStatus'
import { emitAppEvent } from '@/lib/app-events'
import { cn } from '@/lib/utils'

/**
 * One calm footer control for export and import. An overdue backup shows a small amber dot instead of loud
 * warning text. Automatic backups and keeping data safe live in Settings → Backup, one click away.
 */
export function BackupMenu({ hasNotes }: { hasNotes: boolean }) {
  const { auto, status, overdue, urgent, refresh } = useBackupStatus(hasNotes)
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
          <DropdownMenuItem onSelect={() => emitAppEvent('open-settings', { tab: 'backup' })}>
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
