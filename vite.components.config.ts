import { defineConfig, type PluginOption } from 'vite'
import app from './vite.config.ts'

// The components page (/components/, src/gallery): built after the app, into dist/components. A build of its own,
// so the app's service worker doesn't list its files and every user's offline copy stays as small as before.
export default defineConfig({
  ...app,
  plugins: (app.plugins as PluginOption[]).flat().filter((p) => !(p && 'name' in p && p.name === 'lodoc-service-worker')),
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    assetsDir: 'components/assets',
    rolldownOptions: { input: 'components/index.html' },
  },
})
