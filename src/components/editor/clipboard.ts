// Markdown image with an inline data URL: ![name](data:image/...;base64,...)
const INLINE_IMAGE = /!\[((?:\\.|[^\]\\])*)\]\(data:[^)\s]*\)/g

/** `![photo.jpg](data:…)` → `[Image: photo.jpg]`, so plain-text pastes don't get megabytes of base64. */
export function replaceInlineImages(markdown: string) {
  return markdown.replace(INLINE_IMAGE, (_, alt: string) => {
    const name = alt.replace(/\\(.)/g, '$1').trim()
    return name ? `[Image: ${name}]` : '[Image]'
  })
}

/**
 * Runs after BlockNote has filled the clipboard on copy/cut (listen on an element around the editor).
 * Only the plain-text version is touched: rich targets (Google Docs, Word) still get the real image
 * from the HTML, and pasting into another note still uses BlockNote's own format.
 */
export function cleanCopiedText(e: ClipboardEvent) {
  const data = e.clipboardData
  const text = data?.getData('text/plain')
  if (!data || !text) return
  const cleaned = replaceInlineImages(text)
  if (cleaned !== text) data.setData('text/plain', cleaned)
}
