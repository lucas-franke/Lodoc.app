import { Monitor, Moon, Palette, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Choice, OptionGroup } from '@/components/settings/controls'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { updateAppearance, useAppearance } from '@/hooks/useAppearance'
import { RADIUS_PRESETS, TEXTURES, TINTS, type Appearance } from '@/lib/appearance'
import { Boards } from './sections/Boards'
import { Cards } from './sections/Cards'
import { Foundations } from './sections/Foundations'
import { Interface } from './sections/Interface'
import { NotePage } from './sections/NotePage'

/** The page's parts and their examples, for the nav */
const NAV = [
  { id: 'foundations', title: 'Foundations', items: [['colors', 'Colours'], ['type', 'Type'], ['shapes', 'Corners and icons'], ['textures', 'Textures'], ['covers', 'Covers']] },
  { id: 'interface', title: 'Interface', items: [['buttons', 'Buttons'], ['fields', 'Fields'], ['controls', 'Controls'], ['settings', 'Settings'], ['menus', 'Menus and dialogs'], ['navigation', 'Navigation'], ['toasts', 'Messages'], ['empty', 'Empty states']] },
  { id: 'note', title: 'Note page', items: [['note-editor', 'A note'], ['scratchpad', 'Scratchpad']] },
  { id: 'cards', title: 'Cards', items: [['note-cards', 'Note cards'], ['card-views', 'Card views'], ['folder-board-cards', 'Folders and boards']] },
  { id: 'boards', title: 'Boards', items: [] },
] as const

/**
 * The components page: everything Lodoc is made of. The examples are the app's own parts on sample content in memory
 * (samples.ts): they open, close and respond like in the app, but nothing is saved. The page has no database at all
 * (vite.components.config.ts refuses to build it with one), so it can never touch anyone's notes.
 */
export function Gallery() {
  return (
    // relative: the page texture (index.css) is a layer that fills its surface
    <div className="relative min-h-dvh bg-background text-foreground" data-texture-surface="">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <a href="../" className="flex shrink-0 items-center gap-2 font-semibold">
            <img src="../favicon.svg" alt="" className="size-6" />
            Lodoc
          </a>
          {/* The narrowest phones leave out the crumb (the page's heading says it) */}
          <span className="text-muted-foreground max-[25rem]:hidden">/</span>
          <span className="truncate font-medium max-[25rem]:hidden">Components</span>
          <nav aria-label="Website" className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="max-sm:hidden">
              <a href="../docs/">Docs</a>
            </Button>
            <AppearanceSheet />
            <Button size="sm" asChild>
              <a href="../">Open app</a>
            </Button>
          </nav>
        </div>
        {/* On phones, the parts as a row of chips */}
        <nav aria-label="Parts of the page" className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 lg:hidden [scrollbar-width:none]">
          {NAV.map((part) => (
            <a key={part.id} href={`#${part.id}`} className="shrink-0 rounded-full border px-3 py-1 text-sm hover:bg-accent">
              {part.title}
            </a>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-7xl gap-10 px-4 sm:px-6">
        <nav aria-label="On this page" className="sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] w-48 shrink-0 overflow-y-auto py-10 lg:block">
          <ul className="space-y-5 text-sm">
            {NAV.map((part) => (
              <li key={part.id}>
                <a href={`#${part.id}`} className="font-medium hover:underline">
                  {part.title}
                </a>
                {part.items.length > 0 && (
                  <ul className="mt-2 space-y-1.5 border-l pl-3 text-muted-foreground">
                    {part.items.map(([id, title]) => (
                      <li key={id}>
                        <a href={`#${id}`} className="hover:text-foreground">
                          {title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 space-y-24 py-10 pb-32">
          <div>
            <h1 className="font-page text-4xl font-bold tracking-tight max-sm:text-3xl">Components</h1>
            <p className="mt-3 max-w-prose text-muted-foreground">
              Everything Lodoc is made of, live: the colours and type, the interface, a note with every block, cards and a
              board. Try them: menus open, buttons respond, and you can type in the note and move things on the board, but
              nothing is saved and your notes are never touched. <strong className="font-medium text-foreground">Appearance</strong>{' '}
              at the top changes the look of Lodoc and its website.
            </p>
          </div>
          <Foundations />
          <Interface />
          <NotePage />
          <Cards />
          <Boards />
        </main>
      </div>
    </div>
  )
}

/** The look (light or dark, tint, page font…), kept like a change in Settings: Lodoc and its website show it too */
function AppearanceSheet() {
  const a = useAppearance()
  const { theme, setTheme } = useTheme()
  const choose =
    <K extends keyof Appearance>(key: K) =>
    (value: Appearance[K]) =>
      updateAppearance({ [key]: value } as Partial<Appearance>)
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Palette aria-hidden />
          {/* Phones: the icon alone, so the header fits with Open app */}
          <span className="max-sm:sr-only">Appearance</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Appearance</SheetTitle>
          <SheetDescription>Applies to Lodoc and its website on this device.</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          <OptionGroup label="Mode">
            <Choice
              label="Color mode"
              value={(theme ?? 'system') as 'light' | 'dark' | 'system'}
              onChange={setTheme}
              options={[
                { value: 'light', name: 'Light', icon: <Sun /> },
                { value: 'dark', name: 'Dark', icon: <Moon /> },
                { value: 'system', name: 'System', icon: <Monitor /> },
              ]}
            />
          </OptionGroup>
          <OptionGroup label="Tint">
            <Choice
              label="Tint"
              value={a.tint}
              onChange={choose('tint')}
              options={TINTS.map((t) => ({
                value: t.id,
                name: t.name,
                icon: <span className="size-4 rounded-[4px] border border-control-border" style={{ backgroundColor: t.chroma ? `oklch(0.78 ${t.chroma * 5} ${t.hue})` : 'var(--background)' }} />,
              }))}
            />
          </OptionGroup>
          <OptionGroup label="Page font">
            <Choice
              label="Page font"
              value={a.pageFont}
              onChange={choose('pageFont')}
              options={[
                { value: 'sans', name: 'Sans', icon: <span data-font-sample="sans">Ag</span> },
                { value: 'serif', name: 'Serif', icon: <span data-font-sample="serif">Ag</span> },
              ]}
            />
          </OptionGroup>
          <OptionGroup label="Text size">
            <Choice
              label="Text size"
              value={a.textSize}
              onChange={choose('textSize')}
              options={[
                { value: 's', name: 'Small' },
                { value: 'm', name: 'Default' },
                { value: 'l', name: 'Large' },
              ]}
            />
          </OptionGroup>
          <OptionGroup label="Corners">
            <Choice label="Corners" value={a.corners} onChange={choose('corners')} options={RADIUS_PRESETS.map((r) => ({ value: r.id, name: r.name }))} />
          </OptionGroup>
          <OptionGroup label="Page texture">
            <Choice
              label="Page texture"
              value={a.texture}
              onChange={choose('texture')}
              options={TEXTURES.map((t) => ({
                value: t.id,
                name: t.name,
                icon: <span data-texture-sample={t.id} className="block size-4 rounded-[3px] border border-control-border bg-background" />,
              }))}
            />
          </OptionGroup>
        </div>
      </SheetContent>
    </Sheet>
  )
}
