import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title: string
  description: string
  action: string
  /** The other button's label when "Cancel" would be wrong (a step back into the dialog underneath) */
  cancel?: string
  /** The action isn't a delete (a merge): the ordinary button instead of the red one */
  plain?: boolean
  onConfirm: () => void
}

export const ConfirmContext = createContext<((options: ConfirmOptions) => void) | null>(null)

/** Opens the app-wide confirmation dialog (see <ConfirmProvider>). */
export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return confirm
}
