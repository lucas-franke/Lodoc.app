import { rmSync } from 'node:fs'
import { defineConfig, type Plugin, type PluginOption } from 'vite'
import app from './vite.config.ts'

// The components page (/components/, src/gallery): built after the app, into dist/components. A build of its own,
// so the app's service worker doesn't list its files and every user's offline copy stays as small as before.

/**
 * The components page must never be able to touch anyone's notes, so it may not contain any database code: the build
 * stops if anything in it reaches Dexie or src/db (only the types and constants in src/db/schema.ts are allowed).
 * Before this, the page opened the real database by accident and deleted it (October 2026).
 */
function noDatabase(): Plugin {
  return {
    name: 'gallery-no-database',
    enforce: 'pre',
    // Nothing of an earlier build stays behind in dist/components (the app's build doesn't empty it for this one)
    buildStart() {
      rmSync('dist/components', { recursive: true, force: true })
    },
    async resolveId(source, importer, options) {
      if (/^dexie(-react-hooks)?($|\/)/.test(source)) this.error(`The components page must not use the database: "${source}" in ${importer}`)
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      const id = resolved?.id.replaceAll('\\', '/') ?? ''
      if (/\/src\/db\/(?!schema\.ts$)/.test(id)) this.error(`The components page must not use the database: "${source}" in ${importer}`)
      return null
    },
  }
}

export default defineConfig({
  ...app,
  plugins: [noDatabase(), ...(app.plugins as PluginOption[]).flat().filter((p) => !(p && 'name' in p && p.name === 'lodoc-service-worker'))],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    assetsDir: 'components/assets',
    rolldownOptions: { input: 'components/index.html' },
  },
})
