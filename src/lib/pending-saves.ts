// Open editors save with a short delay. Anything that reads notes straight from the database for the
// user (e.g. a download) first asks them to write what is still pending.

type Flush = () => Promise<unknown> | void

const flushes = new Set<Flush>()

export function registerFlush(flush: Flush) {
  flushes.add(flush)
  return () => void flushes.delete(flush)
}

export async function flushPendingSaves() {
  await Promise.all([...flushes].map((flush) => flush()))
}
