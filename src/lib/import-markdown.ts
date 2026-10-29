import { BlockNoteEditor } from '@blocknote/core'
import { unzipSync } from 'fflate'
import { quoteToCallout } from './callout'
import { editorSchema } from '@/components/editor/schema'
import { logChange } from '@/db/activity'
import { db } from '@/db/db'
import { createFolder } from '@/db/folders'
import { createNote, normalizeTag } from '@/db/notes'
import type { StoredBlock } from '@/db/schema'
import { blobToDataUrl, compressImage, NOTE_IMAGE } from './image-compress'

// Moving in from another app: Markdown files, a folder of them (an Obsidian vault) or a zip (a Notion export)
// become notes, their folders become folders. Loaded only when an import starts (import('./import-markdown')),
// so BlockNote's parser and the zip library stay out of the main bundle.
//
// Per file: YAML front matter is dropped (its tags are kept), a first "# Heading" becomes the title (else the
// file name), quotes starting with "[!TIP]" and the like become callouts, images that came along are put into the
// note, and [[Wiki links]] or links to other imported .md files become note links. Notion's ids at the end of names
// ("Page 1a2b…") are left out.

type Source = { path: string; blob: Blob; modified?: number }
type Converter = BlockNoteEditor<typeof editorSchema.blockSchema, typeof editorSchema.inlineContentSchema, typeof editorSchema.styleSchema>
type Inline = { type: string; text?: string; href?: string; content?: Inline[]; styles?: Record<string, unknown>; props?: Record<string, unknown> }
type Block = { type: string; props?: Record<string, unknown>; content?: unknown; children?: Block[] }

const MARKDOWN = /\.(md|markdown|mdown|txt)$/i
const IMAGE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i
const NOTION_ID = /\s+[0-9a-f]{32}$/i

export type ImportResult = { notes: number; folders: number; rootFolderId: string | null; firstNoteId: string | null }

const stripExt = (name: string) => name.replace(/\.[^./]+$/, '')
const cleanName = (name: string) => stripExt(name).replace(NOTION_ID, '').trim() || 'Untitled'
const segments = (path: string) => path.split('/').filter(Boolean)
const hidden = (path: string) => segments(path).some((s) => s.startsWith('.') || s === '__MACOSX')

/** "a/b/../c.png" → "a/c.png" */
function normalizePath(path: string) {
  const out: string[] = []
  for (const s of segments(path)) {
    if (s === '..') out.pop()
    else if (s !== '.') out.push(s)
  }
  return out.join('/')
}

/** The files picked or dropped, with zips (and zips inside them, as Notion makes) unpacked */
async function collect(files: File[]): Promise<{ sources: Source[]; zipName: string | null }> {
  const sources: Source[] = []
  let zipName: string | null = null
  const unzip = (bytes: Uint8Array, prefix: string) => {
    for (const [path, data] of Object.entries(unzipSync(bytes))) {
      if (path.endsWith('/')) continue
      if (/\.zip$/i.test(path)) unzip(data, prefix + stripExt(path) + '/')
      else sources.push({ path: prefix + path, blob: new Blob([data as BlobPart]) })
    }
  }
  for (const file of files) {
    const path = file.webkitRelativePath || file.name
    if (/\.zip$/i.test(file.name)) {
      zipName ??= cleanName(file.name)
      unzip(new Uint8Array(await file.arrayBuffer()), files.length > 1 ? stripExt(file.name) + '/' : '')
    } else sources.push({ path, blob: file, modified: file.lastModified })
  }
  return { sources: sources.filter((s) => !hidden(s.path) && (MARKDOWN.test(s.path) || IMAGE.test(s.path))), zipName }
}

/** Front matter's tags ("tags: [a, b]", "tags: a, b" or a "- a" list); the rest of it is not kept */
function frontMatter(text: string): { body: string; tags: string[] } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(text)
  if (!match) return { body: text, tags: [] }
  const yaml = match[1]
  const tags: string[] = []
  const inline = /^tags:[ \t]*\[?([^\]\n]*)\]?[ \t]*$/m.exec(yaml)
  if (inline?.[1].trim()) tags.push(...inline[1].split(','))
  else {
    const list = /^tags:[ \t]*\r?\n((?:[ \t]*-[^\n]*\r?\n?)+)/m.exec(yaml)
    if (list) tags.push(...list[1].split('\n').map((l) => l.replace(/^\s*-\s*/, '')))
  }
  return {
    body: text.slice(match[0].length),
    tags: tags.map((t) => normalizeTag(t.replace(/^['"]|['"]$/g, ''))).filter(Boolean),
  }
}

/** A first "# Heading" line is the title; otherwise the file name is */
function titleAndBody(text: string, fileName: string) {
  const match = /^\s*#[ \t]+(.+?)[ \t]*#*[ \t]*(\r?\n|$)/.exec(text)
  if (match) return { title: match[1].trim(), body: text.slice(match[0].length) }
  return { title: cleanName(fileName), body: text }
}

function walkBlocks(blocks: Block[], visit: (block: Block) => void) {
  for (const block of blocks) {
    visit(block)
    if (block.children?.length) walkBlocks(block.children, visit)
  }
}

/** Every inline array in the blocks (table cells included), so links can be rewritten in place */
function inlineArrays(blocks: Block[]): Inline[][] {
  const arrays: Inline[][] = []
  walkBlocks(blocks, (block) => {
    if (Array.isArray(block.content)) arrays.push(block.content as Inline[])
    const rows = (block.content as { rows?: { cells: unknown[] }[] } | undefined)?.rows
    rows?.forEach((row) =>
      row.cells.forEach((cell) => {
        const content = Array.isArray(cell) ? cell : (cell as { content?: unknown }).content
        if (Array.isArray(content)) arrays.push(content as Inline[])
      }),
    )
  })
  return arrays
}

export async function importMarkdown(files: File[], onProgress?: (done: number, total: number) => void): Promise<ImportResult> {
  const { sources, zipName } = await collect(files)
  const notesToMake = sources.filter((s) => MARKDOWN.test(s.path))
  if (!notesToMake.length) throw new Error('No Markdown files (.md) were found in what you picked.')
  const byPath = new Map(sources.map((s) => [s.path.toLowerCase(), s]))
  const byName = new Map(sources.map((s) => [segments(s.path).pop()!.toLowerCase(), s]))

  // A single folder around everything (a vault, a zip's top folder) becomes the one folder the import lands in;
  // a zip without one gets a folder named after it. Loose files go to Unfiled.
  const firsts = new Set(sources.map((s) => (segments(s.path).length > 1 ? segments(s.path)[0] : '')))
  const commonRoot = firsts.size === 1 && !firsts.has('') ? [...firsts][0] : null
  const rootName = commonRoot ? cleanName(commonRoot) : zipName

  let folders = 0
  const folderIds = new Map<string, string | null>()
  const ensureFolder = async (dirs: string[]): Promise<string | null> => {
    const key = dirs.join('/')
    if (folderIds.has(key)) return folderIds.get(key)!
    const parent = dirs.length > 1 ? await ensureFolder(dirs.slice(0, -1)) : rootFolderId
    const id = await createFolder(cleanName(dirs[dirs.length - 1]), parent)
    folders++
    folderIds.set(key, id)
    return id
  }
  const rootFolderId = rootName ? await createFolder(rootName) : null
  if (rootFolderId) folders++

  const converter: Converter = BlockNoteEditor.create({ schema: editorSchema })
  const made: { id: string; path: string; title: string; blocks: Block[] }[] = []
  const imageCache = new Map<Source, Promise<string>>()

  for (const [i, source] of notesToMake.entries()) {
    onProgress?.(i, notesToMake.length)
    const parts = segments(source.path)
    const fileName = parts.pop()!
    const dirs = commonRoot ? parts.slice(1) : parts
    const folderId = dirs.length ? await ensureFolder(dirs) : rootFolderId
    const raw = (await source.blob.text()).replace(/^﻿/, '').replace(/\r\n/g, '\n')
    const { body: withoutYaml, tags } = frontMatter(raw)
    const { title, body } = titleAndBody(withoutYaml, fileName)
    // Obsidian's image embeds (![[photo.png]]) as plain Markdown images
    const markdown = body.replace(/!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g, (_, name: string) => `![](${encodeURI(name.trim())})`)
    const blocks = converter.tryParseMarkdownToBlocks(markdown) as unknown as Block[]
    walkBlocks(blocks, quoteToCallout)

    // Images that came along go into the note (compressed, like images added in the editor)
    const pending: Promise<void>[] = []
    walkBlocks(blocks, (block) => {
      const url = block.props?.url
      if (block.type !== 'image' || typeof url !== 'string' || /^(https?|data|blob):/i.test(url)) return
      let path: string
      try {
        path = decodeURIComponent(url.split(/[?#]/)[0])
      } catch {
        path = url
      }
      const here = segments(source.path).slice(0, -1).join('/')
      const found = byPath.get(normalizePath(`${here}/${path}`).toLowerCase()) ?? byName.get(segments(path).pop()?.toLowerCase() ?? '')
      if (!found) return
      if (!imageCache.has(found)) imageCache.set(found, compressImage(found.blob, NOTE_IMAGE).then(blobToDataUrl))
      pending.push(
        imageCache.get(found)!.then(
          (dataUrl) => void (block.props = { ...block.props, url: dataUrl, name: block.props?.name || segments(path).pop() }),
          () => undefined,
        ),
      )
    })
    await Promise.all(pending)

    const id = await createNote(folderId)
    const time = source.modified ?? Date.now()
    await db.notes.update(id, { title, tags: [...new Set(tags)], createdAt: time, updatedAt: time })
    made.push({ id, path: source.path, title, blocks })
  }

  // Links between the imported notes: [[Title]] / [[Title|alias]] and [text](Other%20note.md)
  const idByTitle = new Map<string, { id: string; title: string }>()
  const idByPath = new Map<string, { id: string; title: string }>()
  for (const n of made) {
    if (!idByTitle.has(n.title.toLowerCase())) idByTitle.set(n.title.toLowerCase(), n)
    const name = cleanName(segments(n.path).pop()!).toLowerCase()
    if (!idByTitle.has(name)) idByTitle.set(name, n)
    idByPath.set(stripExt(n.path).toLowerCase(), n)
  }
  const noteLink = (n: { id: string; title: string }): Inline => ({ type: 'noteLink', props: { noteId: n.id, title: n.title } })

  for (const n of made) {
    const here = segments(n.path).slice(0, -1).join('/')
    for (const content of inlineArrays(n.blocks)) {
      const next: Inline[] = []
      for (const item of content) {
        if (item.type === 'link' && item.href && /\.md(#.*)?$/i.test(item.href) && !/^[a-z]+:/i.test(item.href)) {
          let target = item.href.replace(/#.*$/, '')
          try {
            target = decodeURIComponent(target)
          } catch {
            // keep it as written
          }
          const linked = idByPath.get(stripExt(normalizePath(`${here}/${target}`)).toLowerCase())
          next.push(linked ? noteLink(linked) : item)
        } else if (item.type === 'text' && item.text?.includes('[[')) {
          let last = 0
          for (const m of item.text.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)) {
            const linked = idByTitle.get(m[1].trim().toLowerCase())
            if (!linked) continue
            if (m.index > last) next.push({ ...item, text: item.text.slice(last, m.index) })
            next.push(noteLink(linked))
            last = m.index + m[0].length
          }
          if (last < item.text.length) next.push(last ? { ...item, text: item.text.slice(last) } : item)
        } else next.push(item)
      }
      content.splice(0, content.length, ...next)
    }
    await db.notes.update(n.id, { content: n.blocks as unknown as StoredBlock[] })
  }
  onProgress?.(notesToMake.length, notesToMake.length)

  logChange(`Imported ${made.length === 1 ? '1 note' : `${made.length} notes`} from Markdown`, rootFolderId ? { type: 'folder', id: rootFolderId, title: rootName! } : undefined)
  return { notes: made.length, folders, rootFolderId, firstNoteId: made[0]?.id ?? null }
}
