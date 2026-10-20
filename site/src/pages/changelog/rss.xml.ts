import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getCollection } from 'astro:content'
import { byVersion } from '../../lib/changelog'

/** The changelog as a feed: one item per week's release */
export async function GET(context: APIContext) {
  const releases = (await getCollection('changelog')).sort(byVersion)
  const page = new URL(`${import.meta.env.BASE_URL}changelog/`, context.site)
  return rss({
    title: "Lodoc: what's new",
    description: 'New features, improvements and fixes in Lodoc, week by week.',
    site: page,
    items: releases.map((release) => ({
      title: `Lodoc ${release.data.version}`,
      description: release.data.summary,
      pubDate: release.data.date,
      link: new URL(`#${release.data.version}`, page).href,
    })),
  })
}
