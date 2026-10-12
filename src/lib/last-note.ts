// The note that was open last, so the overview can offer to continue there (per browser).
const KEY = 'localnotes:lastNote'

export function rememberLastNote(id: string) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // a convenience only
  }
}

export function readLastNote(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
