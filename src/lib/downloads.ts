import { toast } from 'sonner'
import { notify } from './notify'

// The UI side of downloads: loads the converter on first use and reports problems as messages.

const message = (error: unknown) => (error instanceof Error ? error.message : 'The download failed.')

export async function downloadNoteAsMarkdown(id: string) {
  try {
    const { downloadNote } = await import('./export-markdown')
    await downloadNote(id)
  } catch (error) {
    notify(message(error), { level: 'error' })
  }
}

export async function downloadFolderAsZip(id: string) {
  // Progress only; the outcome replaces it (and goes into Activity)
  const progress = toast.loading('Preparing download…')
  try {
    const { downloadFolder } = await import('./export-markdown')
    const count = await downloadFolder(id)
    notify(`Downloaded ${count} note${count === 1 ? '' : 's'}`, { level: 'success', id: progress })
  } catch (error) {
    notify(message(error), { level: 'error', id: progress })
  }
}
