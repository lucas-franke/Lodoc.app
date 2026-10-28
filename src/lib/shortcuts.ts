// Every keyboard shortcut, in one list: shown in the app (ShortcutsDialog, "?") and in the docs (site/, Keyboard shortcuts).

export const SHORTCUT_GROUPS: { title: string; items: [keys: string[], what: string][] }[] = [
  {
    title: 'Everywhere',
    items: [
      [['Ctrl', 'K'], 'Search and commands'],
      [['Ctrl', 'Alt', 'N'], 'New note in the folder you are in'],
      [['Ctrl', 'Alt', 'J'], "Today's journal"],
      [['Ctrl', '\\'], 'Show or hide the sidebar'],
      [['Ctrl', ','], 'Settings'],
      [['Esc'], 'Leave Settings or Activity, back to where you were'],
      [['?'], 'All keyboard shortcuts'],
    ],
  },
  {
    title: 'In a note',
    items: [
      [['/'], 'Insert a block (heading, list, table, image…)'],
      [['#', 'Space'], 'Heading (## and ### for smaller ones)'],
      [['-', 'Space'], 'Bulleted list'],
      [['[]', 'Space'], 'Checklist'],
      [['Ctrl', 'K'], 'Link (with text selected)'],
    ],
  },
  {
    title: 'On a board',
    items: [
      [['Ctrl', 'V'], 'Paste an image'],
      [['Ctrl', 'Z'], 'Undo Tidy up'],
      [['Delete'], 'Remove the selected items (notes are kept)'],
      [['Esc'], 'Finish editing a card'],
      [['Double-click'], 'Edit a card in place'],
    ],
  },
]
