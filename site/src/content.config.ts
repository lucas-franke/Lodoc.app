import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

/**
 * One file per week: the version, the date of its last update, a one-line summary, and "## New / ## Improved /
 * ## Fixed" sections written for the people using Lodoc. The newest version is also shown in the app.
 */
const changelog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/changelog' }),
  schema: z.object({
    version: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
  }),
})

export const collections = { changelog }
