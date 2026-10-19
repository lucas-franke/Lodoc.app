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
  useEditorState,
  usePortalElement,
  useVirtualKeyboard,
} from '@blocknote/react'
import { List, ListChecks, Redo2, Undo2, type LucideIcon } from 'lucide-react'
import { createPortal } from 'react-dom'

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
        <BlockTypeSelect />
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
