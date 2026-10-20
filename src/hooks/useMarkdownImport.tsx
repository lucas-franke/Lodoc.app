import { useCallback, useRef } from 'react'
import { useAppEvent } from '@/lib/app-events'
import { notify } from '@/lib/notify'
import { openFolder, openNote } from './useRoute'

/**
 * Importing Markdown (lib/import-markdown.ts), asked for with the app events "import-markdown-files" and
 * "import-markdown-folder" (backup menu, palette, welcome). Lives in App, so the file inputs are still there
 * when the picker returns, whatever closed in the meantime. Render `element` once.
 */
export function useMarkdownImport() {
  const files = useRef<HTMLInputElement>(null)
  const folder = useRef<HTMLInputElement>(null)
  useAppEvent('import-markdown-files', useCallback(() => files.current?.click(), []))
  useAppEvent('import-markdown-folder', useCallback(() => folder.current?.click(), []))

  const run = async (list: FileList | null) => {
    const picked = [...(list ?? [])]
    if (!picked.length) return
    const toast = notify('Importing…', { logged: true })
    try {
      const { importMarkdown } = await import('@/lib/import-markdown')
      const result = await importMarkdown(picked, (done, total) =>
        total > 3 && notify(`Importing ${done} of ${total} notes…`, { id: toast, logged: true }),
      )
      const what = result.notes === 1 ? '1 note' : `${result.notes} notes`
      const open = result.rootFolderId ? () => openFolder(result.rootFolderId!) : result.firstNoteId ? () => openNote(result.firstNoteId) : null
      notify(`Imported ${what}${result.folders ? ` in ${result.folders === 1 ? '1 folder' : `${result.folders} folders`}` : ''}`, {
        id: toast,
        level: 'success',
        ...(open ? { action: { label: 'Open', onClick: open } } : {}),
      })
      open?.()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The import failed.', { id: toast, level: 'error' })
    }
  }

  const input = (ref: React.RefObject<HTMLInputElement | null>, extra: Record<string, unknown>) => (
    <input
      ref={ref}
      type="file"
      className="hidden"
      aria-hidden
      tabIndex={-1}
      {...extra}
      onChange={(e) => {
        void run(e.target.files)
        e.target.value = ''
      }}
    />
  )

  return {
    element: (
      <>
        {input(files, { multiple: true, accept: '.md,.markdown,.txt,.zip,text/markdown,application/zip' })}
        {/* A whole folder (an Obsidian vault), with its subfolders and images */}
        {input(folder, { webkitdirectory: '', multiple: true })}
      </>
    ),
  }
}
