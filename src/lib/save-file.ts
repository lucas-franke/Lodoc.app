/** Hands a file to the browser's download (there is no server to send it to). */
export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A file name every OS accepts: no reserved characters, no trailing dots or spaces, never empty. */
export function safeFileName(name: string, fallback = 'Untitled') {
  const cleaned = [...name]
    .map((c) => (c.charCodeAt(0) < 32 ? ' ' : c)) // control characters
    .join('')
    .replace(/[/\\:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 120)
    .trim()
  return cleaned || fallback
}
