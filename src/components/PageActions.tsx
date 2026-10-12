import { useLiveQuery } from 'dexie-react-hooks'
import { Download } from 'lucide-react'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { db } from '@/db/db'
import { descendantIds } from '@/db/folders'
import { downloadFolderAsZip, downloadNoteAsMarkdown } from '@/lib/downloads'

/**
 * Actions for the open page, on the right of the header next to the light/dark switch. Just the download
 * for now; becomes a "⋯" menu once there are more.
 */
export function PageActions({ type, id }: { type: 'note' | 'folder'; id: string }) {
  // A folder is only offered as a download when it (or a subfolder) holds notes
  const folderHasNotes = useLiveQuery(
    async () => {
      if (type !== 'folder') return false
      const ids = descendantIds(await db.folders.toArray(), id)
      return (
        (await db.notes
          .where('folderId')
          .anyOf([...ids])
          .count()) > 0
      )
    },
    [type, id],
    false,
  )
  if (type === 'folder' && !folderHasNotes) return null

  const label = type === 'note' ? 'Download as Markdown (.md)' : 'Download folder as ZIP (.zip)'
  return (
    <Tip label={label}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        onClick={() => void (type === 'note' ? downloadNoteAsMarkdown(id) : downloadFolderAsZip(id))}
      >
        <Download />
      </Button>
    </Tip>
  )
}
