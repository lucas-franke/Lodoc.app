import { Bold, ChevronDown, FileText, Italic, Palette, Plus, Search, Settings, Star, Trash2, Underline } from 'lucide-react'
import { useState } from 'react'
import { EmptyArt } from '@/components/EmptyArt'
import { Choice, OptionGroup, SectionBlock, StrengthSlider, SwitchRow } from '@/components/settings/controls'
import { Tip } from '@/components/Tip'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/components/ui/command'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useConfirm } from '@/hooks/useConfirm'
import { notify } from '@/lib/notify'
import { Caption, Example, Section } from '../Example'

const VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const
const SIZES = ['xs', 'sm', 'default', 'lg'] as const
const ICON_SIZES = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const

export function Interface() {
  const confirm = useConfirm()
  const [starred, setStarred] = useState(true)
  const [chip, setChip] = useState('week')
  const [on, setOn] = useState(true)
  const [strength, setStrength] = useState(50)
  const [pinned, setPinned] = useState(false)
  const [palette, setPalette] = useState(false)

  return (
    <Section id="interface" title="Interface" intro="The controls around the notes: shadcn/ui components in Lodoc's tokens, and the patterns built from them.">
      <Example id="buttons" title="Buttons" source="components/ui/button.tsx">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            {VARIANTS.map((v) => (
              <Button key={v} variant={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </Button>
            ))}
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {SIZES.map((s) => (
              <Button key={s} size={s} variant="outline">
                <Plus aria-hidden /> Size {s}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {ICON_SIZES.map((s) => (
              <Button key={s} size={s} variant="outline" aria-label={s}>
                <Star aria-hidden />
              </Button>
            ))}
            <Toggle aria-label="Favorite" pressed={starred} onPressedChange={setStarred}>
              <Star aria-hidden className={starred ? 'fill-current' : undefined} />
            </Toggle>
            <ToggleGroup type="multiple" variant="outline" defaultValue={['bold']} aria-label="Text style">
              <ToggleGroupItem value="bold" aria-label="Bold">
                <Bold aria-hidden />
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label="Italic">
                <Italic aria-hidden />
              </ToggleGroupItem>
              <ToggleGroupItem value="underline" aria-label="Underline">
                <Underline aria-hidden />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </Example>

      <Example id="fields" title="Fields" source="components/ui/input.tsx, input-group.tsx, textarea.tsx">
        <div className="grid max-w-xl gap-5">
          <div className="space-y-2">
            <Label htmlFor="gallery-name">Folder name</Label>
            <Input id="gallery-name" placeholder="Untitled folder" />
          </div>
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search…" aria-label="Search" />
          </InputGroup>
          <Textarea placeholder="A longer text" aria-label="A longer text" />
        </div>
      </Example>

      <Example id="controls" title="Controls" source="components/ui/switch.tsx, slider.tsx">
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-2">
            <Switch id="gallery-switch" checked={on} onCheckedChange={setOn} />
            <Label htmlFor="gallery-switch">A switch</Label>
          </div>
          <Slider className="w-56" defaultValue={[40]} max={100} thumbLabel="A slider" />
          <Tip label="A tooltip" shortcut="Ctrl+K">
            <Button variant="outline">Point at me</Button>
          </Tip>
        </div>
      </Example>

      <Example id="settings" title="Settings" source="components/settings/controls.tsx">
        <div className="max-w-xl">
          <SectionBlock icon={Palette} title="A settings section" hint="One pattern throughout: the label above, the choices as chips" last>
            <OptionGroup label="A choice" hint="Each option with a radio dot and a small picture">
              <Choice
                label="A choice"
                value={chip}
                onChange={setChip}
                options={[
                  { value: 'day', name: 'Day', icon: <FileText /> },
                  { value: 'week', name: 'Week', icon: <FileText /> },
                  { value: 'month', name: 'Month', icon: <FileText /> },
                ]}
              />
            </OptionGroup>
            <SwitchRow id="gallery-switch-row" label="An on/off setting" hint="The switch beside its label" checked={pinned} onChange={setPinned} />
            <OptionGroup label="Strength">
              <StrengthSlider label="Strength" value={strength} onChange={setStrength} />
            </OptionGroup>
          </SectionBlock>
        </div>
      </Example>

      <Example id="menus" title="Menus and dialogs" source="components/ui/dropdown-menu.tsx, dialog.tsx, command.tsx, context-menu.tsx">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  A menu <ChevronDown aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Note</DropdownMenuLabel>
                <DropdownMenuItem>
                  <FileText aria-hidden /> Open <DropdownMenuShortcut>Enter</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuCheckboxItem checked={starred} onCheckedChange={setStarred}>
                  Favorite
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash2 aria-hidden /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">A dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>A dialog</DialogTitle>
                  <DialogDescription>For a short task, like importing notes or seeing a note's history.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button>Done</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() =>
                confirm({
                  title: 'Delete "Trip to Lofoten"?',
                  description: 'It goes to the trash, where you can restore it for 30 days.',
                  action: 'Delete',
                  onConfirm: () => notify('Deleted (not really: this is the components page)'),
                })
              }
            >
              A confirmation
            </Button>
            {/* In a dialog, as in the app: inline, its list would scroll the page to its first item */}
            <Button variant="outline" onClick={() => setPalette(true)}>
              The command palette
            </Button>
            <CommandDialog open={palette} onOpenChange={setPalette}>
              <CommandInput placeholder="Search notes and commands…" />
              <CommandList>
                <CommandEmpty>Nothing found</CommandEmpty>
                <CommandGroup heading="Notes">
                  <CommandItem>
                    <FileText aria-hidden /> Trip to Lofoten
                  </CommandItem>
                  <CommandItem>
                    <FileText aria-hidden /> Weekly sync, Oct 27
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading="Commands">
                  <CommandItem>
                    <Plus aria-hidden /> New note <CommandShortcut>Ctrl+Alt+N</CommandShortcut>
                  </CommandItem>
                  <CommandItem>
                    <Settings aria-hidden /> Settings <CommandShortcut>Ctrl+,</CommandShortcut>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </CommandDialog>
          </div>
          <ContextMenu>
            <ContextMenuTrigger className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Right-click here (or press and hold)
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>
                Rename <ContextMenuShortcut>F2</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem>Move to…</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </Example>

      <Example id="navigation" title="Navigation" source="components/ui/breadcrumb.tsx">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#navigation">Work</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#navigation">Product launch</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Launch plan</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Example>

      <Example id="toasts" title="Messages" source="lib/notify.ts, components/Notifications.tsx">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => notify('Moved to "Travel"')}>
            Information
          </Button>
          <Button variant="outline" onClick={() => notify('Backup saved', { level: 'success' })}>
            Success
          </Button>
          <Button variant="outline" onClick={() => notify('Could not read that file', { level: 'error' })}>
            Error
          </Button>
          <Button variant="outline" onClick={() => notify('Deleted "Packing list"', { action: { label: 'Undo', onClick: () => notify('Restored') } })}>
            With a button
          </Button>
        </div>
      </Example>

      <Example id="empty" title="Empty states" source="components/EmptyArt.tsx">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-6">
          {(['folder', 'board', 'trash'] as const).map((kind) => (
            <div key={kind} className="flex flex-col items-center text-center">
              <EmptyArt kind={kind} className="h-24" />
              <Caption>An empty {kind}</Caption>
            </div>
          ))}
        </div>
        <Separator className="my-6" />
        <p className="text-sm text-muted-foreground">Separators keep groups apart, like here.</p>
      </Example>
    </Section>
  )
}
