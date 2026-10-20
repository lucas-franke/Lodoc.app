import { useRef, useState } from 'react'
import { ImportDialog } from '@/components/ImportDialog'
import { notify } from '@/lib/notify'
import { readProjectFile, type ProjectFile } from '@/lib/project-file'

/**
 * Importing a backup file: `pick()` opens the file chooser (call it from a click), and `element` (render it
 * once) holds the hidden file input and the dialog that asks how to import what was picked.
 */
export function useImportFile() {
  const [importing, setImporting] = useState<ProjectFile | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setImporting(await readProjectFile(file))
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not read the file.', { level: 'error' })
    }
  }
  const element = (
    <>
      <input
        ref={input}
        type="file"
        // .txt too: a backup sent from a phone can arrive as one (lib/project-file.ts, shareProject)
        accept=".json,.txt,application/json,text/plain"
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
  return { pick: () => input.current?.click(), element }
}
