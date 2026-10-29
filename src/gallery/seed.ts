import { addImageAsset } from '@/db/assets'
import { createBoard, takeFreshBoard, updateBoard } from '@/db/boards'
import { db } from '@/db/db'
import { createFolder } from '@/db/folders'
import { createNote, getOverviewNote, setNoteCover, setNoteGradient, toggleFavorite, togglePinned } from '@/db/notes'
import type { BoardEdge, BoardNode, StoredBlock } from '@/db/schema'
import { COVER_GRADIENTS } from '@/lib/gradients'

// The demo data of the components page: a fresh database on every load, so whatever was tried there is gone after a
// reload. Written with the app's own functions, so it is shaped exactly like real notes, folders and boards.

export type Demo = { blocksNote: string; cardNotes: string[]; folder: string; board: string; pad: string }

type Styles = Record<string, string | boolean>
const t = (text: string, styles: Styles = {}) => ({ type: 'text', text, styles })
const line = (type: string, text: string | ReturnType<typeof t>[], props: Record<string, unknown> = {}): StoredBlock => ({
  type,
  props,
  content: typeof text === 'string' ? [t(text)] : text,
  children: [],
})
const cells = (...texts: string[]) => ({ cells: texts.map((text) => ({ type: 'tableCell', props: {}, content: [t(text)] })) })

/** A small landscape, drawn rather than shipped: for the image cover and the board's pictures */
async function picture(name: string, hue: number): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  const c = canvas.getContext('2d')!
  const sky = c.createLinearGradient(0, 0, 0, 480)
  sky.addColorStop(0, `hsl(${hue} 70% 78%)`)
  sky.addColorStop(1, `hsl(${hue + 30} 60% 90%)`)
  c.fillStyle = sky
  c.fillRect(0, 0, 640, 480)
  c.fillStyle = `hsl(${hue + 20} 90% 85%)`
  c.beginPath()
  c.arc(470, 150, 54, 0, Math.PI * 2)
  c.fill()
  const ridge = (y: number, light: number, peaks: number[]) => {
    c.fillStyle = `hsl(${hue + 160} 25% ${light}%)`
    c.beginPath()
    c.moveTo(0, 480)
    peaks.forEach((p, i) => c.lineTo((i / (peaks.length - 1)) * 640, y - p))
    c.lineTo(640, 480)
    c.fill()
  }
  ridge(330, 52, [20, 110, 40, 150, 60, 90, 30])
  ridge(400, 34, [10, 50, 90, 30, 70, 20, 40])
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
  return new File([blob], name, { type: 'image/png' })
}

export async function seedDemo(): Promise<Demo> {
  db.close()
  await db.delete()
  await db.open()

  // Cards: a few notes in different shapes, one with an image cover, one with a picked gradient
  const trip = await createNote(null)
  const sync = await createNote(null)
  const reading = await createNote(null)
  const pasta = await createNote(null)
  const travel = await createFolder('Travel')
  const packing = await createNote(travel)
  const tickets = await createNote(travel)
  const now = Date.now()
  const hour = 3600_000
  const put = (id: string, title: string, content: StoredBlock[], tags: string[], ago: number) =>
    db.notes.update(id, { title, content, tags, updatedAt: now - ago, createdAt: now - ago - 48 * hour })
  await put(trip, 'Trip to Lofoten', [
    line('paragraph', 'Ten days in June, ferry from Bodø.'),
    line('checkListItem', 'Book the cabin', { checked: true }),
    line('checkListItem', 'Rain gear', { checked: true }),
    line('checkListItem', 'Hiking maps'),
  ], ['travel'], 2 * hour)
  await put(sync, 'Weekly sync, Oct 27', [
    line('heading', 'Decisions', { level: 2 }),
    line('bulletListItem', 'Launch on November 14'),
    line('bulletListItem', 'Beta for 200 people first'),
    line('numberedListItem', 'Freeze the copy'),
    line('numberedListItem', 'Write the release notes'),
  ], ['work'], 5 * hour)
  await put(reading, 'Books to read', [
    line('quote', 'A reader lives a thousand lives before he dies.'),
    line('checkListItem', 'The Overstory', { checked: true }),
    line('checkListItem', 'Piranesi'),
  ], ['reading'], 26 * hour)
  await put(pasta, 'Pasta al limone', [
    line('callout', 'Save a cup of the pasta water before draining.', { tone: 'tint' }),
    line('paragraph', 'Lemon zest, butter, parmesan and a lot of black pepper. Toss off the heat so the sauce stays glossy.'),
  ], ['home'], 50 * hour)
  await put(packing, 'Packing list', [line('checkListItem', 'Wool socks'), line('checkListItem', 'Headlamp')], [], 3 * hour)
  await put(tickets, 'Ferry tickets', [line('paragraph', 'Booking reference 4KX-77Q.')], [], 30 * hour)
  await setNoteCover(trip, await picture('lofoten.png', 200))
  await setNoteGradient(sync, COVER_GRADIENTS[3].id)
  await toggleFavorite(trip)
  await togglePinned(reading)

  // The note with every block on the page
  const blocksNote = await createNote(null)
  await put(blocksNote, 'Every block', [
    line('paragraph', [t('A note shows text in the page font, with '), t('bold', { bold: true }), t(', '), t('italic', { italic: true }), t(', '), t('underline', { underline: true }), t(', '), t('strike', { strike: true }), t(', '), t('inline code', { code: true }), t(', a '), { type: 'link', href: 'https://lodoc.app', content: [t('link')] } as never, t(', a '), { type: 'noteLink', props: { noteId: trip, title: 'Trip to Lofoten' } } as never, t(' link and a #tag.')]),
    line('paragraph', [t('Highlights: '), t('yellow', { backgroundColor: 'yellow' }), t(', '), t('green', { backgroundColor: 'green' }), t(', '), t('blue', { backgroundColor: 'blue' }), t(', '), t('pink', { backgroundColor: 'pink' }), t('. Text colours: '), t('red', { textColor: 'red' }), t(', '), t('blue', { textColor: 'blue' }), t('.')]),
    line('heading', 'Heading 1', { level: 1 }),
    line('heading', 'Heading 2', { level: 2 }),
    line('heading', 'Heading 3', { level: 3 }),
    line('quote', 'The best way to have a good idea is to have lots of ideas, and throw away the bad ones.'),
    line('quote', '— Linus Pauling'),
    line('callout', 'Note: the plain callout, for things worth knowing.', { tone: 'neutral' }),
    line('callout', 'Tip: in the colour of your tint. Click the icon to switch tones.', { tone: 'tint' }),
    line('callout', 'Success: something worked out.', { tone: 'green' }),
    line('callout', 'Warning: something to watch out for.', { tone: 'warm' }),
    { ...line('bulletListItem', 'A bullet'), children: [line('bulletListItem', 'A nested bullet')] },
    line('bulletListItem', 'Another bullet'),
    line('numberedListItem', 'First step'),
    line('numberedListItem', 'Second step'),
    line('checkListItem', 'Done', { checked: true }),
    line('checkListItem', 'To do'),
    { ...line('toggleListItem', 'A toggle with more inside'), children: [line('paragraph', 'What was folded away.')] },
    { type: 'divider', props: {}, children: [] },
    line('codeBlock', 'const total = items.length\nconsole.log(`Total: ${total}`)', { language: 'javascript' }),
    {
      type: 'table',
      props: {},
      content: { type: 'tableContent', headerRows: 1, rows: [cells('Day', 'Place', 'Plan'), cells('Mon', 'Reine', 'Ferry at 9:40'), cells('Tue', 'Hamnøy', 'Hike to Reinebringen')] },
      children: [],
    },
    line('paragraph', 'The end.'),
  ], ['ideas', 'tag'], 0)

  // The overview's Scratchpad
  const pad = await getOverviewNote()
  await db.notes.update(pad, {
    content: [line('checkListItem', 'Call the plumber'), line('checkListItem', 'Return library books', { checked: true }), line('paragraph', 'Something to keep in view.')],
  })

  // A board: a frame with two note cards, a text, two pictures (plain and Polaroid) and arrows between them
  const board = await createBoard(null)
  // Not focused as a new board's title would be (the page would jump to it)
  takeFreshBoard(board)
  const plain = await addImageAsset(await picture('fjord.png', 210))
  const polaroid = await addImageAsset(await picture('sunset.png', 20))
  const nodes: BoardNode[] = [
    { id: 'frame', type: 'frame', title: 'Week 1', x: 0, y: 0, width: 660, height: 380 },
    { id: 'trip', type: 'note', noteId: trip, x: 30, y: 60, width: 260, height: 290 },
    { id: 'sync', type: 'note', noteId: sync, view: 'title', x: 340, y: 60, width: 280, height: 56 },
    { id: 'text', type: 'text', text: 'Plan the first days around the ferry', size: 'm', x: 340, y: 160, width: 280, height: 80 },
    { id: 'plain', type: 'image', assetId: plain.id, alt: 'The fjord', x: 720, y: 20, width: 240, height: 180 },
    { id: 'polaroid', type: 'image', assetId: polaroid.id, alt: 'Sunset in Reine', style: 'polaroid', x: 740, y: 240, width: 220, height: 200 },
  ]
  const edges: BoardEdge[] = [
    { id: 'e1', source: 'trip', target: 'text' },
    { id: 'e2', source: 'text', target: 'polaroid', label: 'then' },
  ]
  await db.boards.update(board, { title: 'Launch board' })
  await updateBoard(board, { nodes, edges, viewport: { x: 30, y: 30, zoom: 0.75 } })

  return { blocksNote, cardNotes: [trip, sync, reading, pasta], folder: travel, board, pad }
}
