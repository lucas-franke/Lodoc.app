import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FileCaptionButton,
  FileDeleteButton,
  FileDownloadButton,
  FilePreviewButton,
  FileRenameButton,
  FileReplaceButton,
  FormattingToolbar,
  NestBlockButton,
  PortalElementOverride,
  TableCellMergeButton,
  UIModeContext,
  UnnestBlockButton,
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
  useEditorState,
  usePortalElement,
  useVirtualKeyboard,
  type BlockTypeSelectItem,
} from '@blocknote/react'
import { List, ListChecks, Redo2, Undo2, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useBottomUi } from '@/hooks/useBottomUi'
import { blockTypeItems } from './Callout'

/**
 * Phones: the formatting toolbar as a full-width bar at the bottom of the screen, always there (so a heading
 * or list can be picked before typing), riding on top of the on-screen keyboard while it's open. BlockNote's
 * own mobile toolbar only appears while the keyboard is open; this reuses its positioning (the
 * `bn-mobile-formatting-toolbar` class follows the `--bn-vv-*` viewport variables that `useVirtualKeyboard`
 * keeps up to date) and its "mobile" mode, in which the menus don't take focus from the text, so the
 * keyboard stays open. Render inside `BlockNoteView` with its own formatting toolbar turned off.
 */
export function MobileFormatBar() {
  useVirtualKeyboard()
  useBottomUi('format-bar')
  return (
    // Rendered at the body level: a fixed bar inside the scrolling page can be painted behind it on iOS
    <PortalElementOverride target={document.body}>
      <UIModeContext.Provider value="mobile">
        <Bar />
      </UIModeContext.Provider>
    </PortalElementOverride>
  )
}

function Bar() {
  const portalElement = usePortalElement()
  if (!portalElement) return null
  return createPortal(
    <div className="bn-mobile-formatting-toolbar note-format-bar">
      {/* What a phone needs most comes first: undo (there is no Ctrl+Z), lists and indenting, then styles.
          No text alignment, which is rarely used in notes. The bar scrolls sideways for the rest. */}
      <FormattingToolbar>
        <HistoryButton action="undo" />
        <HistoryButton action="redo" />
        <PhoneBlockTypeSelect />
        <ListButton type="bulletListItem" />
        <ListButton type="checkListItem" />
        <NestBlockButton />
        <UnnestBlockButton />
        <BasicTextStyleButton basicTextStyle="bold" />
        <BasicTextStyleButton basicTextStyle="italic" />
        <CreateLinkButton />
        <TableCellMergeButton />
        <FileCaptionButton />
        <FileReplaceButton />
        <FileRenameButton />
        <FileDeleteButton />
        <FileDownloadButton />
        <FilePreviewButton />
        <BasicTextStyleButton basicTextStyle="underline" />
        <BasicTextStyleButton basicTextStyle="strike" />
        <ColorStyleButton />
      </FormattingToolbar>
    </div>,
    portalElement,
  )
}

function HistoryButton({ action }: { action: 'undo' | 'redo' }) {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor()
  const Icon = action === 'undo' ? Undo2 : Redo2
  const label = action === 'undo' ? 'Undo' : 'Redo'
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label={label}
      mainTooltip={label}
      icon={<Icon className="size-4" />}
      onClick={() => {
        editor.focus()
        editor[action]()
      }}
    />
  )
}

/** The block types a phone offers: headings 1–3, the lists, quotes and callouts (not headings 4–6 or toggle headings) */
const onPhone = (item: BlockTypeSelectItem) =>
  item.type === 'heading' ? Number(item.props?.level) <= 3 && !item.props?.isToggleable : true

/** Whether an item is the block's own type, the way BlockNote's select decides it */
const isBlockType = (item: BlockTypeSelectItem, block: { type: string; props: Record<string, unknown> }) =>
  item.type === block.type && Object.entries(item.props ?? {}).every(([key, value]) => block.props[key] === value)

/**
 * The block type menu with the types a phone needs, so it fits above the keyboard without scrolling. The current
 * block's own type is added when it is another one (a heading 4, say): without a selected item BlockNote hides
 * the menu altogether.
 */
function PhoneBlockTypeSelect() {
  const editor = useBlockNoteEditor()
  const dictionary = useDictionary()
  // A string, so the menu only re-renders when the block's type changes
  const current = useEditorState({
    editor,
    selector: ({ editor }) => {
      const { type, props } = (editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block])[0]
      return JSON.stringify({ type, props })
    },
  })
  const items = useMemo(() => {
    const block = JSON.parse(current) as { type: string; props: Record<string, unknown> }
    return blockTypeItems(dictionary).filter((item) => onPhone(item) || isBlockType(item, block))
  }, [dictionary, current])
  return <BlockTypeSelect items={items} />
}

const LISTS: Record<'bulletListItem' | 'checkListItem', { label: string; icon: LucideIcon }> = {
  bulletListItem: { label: 'Bullet list', icon: List },
  checkListItem: { label: 'Checklist', icon: ListChecks },
}

/** Turns the selected lines into a list of this kind, or back into plain text when they already are one */
function ListButton({ type }: { type: keyof typeof LISTS }) {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor()
  const selectedBlocks = () => editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block]
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      const blocks = (editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block]).filter(
        (block) => block.content !== undefined,
      )
      if (!editor.isEditable || blocks.length === 0) return undefined
      return { active: blocks.every((block) => block.type === type) }
    },
  })
  if (state === undefined) return null
  const { label, icon: Icon } = LISTS[type]
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label={label}
      mainTooltip={label}
      icon={<Icon className="size-4" />}
      isSelected={state.active}
      onClick={() => {
        editor.focus()
        const blocks = selectedBlocks().filter((block) => block.content !== undefined)
        editor.transact(() => {
          for (const block of blocks) editor.updateBlock(block, { type: state.active ? 'paragraph' : type })
        })
      }}
    />
  )
}
