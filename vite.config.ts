import { createHash } from 'node:crypto'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Files from public/ that the offline copy needs besides the build output */
const PUBLIC_FILES = ['favicon.svg', 'favicon.ico', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']

/**
 * Writes sw.js (the service worker that makes Lodoc work offline) with the list of every built file, and a
 * version derived from them: a new build means a new worker, which replaces the old cache.
 */
function serviceWorker(): Plugin {
  return {
    name: 'lodoc-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = [...Object.keys(bundle).filter((f) => !f.endsWith('.map')), ...PUBLIC_FILES]
      const version = createHash('sha256').update(files.sort().join('\n')).digest('hex').slice(0, 12)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `// Generated at build time (vite.config.ts)
const CACHE = 'lodoc-${version}'
const FILES = ${JSON.stringify(['./', ...files.map((f) => './' + f)])}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('lodoc-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return
  // Pages: the network first (so a new version shows up), the cached app when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match(request, { ignoreSearch: true, ignoreVary: true })) || (await caches.match('./', { ignoreVary: true })) || (await caches.match('./index.html', { ignoreVary: true })) || Response.error(),
      ),
    )
    return
  }
  // Built files have content hashes in their names, so the cached copy is always right (whatever Vary says)
  event.respondWith(caches.match(request, { ignoreVary: true }).then((hit) => hit || fetch(request)))
})
`,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works under https://<user>.github.io/<repo>/ as well as at a domain root
  base: './',
  plugins: [react(), tailwindcss(), serviceWorker()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
