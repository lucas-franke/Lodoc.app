import { toast, type ExternalToast } from 'sonner'
import { logActivity } from '@/db/activity'

type Options = {
  level?: 'success' | 'error' | 'info'
  action?: { label: string; onClick: () => void }
  /** Replaces a toast that is showing (e.g. "Preparing download…") */
  id?: string | number
  /** Already in Activity as a change (e.g. "Moved to Trash"), so the message isn't logged a second time */
  logged?: boolean
}

/** How long a message with a button (Undo, Open) stays; plain ones use sonner's default (4s) */
const WITH_ACTION = 8000
/** The first message with its explanation: time to read both, without staying in the way */
const WITH_HINT = 15000

const HINT_KEY = 'localnotes:toastHintSeen'
const HINT =
  "From now on, messages like this close by themselves. You'll find them all under Activity in the sidebar."
let hintShowing = false

function hintSeen() {
  try {
    return localStorage.getItem(HINT_KEY) === '1'
  } catch {
    return true
  }
}

function rememberHint() {
  hintShowing = false
  try {
    localStorage.setItem(HINT_KEY, '1')
  } catch {
    // shown again next time
  }
}

/**
 * Shows a message and keeps it in Activity, so a message that closes by itself is never lost: everything
 * but errors closes after a few seconds (paused while hovered or focused), errors stay until closed. The
 * very first message explains this and stays a little longer; it is shown once.
 */
export function notify(text: string, { level = 'info', action, id, logged = false }: Options = {}) {
  if (!logged) logActivity({ kind: 'message', text, level })
  const options: ExternalToast = { id, action, duration: level === 'error' ? Infinity : action ? WITH_ACTION : undefined }

  if (!hintShowing && !hintSeen()) {
    hintShowing = true
    Object.assign(options, {
      description: HINT,
      duration: level === 'error' ? Infinity : WITH_HINT,
      action: action && {
        ...action,
        onClick: () => {
          rememberHint()
          action.onClick()
        },
      },
      cancel: { label: 'Got it', onClick: rememberHint },
      onDismiss: rememberHint,
      onAutoClose: rememberHint,
    } satisfies ExternalToast)
  }

  const show = level === 'success' ? toast.success : level === 'error' ? toast.error : toast
  return show(text, options)
}
