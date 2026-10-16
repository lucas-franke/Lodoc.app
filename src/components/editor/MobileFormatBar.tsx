import { FormattingToolbar, PortalElementOverride, UIModeContext, usePortalElement, useVirtualKeyboard } from '@blocknote/react'
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
      <FormattingToolbar />
    </div>,
    portalElement,
  )
}
