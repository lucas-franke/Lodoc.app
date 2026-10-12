# Lodoc

A minimalist, Notion-like note-taking app that runs entirely in the browser. There is no server: notes and boards are stored in the browser's IndexedDB and can be exported/imported as a JSON project file.

[Try it out on lodoc.app](https://lodoc.app/)

## Disclaimer

This Project and its content are written by Claude Code.

## Features

- Block editor ([BlockNote](https://www.blocknotejs.org/)) with slash commands (`/`) for headings, lists, checklists, quotes, code, tables, images and more, plus markdown shortcuts (`#`, `-`, `[]`, …)
- Overview: opening the app (or **Overview** in the sidebar) shows favorites, recently edited notes, folders and boards as cards; new users see a short welcome instead
- Covers: every note gets a colored gradient from a fixed palette by default (a note always keeps the same one). Click the cover to pick another gradient, upload an image (or drop an image file on it), or remove it; **Add cover** brings it back. Note cards show the cover too
- Card views (**Full** / **Cover** / **Title**): the folder view has one switch for all cards; on a board every card has its own view (card menu) and the **Cards** menu in the top-right corner sets all of them at once (new cards start in that view)
- Resizable sidebar: drag its right edge (or focus it and use the arrow keys, double-click to reset) to read long titles; the buttons to create things always stay in view
- Nested folders, favorites, pinned notes (pinned notes stay at the top of their list); notes outside folders are listed under **Unfiled**. The pencil at the top of the sidebar (and `Ctrl+Alt+N`) creates the note in the folder you are in; its tooltip says where
- Drag and drop in the sidebar to reorder notes and folders or move them into other folders (or use **Move up / down** in the row menu)
- **Boards**: an infinite canvas per topic (pan and zoom) with note cards, text annotations and images
  - Add items with the round **+** button (centered while a board is empty, bottom-right otherwise): pick an existing note, add text or a frame, or add images (file picker, paste with `Ctrl+V`, or drop files onto the canvas)
  - Zoom slider (with zoom out/in, the current level as a reset-to-100% button, fit-all and a **minimap** switch; the minimap setting is remembered in this browser) and **Find on board** (search the cards, texts and frames on the board by title or content and jump to the match)
  - **Arrows**: drag from one of the dots that appear on an item's sides to another item (or use **Connect to…** in a card's menu or an item's toolbar). Arrows attach to the nearest side by themselves. Select one to add a label (or double-click it), reverse it or delete it; removing an item removes its arrows
  - **Frames** (**+** → **Frame**): a named area behind the cards, for groups like "To do" or "Ideas". With items selected, the frame is drawn around them. Dragging a frame takes everything that lies completely inside it along; removing it keeps the items
  - Drag a note from the sidebar onto the board to add it as a card at that spot
  - Cards are live views of your notes (renaming or editing a note updates every board); moving, resizing and deleting items is saved automatically; removing a card never deletes the note
  - Double-click a card (or use its pencil button) to edit the note right there, with the full editor and slash commands; one card is edited at a time, `Escape` or the check button finishes
- **Trash**: deleting a note, folder or board moves it to the Trash (no confirmation; the notification offers **Undo**). The Trash page (sidebar, under Overview) restores items with their cards on boards, or deletes them for good; items older than 30 days are removed automatically. Images stay as long as a trashed item uses them
- Small helpers: an info line under the note title (last edit, word count); **Continue where you left off** on the Overview (the note you had open last); a filter field in folders; sidebar sections can be collapsed, and a **Recent** section lists the last edited notes; with two or more notifications open, one offers **Clear all**; board cards hide their details when zoomed far out
- Covers can be switched to "only the ones I picked" (Appearance → Pages → Automatic covers)
- **Outline**: notes with three or more headings show an "On this page" list at the right edge of wide windows; click a heading to jump to it
- **Getting started guide**: a note that shows the basics by example (welcome screen or command palette)
- **Install as an app / offline**: Lodoc can be installed from the browser (it has a web app manifest) and keeps working without a connection once it has been opened (a service worker caches the built files; a new version replaces the cache)
- **Tags**: add tags under a note title ("Add tag", suggestions from tags you already use); each tag has a page with its notes, the sidebar lists them under **Tags**, and the command palette finds them (`#name`)
- **Links between notes**: type `@` in a note to link to another note (or to create one with that name). Links show the current title and open the note; every note lists the notes that link to it under **Linked from**. In Markdown exports a link becomes `[[Title]]`
- **Templates**: **From template** next to "New note" (overview, folders) or the command palette: meeting notes, daily journal, project plan, to-do list
- A new note you never touch (no title, no text, not pinned, favorited or moved) is not kept when you move on to something else
- Full-text search across titles and note content
- Backup: export everything (notes, folders, boards and their images, including note covers) as `lodoc-YYYY-MM-DD.json`; import with **Merge** (the more recently edited note or board wins) or **Replace**
- Light/dark switch at the top right of every page
- **Appearance** panel (bottom of the sidebar): light or dark mode, a soft color tint (pastel in light mode, tinted darks in dark mode), an optional diagonal gradient, page font (sans serif or serif, bundled, nothing loaded from the internet), text size, page width, a connected or floating sidebar, corner roundness and a paper-like grain; every change shows right away
- Notifications stay until you close them
- Download a note as Markdown (`.md`) or a folder with everything in it as a `.zip` of Markdown files: from the button at the top right of the page, or from the right-click menu
- Right-click (or the `…` button) on a note, folder or board for all actions (on touch screens: long press). The open page has the same `…` menu at the top right, plus a star to add a note to favorites. Actions include **Duplicate** (a note, or a folder with all its subfolders and notes)

- **Command palette** (`Ctrl+K`): find any note (title and text, with the match highlighted), folder or board, see what you edited last, and run commands (new note/folder/board, light/dark, Appearance, export backup, Trash, shortcuts)

Shortcuts: `Ctrl+K` command palette · `Ctrl+Alt+N` new note · `Ctrl+\` toggle sidebar · `?` list of all shortcuts

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in dist/, host anywhere
npm run lint
```

Stack: Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui, BlockNote, [React Flow](https://reactflow.dev/) (the board canvas, MIT; its small "React Flow" attribution link stays visible), dnd-kit, Dexie (IndexedDB), zod.

## Where data lives

Notes, boards and images live only in the browser (and browser profile) you use. Clearing site data deletes them, so export regularly. The sidebar shows when you last exported (in amber once it is more than 30 days ago). The Backup menu can also ask the browser to keep the data even when storage runs low. The Trash is not part of the backup, and **Replace** empties it.

The backup file is plain JSON. Images from boards (and images inside notes) are stored inside it as text, so a backup with many large photos gets big; images added to a board are scaled down to at most 2048 px on the long side.

Backup files from earlier versions (notes and folders only) still import. Note that **Replace** makes the app match the file, so it also removes boards that are not in it.

## Project structure

```
src/db/          Dexie schema and CRUD for notes, folders, boards and image assets
src/lib/         project file export/import (format version 3)
src/components/  sidebar, editor, board canvas (board/), drag and drop (dnd/), dialogs; ui/ has the shadcn components
src/hooks/       hash-based routing (#/note/<id>, #/folder/<id>, #/board/<id>, #/tag/<name>, #/trash)
```
