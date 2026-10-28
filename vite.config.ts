import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Files from public/ that the offline copy needs besides the build output */
const PUBLIC_FILES = ['favicon.svg', 'favicon.ico', 'manifest.webmanifest', 'android-chrome-192x192.png', 'android-chrome-512x512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-16x16.png', 'favicon-32x32.png']

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

// Shared from another app (manifest share_target): the share is posted here. It is kept in the
// "share-target" cache and the app opened with ?shared, which reads it from there (lib/collect.ts).
// Handled on the device, so a static host is enough.
async function receiveShare(request) {
  const form = await request.formData()
  const files = form.getAll('shared_files').filter((f) => typeof f !== 'string')
  await caches.delete('share-target')
  const cache = await caches.open('share-target')
  await Promise.all(
    files.map((file, i) =>
      cache.put('shared/' + i, new Response(file, { headers: { 'content-type': file.type || 'application/octet-stream', 'x-name': encodeURIComponent(file.name || '') } })),
    ),
  )
  const field = (name) => String(form.get(name) || '')
  const meta = { title: field('shared_title'), text: field('shared_text'), url: field('shared_url'), files: files.length }
  await cache.put('shared/meta', new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } }))
  return Response.redirect(new URL('./?shared', self.registration.scope).href, 303)
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method === 'POST' && new URL(request.url).pathname === new URL('./share', self.registration.scope).pathname) {
    event.respondWith(receiveShare(request).catch(() => Response.redirect(new URL('./', self.registration.scope).href, 303)))
    return
  }
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return
  // Pages: the network first (so a new version shows up), the cached app when offline
  // The website beside the app (changelog/, docs/, about/ and their files in _astro/): from the network, and a
  // copy is kept as they are visited, so a page seen once also opens offline
  const inSite = /^(changelog|docs|about|_astro)(\\/|$)/.test(new URL(request.url).pathname.slice(new URL(self.registration.scope).pathname.length))
  if (inSite) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            event.waitUntil(caches.open('site-pages').then((cache) => cache.put(request, copy)))
          }
          return response
        })
        .catch(async () => (await caches.match(request, { ignoreVary: true })) || Response.error()),
    )
    return
  }
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

/**
 * The newest release in the changelog (site/src/content/changelog), shown in the app's Lodoc menu: so the
 * version the app says it is and the changelog can't drift apart.
 */
function latestRelease() {
  const dir = path.resolve(import.meta.dirname, 'site/src/content/changelog')
  const releases = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const text = readFileSync(path.join(dir, f), 'utf8')
      return { version: /^version:\s*['"]?([^'"\n]+)/m.exec(text)?.[1] ?? '', date: /^date:\s*(\S+)/m.exec(text)?.[1] ?? '' }
    })
    .sort((a, b) => b.version.localeCompare(a.version, 'en', { numeric: true }))
  return releases[0] ?? { version: '', date: '' }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works under https://<user>.github.io/<repo>/ as well as at a domain root
  base: './',
  plugins: [react(), tailwindcss(), serviceWorker()],
  define: {
    __LODOC_RELEASE__: JSON.stringify(latestRelease()),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
