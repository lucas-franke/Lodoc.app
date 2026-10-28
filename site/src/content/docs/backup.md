---
title: Backups and moving devices
description: Where your notes are stored, how to keep a copy, and how to bring them to another device or from another app.
order: 6
---

Lodoc stores everything in your browser, on this device. Nothing is sent anywhere, which also means a backup is up to you. **Backup** at the bottom of the sidebar exports and imports; its **Backup settings…** (also **Settings → Backup**) has automatic backups and keeping your data safe.

## Export and import

- **Export all notes** saves notes, folders, boards and their images as one file, `lodoc-2026-10-20.json`. The backup reminder in the sidebar shows when you made the last one.
- **Import from file…** reads such a file and asks how to bring it in:
  - **Merge** adds it to what you have. If a note or board is in both, the more recently edited one is kept. What you deleted here since stays deleted, and your look stays as it is.
  - **Replace** removes everything first and takes the file's notes and look.

## Automatic backup

In Chrome and Edge on a computer, **Settings → Backup → Choose a folder…** writes a backup into a folder you choose whenever something changes, one file per day. The last 7 are kept. After the browser restarts it may ask once before writing again: the Backup tab then offers **Resume**.

## Moving notes between phone and computer

Each device keeps its own notes. To bring them to another one:

1. On the first device, **Export all notes**.
2. Get the file to the other device however suits you: a cable, email to yourself, a cloud drive, a chat with yourself.
3. There, use **Import from file…** and choose **Merge**.

It's a copy, not a sync: after that, each device carries on on its own. A note deleted on the first device stays on the other until you delete it there too.

## Keep data safe in this browser

**Keep data safe** in **Settings → Backup** asks the browser not to clear Lodoc's data when space runs low. The switch stays on once the browser has agreed. The tab also shows how much space Lodoc uses in this browser.

## Coming from another app

**Import Markdown…** brings in `.md` files or a `.zip`, such as a Notion export. On a computer, **Import a Markdown folder…** takes a whole folder, such as an Obsidian vault.

- Folders become folders.
- A first heading becomes the title.
- Tags from the file's front matter are kept.
- Images that come along end up in the notes.
- `[[Wiki links]]` and links between the files become links between notes.

## The other way round

**Download as .md** in a note's menu saves one note as Markdown, and a folder's menu saves the folder as a `.zip` of Markdown files.
