import { toast } from 'sonner'

// The UI side of downloads: loads the converter on first use and reports problems as toasts.

const message = (error: unknown) => (error instanceof Error ? error.message : 'The download failed.')

export async function downloadNoteAsMarkdown(id: string) {
  try {
    const { downloadNote } = await import('./export-markdown')
    await downloadNote(id)
  } catch (error) {
    toast.error(message(error))
  }
}

export async function downloadFolderAsZip(id: string) {
  const progress = toast.loading('Preparing download…')
  try {
    const { downloadFolder } = await import('./export-markdown')
    const count = await downloadFolder(id)
    toast.success(`Downloaded ${count} note${count === 1 ? '' : 's'}`, { id: progress })
  } catch (error) {
    toast.error(message(error), { id: progress })
  }
}
