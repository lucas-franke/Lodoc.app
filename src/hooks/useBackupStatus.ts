import { useCallback, useEffect, useState } from 'react'
import { emitAppEvent, useAppEvent } from '@/lib/app-events'
import { useAutoBackup } from '@/lib/auto-backup'
import { formatRelative } from '@/lib/format'
import { notify } from '@/lib/notify'
import { exportProject, getLastExport } from '@/lib/project-file'

const EXPORT_REMINDER_DAYS = 7
/** After this long (or never, once there are notes) the status line itself turns amber */
const EXPORT_WARNING_DAYS = 30
const DAY = 24 * 60 * 60 * 1000

/**
 * Where the backups stand, for the sidebar's Backup button and Settings → Backup: the last export, the
 * automatic backup, and whether a reminder is due.
 */
export function useBackupStatus(hasNotes: boolean) {
  const [lastExport, setLastExport] = useState(getLastExport)
  // "Now" for the status text; refreshed when a menu opens and after an export
  const [now, setNow] = useState(Date.now)
  const refresh = useCallback(() => {
    setLastExport(getLastExport())
    setNow(Date.now())
  }, [])
  // An export from anywhere (the palette, the menu, Settings) updates every status line
  useAppEvent('backup-exported', refresh)

  const auto = useAutoBackup()
  const paused = auto.status === 'paused'
  const autoError = auto.status === 'on' && !!auto.error
  const status = paused
    ? 'Automatic backup paused'
    : autoError
      ? 'Automatic backup failed'
      : lastExport
        ? `${auto.status === 'on' ? 'Saved to folder' : 'Last backup'} ${formatRelative(lastExport, now)}`
        : 'Never backed up'
  const overdue = paused || autoError || (hasNotes && (!lastExport || now - lastExport > EXPORT_REMINDER_DAYS * DAY))
  const urgent = paused || autoError || (hasNotes && (!lastExport || now - lastExport > EXPORT_WARNING_DAYS * DAY))

  return { auto, status, overdue, urgent, now, refresh }
}

/** Saves the backup file and tells every status line */
export async function exportBackup() {
  await exportProject()
  emitAppEvent('backup-exported')
}

/**
 * Whether the browser keeps this site's data when storage runs low (navigator.storage.persist). A one-way
 * request: once granted, a site can't hand it back. `denied`: asked in this visit, and the browser said no.
 */
export function usePersistedStorage() {
  const supported = typeof navigator !== 'undefined' && !!navigator.storage?.persist
  const [value, setValue] = useState(false)
  const [denied, setDenied] = useState(false)
  useEffect(() => {
    if (supported) void navigator.storage.persisted().then(setValue)
  }, [supported])
  const request = async () => {
    const granted = await navigator.storage.persist()
    setValue(granted)
    setDenied(!granted)
    // A no is shown in Settings itself, next to the button
    if (granted) notify('Your notes are now kept safe in this browser', { level: 'success' })
  }
  return { supported, value, denied, request }
}
