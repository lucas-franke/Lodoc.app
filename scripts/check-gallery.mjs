// After the build: the components page (dist/components) must not contain any database code, so it can never open,
// change or delete anyone's notes. vite.components.config.ts already refuses to bundle src/db; this checks the result.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const DIR = 'dist/components'
const FORBIDDEN = [/\bindexedDB\b/, /\bDexie\b/, /deleteDatabase/]

const files = readdirSync(DIR, { recursive: true }).filter((f) => /\.(js|html)$/.test(f))
const found = files.flatMap((f) => {
  const text = readFileSync(path.join(DIR, f), 'utf8')
  return FORBIDDEN.filter((p) => p.test(text)).map((p) => `${f}: ${p}`)
})
if (found.length) {
  console.error(`The components page contains database code:\n  ${found.join('\n  ')}`)
  process.exit(1)
}
console.log(`Components page checked: no database code in ${files.length} files`)
