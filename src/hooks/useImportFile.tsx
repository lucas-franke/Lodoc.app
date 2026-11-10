import { useRef, useState } from 'react'
import { ImportDialog, useRunImport } from '@/components/ImportDialog'
import { notify } from '@/lib/notify'
import { currentContents, nothingToLose, readProjectFile, type ProjectFile } from '@/lib/project-file'

/**
 * Importing a backup file: `pick()` opens the file chooser (call it from a click), and `element` (render it
 * once) holds the hidden file input and the dialog that asks how to import what was picked.
 */
export function useImportFile() {
  const [importing, setImporting] = useState<ProjectFile | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const runImport = useRunImport()
  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const project = await readProjectFile(file)
      // An empty Lodoc (the welcome screen's "Restore a backup") has nothing to merge with or to lose: no question
      if (nothingToLose(await currentContents())) void runImport(project, 'replace', { fresh: true })
      else setImporting(project)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not read the file.', { level: 'error' })
    }
  }
  const element = (
    <>
      <input
        ref={input}
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
  return { pick: () => input.current?.click(), element }
}
