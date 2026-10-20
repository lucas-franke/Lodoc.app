// Copies the website (site/dist, built by Astro) into the app's build (dist), so both are one deploy:
// the app at the root, the site's pages in their folders beside it (changelog/, later docs/ and about/).
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs'

const from = 'site/dist'
const to = 'dist'
/** What the site may put into dist: replaced on every build; anything else must not clash with the app's files */
const SITE_ENTRIES = new Set(['_astro', 'changelog', 'docs', 'about'])

if (!existsSync(to)) throw new Error('Build the app first (dist/ is missing).')
for (const entry of readdirSync(from)) {
  // Astro's leftovers from rendering the pages, not part of the site
  if (entry.startsWith('.')) continue
  if (SITE_ENTRIES.has(entry)) rmSync(`${to}/${entry}`, { recursive: true, force: true })
  else if (existsSync(`${to}/${entry}`)) throw new Error(`The site's "${entry}" would overwrite the app's. Rename one of them.`)
  cpSync(`${from}/${entry}`, `${to}/${entry}`, { recursive: true })
}
console.log('Site copied into dist/')
