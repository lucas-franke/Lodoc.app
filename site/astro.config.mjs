import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// The website next to the app (changelog, later docs and about). It is built into site/dist and copied into the
// app's dist/ (scripts/merge-site.mjs), so both are one deploy. The app lives at the root, so these pages sit in
// folders beside it. SITE_BASE is the path the whole thing is served under: "/" on lodoc.app (Cloudflare), the
// repository's name on GitHub Pages; SITE_URL is that host (for the feed's links). Both are set in
// .github/workflows/deploy.yml.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://lodoc.app',
  base: process.env.SITE_BASE ?? '/',
  trailingSlash: 'always',
  outDir: './dist',
  vite: {
    plugins: [tailwindcss()],
    // Astro's own cookie (v2) inside the build: the copy at the root of node_modules is an older one (from the
    // shadcn CLI), which the build would otherwise pick up
    environments: { prerender: { resolve: { noExternal: ['cookie'] } } },
  },
})
