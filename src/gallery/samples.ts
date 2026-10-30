import type { Board, BoardEdge, BoardNode, Note, StoredBlock } from '@/db/schema'

// The components page's sample content: plain objects in memory, shaped like real notes and boards so the app's own
// card and board parts can show them. Nothing here is stored anywhere; a reload starts from these again.

type Styles = Record<string, string | boolean>
const t = (text: string, styles: Styles = {}) => ({ type: 'text', text, styles })
const line = (type: string, text: string | object[], props: Record<string, unknown> = {}): StoredBlock => ({
  type,
  props,
  content: typeof text === 'string' ? [t(text)] : text,
  children: [],
})
const cells = (...texts: string[]) => ({ cells: texts.map((text) => ({ type: 'tableCell', props: {}, content: [t(text)] })) })

const now = Date.now()
const hour = 3600_000
const note = (id: string, title: string, content: StoredBlock[], extra: Partial<Note> = {}): Note => ({
  id,
  title,
  content,
  folderId: null,
  order: 0,
  favorite: false,
  pinned: false,
  tags: [],
  createdAt: now - 72 * hour,
  updatedAt: now,
  ...extra,
})

export const TRIP = note(
  'sample-trip',
  'Trip to Lofoten',
  [
    line('paragraph', 'Ten days in June, ferry from Bodø.'),
    line('checkListItem', 'Book the cabin', { checked: true }),
    line('checkListItem', 'Rain gear', { checked: true }),
    line('checkListItem', 'Hiking maps'),
  ],
  { cover: { assetId: 'lofoten' }, favorite: true, tags: ['travel'], updatedAt: now - 2 * hour },
)
export const SYNC = note(
  'sample-sync',
  'Weekly sync, Oct 27',
  [
    line('heading', 'Decisions', { level: 2 }),
    line('bulletListItem', 'Launch on November 14'),
    line('bulletListItem', 'Beta for 200 people first'),
    line('numberedListItem', 'Freeze the copy'),
    line('numberedListItem', 'Write the release notes'),
  ],
  { cover: { gradient: 'lavender' }, tags: ['work'], updatedAt: now - 5 * hour },
)
export const READING = note(
  'sample-reading',
  'Books to read',
  [line('quote', 'A reader lives a thousand lives before he dies.'), line('checkListItem', 'The Overstory', { checked: true }), line('checkListItem', 'Piranesi')],
  { pinned: true, tags: ['reading'], updatedAt: now - 26 * hour },
)
export const PASTA = note(
  'sample-pasta',
  'Pasta al limone',
  [
    line('callout', 'Save a cup of the pasta water before draining.', { tone: 'tint' }),
    line('paragraph', 'Lemon zest, butter, parmesan and a lot of black pepper. Toss off the heat so the sauce stays glossy.'),
  ],
  { tags: ['home'], updatedAt: now - 50 * hour },
)
/** The notes in the sample folder, newest first */
export const FOLDER_NOTES = [
  note('sample-packing', 'Packing list', [line('checkListItem', 'Wool socks')], { updatedAt: now - 3 * hour }),
  note('sample-tickets', 'Ferry tickets', [line('paragraph', 'Booking reference 4KX-77Q.')], { updatedAt: now - 30 * hour }),
]
export const CARD_NOTES = [TRIP, SYNC, READING, PASTA]

/** A note with every kind of block, for the note page */
export const EVERY_BLOCK = note('sample-blocks', 'Every block', [
  line('paragraph', [
    t('A note shows text in the page font, with '),
    t('bold', { bold: true }),
    t(', '),
    t('italic', { italic: true }),
    t(', '),
    t('underline', { underline: true }),
    t(', '),
    t('strike', { strike: true }),
    t(', '),
    t('inline code', { code: true }),
    t(', a '),
    { type: 'link', href: 'https://lodoc.app', content: [t('link')] },
    t(', a '),
    { type: 'noteLink', props: { noteId: TRIP.id, title: TRIP.title } },
    t(' link and a #tag.'),
  ]),
  line('paragraph', [
    t('Highlights: '),
    t('yellow', { backgroundColor: 'yellow' }),
    t(', '),
    t('green', { backgroundColor: 'green' }),
    t(', '),
    t('blue', { backgroundColor: 'blue' }),
    t(', '),
    t('pink', { backgroundColor: 'pink' }),
    t('. Text colours: '),
    t('red', { textColor: 'red' }),
    t(', '),
    t('blue', { textColor: 'blue' }),
    t('.'),
  ]),
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
])

/** The overview's Scratchpad */
export const SCRATCHPAD: StoredBlock[] = [
  line('checkListItem', 'Call the plumber'),
  line('checkListItem', 'Return library books', { checked: true }),
  line('paragraph', 'Something to keep in view.'),
]

const nodes: BoardNode[] = [
  { id: 'frame', type: 'frame', title: 'Week 1', x: 0, y: 0, width: 660, height: 380 },
  { id: 'trip', type: 'note', noteId: TRIP.id, x: 30, y: 60, width: 260, height: 290 },
  { id: 'sync', type: 'note', noteId: SYNC.id, view: 'title', x: 340, y: 60, width: 280, height: 42 },
  { id: 'text', type: 'text', text: 'Plan the first days around the ferry', size: 'm', x: 340, y: 160, width: 280, height: 80 },
  { id: 'plain', type: 'image', assetId: 'fjord', alt: 'The fjord', x: 720, y: 20, width: 240, height: 180 },
  { id: 'polaroid', type: 'image', assetId: 'sunset', alt: 'Sunset in Reine', style: 'polaroid', x: 740, y: 240, width: 220, height: 200 },
]
const edges: BoardEdge[] = [
  { id: 'e1', source: 'trip', target: 'text' },
  { id: 'e2', source: 'text', target: 'polaroid', label: 'then' },
]
export const BOARD: Board = { id: 'sample-board', title: 'Launch board', nodes, edges, viewport: { x: 30, y: 30, zoom: 0.75 }, createdAt: now - 96 * hour, updatedAt: now - hour }

/** The sample pictures by their asset id: a small landscape each, drawn rather than shipped */
const PICTURES: Record<string, number> = { lofoten: 200, fjord: 210, sunset: 20 }
const drawn = new Map<string, Promise<Blob | undefined>>()

function draw(hue: number): Promise<Blob | undefined> {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  const c = canvas.getContext('2d')
  if (!c) return Promise.resolve(undefined)
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
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? undefined), 'image/png'))
}

/** For useAssetUrl (main.tsx): a sample picture, drawn once */
export function samplePicture(assetId: string): Promise<Blob | undefined> {
  const hue = PICTURES[assetId]
  if (hue === undefined) return Promise.resolve(undefined)
  if (!drawn.has(assetId)) drawn.set(assetId, draw(hue))
  return drawn.get(assetId)!
}
