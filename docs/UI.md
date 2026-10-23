# Stilo — Default UI design

How the default UI (`stilo-editor/ui`, [ARCHITECTURE.md](ARCHITECTURE.md) §9) is built and why.
How to use it is in [API.md](API.md) §6; the code (`src/ui/`, `src/styles/ui.css`) is the
reference for the details. A change to the UI updates this document in the same change.

---

## 1. Principles

- The UI is optional and uses only the public core API (`src/index.ts`): `editor.commands` and
  their `.can()`, `editor.isActive()`, `editor.getAttributes()`, `editor.on/off`,
  `editor.focus()`. It uses `editor.view` for two things only: anchoring popovers to the
  selection (`coordsAtPos`, `domAtPos`, `hasFocus()`, mounting next to `view.dom`) and listening
  to DOM events on `view.dom`.
- Plain DOM, no framework, no global mutable state: every piece of state lives in the closure of
  the object that owns it (`createToolbar`, `createPopover`, `createDropdown`, …).
- Everything the UI creates is removed by its `destroy()`: elements, editor handlers, DOM
  listeners, pending animation frames, Floating UI `autoUpdate`. The toolbar destroys itself on
  the editor's `destroy` event.
- Accessibility follows the WAI-ARIA Authoring Practices patterns *Toolbar*, *Menu Button* and
  *Dialog* (SPEC NFR-4). Every action of the mouse-only controls (link bubble, table handles)
  has a keyboard path.
- Floating elements go through one component, `createPopover` (ADR 0002).
- An item whose extension is not loaded is not shown (`isAvailable`, usually
  `'<command>' in editor.commands`).

## 2. Modules

```
src/ui/
├── index.ts                 Public API of the UI (re-exports only)
├── i18n/                    types.ts (MessageKey, Messages), en.ts, it.ts
├── components/
│   ├── icon.ts              createIcon
│   ├── shortcut.ts          formatShortcut, isMacPlatform
│   ├── popover.ts           createPopover
│   ├── dropdown.ts          createDropdown
│   ├── link-popover.ts      createLinkPopover, canEditLink
│   ├── link-bubble.ts       createLinkBubble
│   ├── image-dialog.ts      createImageDialog, canEditImage, selectedImageElement
│   ├── image-button.ts      createImageButton: edit button over an image
│   ├── character-picker.ts  createCharacterPicker
│   ├── characters.ts        SYMBOLS, EMOJI: picker data, a separate chunk
│   ├── color-button.ts      createColorButton: split button and color popover
│   ├── font-size-input.ts   createFontSizeInput: − field + and the list of sizes
│   ├── icon-menu.ts         createIconMenu: icon options in a row
│   ├── find-bar.ts          createFindBar: find and replace under the toolbar
│   ├── table-menu.ts        createTableMenu: insert grid and table operations
│   ├── table-actions.ts     createTableActions: a menu of table operations
│   ├── table-handles.ts     createTableHandles: row, column and corner handles
│   └── status-bar.ts        createStatusBar: word and character count
└── toolbar/
    ├── types.ts             ToolbarItem and the item types
    ├── items.ts             DEFAULT_ITEMS, DEFAULT_TOOLBAR and the item factories
    ├── fonts.ts             DEFAULT_FONTS, DEFAULT_FONT_SIZES
    ├── palette.ts           DEFAULT_PALETTE
    └── toolbar.ts           createToolbar
src/styles/ui.css            All UI styles
```

Tests are colocated (`src/ui/**/<name>.test.ts`). `tests/architecture.test.ts` enforces the
import rules of ARCHITECTURE §2.2.

## 3. Toolbar

### 3.1 Items

The toolbar renders groups of items; each item has a `kind` and the toolbar creates the matching
component. The types, with JSDoc, are in `src/ui/toolbar/types.ts`.

| `kind` | Component | Used by |
|---|---|---|
| `button` | A toolbar button, toggle when it has `isActive` | Most items; custom buttons |
| `dropdown` | `createDropdown` (§5.11): a menu of exclusive options or of actions | `heading`, `fontFamily`, `lineHeight`, `textCase` |
| `color` | `createColorButton` (§5.4): split button and color popover | `textColor`, `highlight` |
| `fontSize` | `createFontSizeInput` (§5.5): − field + | `fontSize` |
| `iconMenu` | `createIconMenu` (§5.6): options as icons in a row | `textAlign` |

`DEFAULT_TOOLBAR` groups: history; text style; font and size; inline formatting, link, clear
formatting and text case; colors; alignment and line spacing; blocks, table, image and characters;
find; full screen. The default buttons follow one rule: `run` calls
`editor.commands.<command>()`, `isEnabled` its `.can()`, `isAvailable` is
`'<command>' in editor.commands`. In a read-only editor every default item except `find` and
`fullscreen` is disabled: `isEnabled` checks `editor.isEditable` first, so the toolbar does not
run the commands' checks, which cost as much as a run there.

| ID | Icon (`lucide`) | Shortcut | Command | `isActive` |
|---|---|---|---|---|
| `undo` / `redo` | `Undo2` / `Redo2` | `Mod-z` / `Mod-Shift-z` | `undo` / `redo` | — |
| `bold` | `Bold` | `Mod-b` | `toggleBold` | `isActive('bold')` |
| `italic` | `Italic` | `Mod-i` | `toggleItalic` | `isActive('italic')` |
| `underline` | `Underline` | `Mod-u` | `toggleUnderline` | `isActive('underline')` |
| `strike` | `Strikethrough` | `Mod-Shift-s` | `toggleStrike` | `isActive('strike')` |
| `code` | `Code` | `Mod-e` | `toggleCode` | `isActive('code')` |
| `subscript` | `Subscript` | `Mod-,` | `toggleSubscript` | `isActive('subscript')` |
| `superscript` | `Superscript` | `Mod-.` | `toggleSuperscript` | `isActive('superscript')` |
| `clearFormatting` | `RemoveFormatting` | `Mod-\` | `clearFormatting` | — |
| `bulletList` | `List` | `Mod-Shift-8` | `toggleBulletList` | `isActive('bulletList')` |
| `orderedList` | `ListOrdered` | `Mod-Shift-7` | `toggleOrderedList` | `isActive('orderedList')` |
| `taskList` | `ListTodo` | `Mod-Shift-9` | `toggleTaskList` | `isActive('taskList')` |
| `blockquote` | `Quote` | `Mod-Shift-b` | `toggleBlockquote` | `isActive('blockquote')` |
| `codeBlock` | `SquareCode` | `Mod-Alt-c` | `toggleCodeBlock` | `isActive('codeBlock')` |
| `horizontalRule` | `Minus` | — | `setHorizontalRule` | — |

The other buttons open a component through the `ToolbarContext` passed to `run` (and, for
`fullscreen`, to `isActive`):

| ID | Icon | Opens | Enabled |
|---|---|---|---|
| `link` | `Link`, `Mod-k` | link popover (§5.1) | `canEditLink`: not at a cursor outside a link |
| `characters` | `FaceSlightlySmilingPlus` | character picker (§5.3) | always (needs `Text`) |
| `table` | `Table` | table menu (§5.9) | in a table, or where `insertTable.can()` |
| `image` | `Image` | image dialog (§5.12); a toggle, pressed on an image or a figure (`isActive('image')`, `isActive('figure')`) | on an image or a figure, or where `insertFigure.can()` |
| `find` | `Search`, `Mod-f` | find bar (§5.7) | always (needs `Search`) |
| `fullscreen` | `Maximize` | full screen (§8), a toggle button | always |

### 3.2 DOM and ARIA

- `div.stilo-toolbar`, `role="toolbar"`, `aria-label` (`toolbar.label`); groups are
  `div.stilo-toolbar__group`, `role="group"`. Every item element has `data-item="<id>"`.
- An unknown item ID throws `StiloError`. A group left empty is not rendered.
- `title`: the label, plus the shortcut in parentheses (§3.6).
- Toggle buttons have `aria-pressed` and, when pressed, `stilo-toolbar__button--active`.
- Disabled items have `aria-disabled="true"` and stay focusable (APG toolbar); activating them
  does nothing.

### 3.3 Mouse

`mousedown` on the toolbar is prevented, so the editor keeps the focus and its DOM selection;
`click` focuses the editor, then runs the item. Components with fields (link popover, color
popover, character picker, font size field) take the focus themselves.

### 3.4 Keyboard

- Roving tabindex: one item has `tabindex="0"`; arrows move between items with wrapping,
  `Home` / `End` go to the ends. Composite items (color split button, font size control) count
  as two or three items with the same `data-item`.
- `Escape` in the toolbar focuses the editor. `Alt-F10` in the editor focuses the toolbar.
- `Escape` in the editor leaves full screen (§8), unless an open popover takes it first.
- `Mod-k` in the editor opens the link popover, `Mod-f` the find bar. The toolbar owns the link
  popover, the link bubble, the table handles, the image dialog and the image edit button even
  without the matching buttons.
- The toolbar handles keys only from its own items, never from inside an open menu.

### 3.5 State refresh

`update()` recomputes `isActive` and `isEnabled` of every item. It runs once when the toolbar
is created, then in a `requestAnimationFrame` after every `transaction` event, with at most one
frame pending: many transactions in one frame cost one refresh, and the refresh never delays the
transaction. Entering or leaving full screen refreshes at once.

### 3.6 Shortcuts in tooltips

`formatShortcut(shortcut, mac)` turns keymap notation into what the platform shows: `Ctrl+Shift+Z`
elsewhere, `⇧⌘Z` on Mac (modifiers in the order `⌃⌥⇧⌘`, no separator). `isMacPlatform()` is read
once by `createToolbar`, never at module top level.

## 4. Popover

`createPopover({ anchor, content, container, placement?, offset?, onClose? })` (internal) is
the only floating element: menus, dialogs and the link bubble use it. `anchor` is an element or
a rectangle (the selection); `onClose` gets the reason: `escape`, `outside` (pointer down outside
the content and the anchor) or `api`.

- Positioned by Floating UI with `strategy: 'absolute'`, `offset`, `flip()` and
  `shift({ padding: 8 })`, refreshed by `autoUpdate` while open.
- The content is appended to `container`, which gets `stilo-popover-host`
  (`position: relative`). The container is chosen so that the popover **scrolls with its
  anchor**: the toolbar for its menus, the editor's element (the parent of `view.dom`) for what
  is anchored to the content. The browser then moves the popover in the same frame as the
  anchor; with `fixed`, every scroll waited for an asynchronous `computePosition` and the popover
  lagged and trembled.
- Trade-off: an ancestor with `overflow: hidden` can clip a popover (`flip()` limits the cases).
  The `--stilo-*` custom properties must be set on a common ancestor of the toolbar and the
  editor, or on `:root`.

## 5. Components

Each entry gives the purpose, where the component is mounted, its accessibility pattern and its
classes (the root class; the markup is visible in the browser's inspector). Unless said
otherwise, a popover closes with `Escape` (focus back to the editor or to its trigger) and with
a pointer down outside (focus does not move).

### 5.1 Link popover

`.stilo-link-popover`, `role="dialog"`, anchored to the selection, mounted in the editor's
element. A URL field, *Open in new tab*, *Apply* and *Remove link* (only on a link). Opens
prefilled from `getAttributes('link')` with the URL selected. *Apply* runs `setLink`, an empty
URL `unsetLink`; a URL the `Link` extension refuses marks the field `aria-invalid` and keeps the
focus.

### 5.2 Link bubble

`.stilo-link-bubble`, `role="group"`: a small popover under the link at the cursor, shown while
the selection is empty, inside a link and the editor focused. Three icon buttons: open in a new
tab, edit (opens the link popover), remove. Not focusable on purpose: the keyboard path is
`Mod-k`. Its `mousedown` is prevented, so the editor keeps the focus.

### 5.3 Character picker

`.stilo-char-picker`, `role="dialog"`, anchored to the `characters` button (SPEC F-904, F-905).
A search field, two tabs (*Symbols*, *Emoji*) and grids of characters by category. The data
(`characters.ts`, names from Unicode / CLDR, English only, no flags since Windows does not draw
them) is loaded with a dynamic `import()` on the first opening: a separate chunk. A character is
inserted with `insertText` and the picker **stays open**, so several go in a row. Keyboard:
`Tab` goes search → tab → grid; arrows move in the grid by reading order and by row across
categories.

### 5.4 Color split button

`.stilo-split` (main part and arrow) and `.stilo-color-picker`, `role="dialog"` (SPEC F-208,
F-209, F-804). The main part applies the **last used color**, shown by a bar under the icon and
kept by the toolbar only (not saved); pressed when the whole selection has it. The popover has
*No color*, *Default* (highlight only: a plain `<mark>`, the browser's own yellow), a swatch grid
(`DEFAULT_PALETTE`: grays, then eight hues in a vivid, a light and a dark row) and a custom color
field with the native picker. A refused custom color marks the field `aria-invalid`. The tooltip
shows no shortcut: `Mod-Shift-h` toggles a plain `<mark>`, not the last color.

### 5.5 Font size control

`.stilo-font-size`: −, a `role="combobox"` field, + and a `role="listbox"` list (SPEC F-211,
F-804).

- The field shows the size the browser **renders** at the selection start, in the item's unit
  (`getFontSize`): it includes headings, `em` and the base size of the page. It is empty when
  the selection has different sizes, and read-only and empty where the size cannot change
  (inside code).
- − and + run `stepFontSize(∓1, unit)`: each part to the previous / next whole number.
- Typing applies with `Enter`: a number in the item's unit, or a number with its own unit; out
  of range (1–400) marks the field `aria-invalid`.
- The unit is `pt` by default because Word and Google Docs paste their sizes in pt and office
  users know the scale; `px` and `pt` are absolute, `rem` follows the page's root size
  ([API.md](API.md) §6.1).

### 5.6 Icon menu (alignment)

`.stilo-icon-menu__trigger` and `.stilo-icon-menu`, `role="menu"`, horizontal (APG Menu Button):
the trigger shows the icon of the active option, the menu the options as icons in a row
(`menuitemradio`). Used by `textAlignMenu()`: left, center, right, justify, each with its
shortcut; active is the alignment of the block at the selection start.

### 5.7 Find bar

`.stilo-find-bar`, `role="search"` (ADR 0004). **Not a popover**: it stays open while the user
edits the text. It floats at the top right under the toolbar, over the content (which does not
move), and follows the sticky toolbar. The toolbar's popovers open over it.

- Opens with the `find` button or `Mod-f` in the editor (outside the editor `Mod-f` stays the
  browser's find); a selection inside one textblock fills the find field.
- Searches 350 ms after the last keystroke, from 2 characters; *Match case* and *Whole word*
  search again at once. `Enter` / `Shift+Enter` go to the next / previous match.
- The count (`aria-live="polite"`) is exact (`getSearchResults`), also beyond the highlighted
  matches.
- The replace row is hidden in a read-only editor, also when the mode changes while the bar is
  open.
- Closing (`Escape`, close button, `find` button) clears the search and focuses the editor; the
  fields keep their text for the next opening.

### 5.8 Status bar

`createStatusBar` (public) → `.stilo-status-bar`, mounted by the host where it wants. It counts
words and characters with `getWordCount` 500 ms after the last `input` event, never on a
keystroke (ADR 0003). Not a live region: screen readers would read it at every pause.

### 5.9 Table menu

`.stilo-table-menu`, `role="dialog"`, anchored to the `table` button (SPEC F-501…F-505, F-805).
Its panel is chosen when it opens:

- **Outside a table**: an insert grid (8 × 10 cells, arrows or mouse, size shown under it) and a
  *Header row* checkbox, checked by default and remembered while the toolbar lives.
- **In a table**: the operations as a `role="menu"` (`createTableActions`): rows, columns, merge
  and split, header row and column (`menuitemcheckbox` from `getTableHeaders`), delete table.
  Items whose `.can()` is false are `aria-disabled`.

It is the keyboard path to every table operation.

### 5.10 Table handles

`.stilo-table-handle` (`--row`, `--column`, `--table`) and their menus, mounted in the editor's
element when the `Table` extension is loaded (SPEC F-805). They sit **outside** the table,
because the table wrapper scrolls sideways and clips what overflows it.

- They follow the cell under the mouse, stay while the mouse is near the table (on its way to a
  handle), then follow the cell of the selection while the editor has the focus; hidden in a
  read-only editor.
- A row or column handle selects its row or column (`selectRow`, `selectColumn`), then opens its
  menu; the corner keeps a cell selection already inside its table (cells to merge), otherwise
  selects the table. The menus are the same `createTableActions` as the table menu.
- Not in the tab order: the keyboard path is the table menu.

### 5.11 Dropdowns

`.stilo-dropdown__trigger` and `.stilo-dropdown__menu`, `role="menu"` (APG Menu Button). The
trigger shows the label of the active option, or `getValueLabel`, or the dropdown label; with
`icon` it shows the icon instead. Options with `isActive` are `menuitemradio`; without it they
are actions (`menuitem`). Arrow keys skip disabled options; when every option is disabled the
trigger is too.

| Item | Options | Notes |
|---|---|---|
| `heading` (`headingDropdown(levels?)`) | Paragraph, Heading 1–6, with shortcuts | The active option stays enabled (`setBlockType` refuses the current type); pass fewer levels when the `Heading` extension has fewer |
| `fontFamily` (`fontFamilyDropdown(fonts?)`) | Default, then `DEFAULT_FONTS`: the generic families, then common fonts with fallbacks | Each label is drawn in its font; a font not in the list (pasted) is shown by its first name. Values are written as the editor normalizes them (ARCHITECTURE §7.3), or `isActive` would not match |
| `lineHeight` (`lineHeightDropdown(values?)`) | Default, 1, 1.15, 1.5, 2 | Icon trigger, values as text; *Default* removes the block's own line height |
| `textCase` | UPPERCASE, lowercase, Title Case, Sentence case, tOGGLE cASE | Actions, each label in its own case; disabled with an empty selection |

### 5.12 Image dialog

`.stilo-image-dialog`, `role="dialog"`, mounted in the editor's element (SPEC F-605, F-606,
F-806). Its mode is chosen when it opens:

- **Edit** (`Edit image`, *Apply*): the selection is on an image or a figure, or in a caption.
  Anchored to the image. Prefilled from `getAttributes('image' | 'figure')`; an embedded image
  (`data:` URL) shows *Embedded image* in the address field and is kept until the field is
  typed in or a file is chosen. No caption field: the caption is edited in the document, so the
  dialog never overwrites its styles. Runs `updateImage`.
- **Insert** (`Insert image`, *Insert*): anchored to the selection. Runs `insertFigure`; the
  *Caption* field is plain text, inserted as typed (`**x**` and `<b>` stay characters).

Compact, about 340 × 145 px: a row per field, the label on the left, the field on the right
(the inputs are named by `aria-label`, since a cell may also hold buttons). *Image*: a 26 px
thumbnail, the address (`https://` as placeholder, focused and selected on open) and an icon
button *Choose file* (`FolderOpen`, a hidden `input type="file"` for PNG, JPEG, GIF and WebP,
read as a `data:` URL). Then *Alt text*, *Caption* (insert only), *Title*, and
*Width (px)* (the natural width as placeholder) with the submit button. The height follows the ratio of the preview, or of the image's own `width` and `height`;
an empty width removes the size. Width and height are sent only when the width or the image
changed, so the size set with the handles stays. An error shows under the fields
(`role="alert"`) and keeps the dialog open: no source, an address the editor refuses, a file of
another type, a file over `maxInlineBytes` (the command refuses its `data:` URL).

### 5.13 Image edit button

`.stilo-image-button` (icon `Pencil`, `aria-haspopup="dialog"`), mounted in the editor's element
when the `Image` extension is loaded. It sits inside the top right corner of the image under the
mouse, else of the selected image or figure (or the figure holding the cursor) while the editor
has the focus; hidden in a read-only editor. A click selects the image or figure and opens the
image dialog to edit it; its `mousedown` is prevented, so the editor keeps the focus. Not in the
tab order: the keyboard path is the `image` button of the toolbar.

## 6. Strings (i18n)

- Keys are dot.case (ARCHITECTURE §4.1), grouped by component (`toolbar.*`, `link.*`,
  `find.*`, …). `MessageKey` lists the built-in keys; the full list with the English strings is
  `src/ui/i18n/en.ts`.
- A locale is a plain object (`Messages`), no functions; placeholders are written `{name}`
  (`{current} of {total}`).
- `labelKey` of a custom item is looked up in the same object; a missing key is shown as is. To
  add strings, spread a locale: `{ ...en, 'myApp.hello': 'Hello' }`.
- A new locale is a new file in `src/ui/i18n/` exported from `src/ui/index.ts`.

## 7. Styles (`src/styles/ui.css`)

- Classes: `stilo-` prefix, BEM (ARCHITECTURE §4.1). Only classes, never IDs or element
  selectors outside a class scope.
- Custom properties have their defaults in **one block at the top of `ui.css`**,
  `:where(:root) { … }`, and are read without fallbacks. `:where()` has no specificity: a host
  rule that sets a property, on `:root` or on any ancestor of the toolbar and the editor, wins
  whatever the order of the stylesheets. Components never declare them, which would block those
  overrides.
- The content has its own styles and properties (`content.css`, usable without `ui.css`):
  [ARCHITECTURE.md §7.6](ARCHITECTURE.md#76-content-styles-contentcss).
- Visible focus: `:focus-visible` outline in `--stilo-color-focus`.
- **Dark theme** (SPEC F-809): every color default is a `light-dark(light, dark)` pair. The
  browser picks the value from the `color-scheme` of the element, which the host sets: `dark`
  on the page or on the editor's box, or `light dark` to follow the system. Without
  `color-scheme` the page is light and nothing changes. No class and no JS: the native fields
  and checkboxes follow the same `color-scheme`. A host property overrides both values; to keep
  two, it writes its own `light-dark()`.
- **Browsers without `light-dark()`** stay light. The `:where(:root)` block holds plain light
  colors; a second block inside `@supports (color: light-dark(#000, #fff))` sets the pairs. Not
  one block with both: a custom property takes any value and is checked only where it is used,
  so an unknown function there would leave the toolbar and the popovers without colors.

| Property | Light | Dark | Use |
|---|---|---|---|
| `--stilo-font-family` | `system-ui, sans-serif` | | UI text |
| `--stilo-font-size` | `14px` | | UI text |
| `--stilo-color-text` | `#1f2328` | `#f0f6fc` | Text and icons |
| `--stilo-color-muted` | `#59636e` | `#9198a1` | Shortcuts in menus, secondary text |
| `--stilo-color-bg` | `#ffffff` | `#0d1117` | Popover, sticky container and full screen background |
| `--stilo-color-toolbar-bg` | `#f9fbfd` | `#151b23` | Toolbar background: barely different from the content, less than the hover |
| `--stilo-color-border` | `#d1d9e0` | `#3d444d` | Popover and field borders |
| `--stilo-color-separator` | `#e4e8ec` | `#2f3742` | Group separators |
| `--stilo-color-hover` | `#eef1f4` | `#262c36` | Button and option hover |
| `--stilo-color-hover-group` | `#f5f7f9` | `#1c222b` | The part of a split button that is not hovered |
| `--stilo-color-active` | `#dde4ee` | `#2a3548` | Pressed button, checked option |
| `--stilo-color-focus` | `#0969da` | `#1f6feb` | Focus ring, primary button |
| `--stilo-color-error` | `#d1242f` | `#f85149` | Border of an invalid field |
| `--stilo-radius` | `6px` | | Buttons, popover |
| `--stilo-toolbar-padding-y` / `-x` | `4px` / `2px` | | Toolbar padding |
| `--stilo-toolbar-gap` | `2px` | | Space between the items of a group |
| `--stilo-toolbar-group-gap` | `4px` | | Space on each side of a group separator |
| `--stilo-toolbar-separator-height` | `18px` | | Height of a group separator |
| `--stilo-toolbar-shadow` | `0 2px 6px rgb(0 0 0 / 0.08)` | `rgb(1 4 9 / 0.6)` | Toolbar shadow while it is stuck at the top |
| `--stilo-toolbar-sticky-top` | `0` | | Distance of the sticky toolbar from the top (e.g. a fixed page header) |
| `--stilo-z-toolbar` | `1001` | | Sticky toolbar: above the content and the popovers anchored to it |
| `--stilo-button-size` | `30px` | | Button height and min width |
| `--stilo-icon-size` | `18px` | | Icons |
| `--stilo-popover-shadow` | `0 8px 24px rgb(0 0 0 / 0.12)` | `rgb(1 4 9 / 0.8)` | Popover |
| `--stilo-z-popover` | `1000` | | Popovers; the find bar one less, so popovers open over it |
| `--stilo-z-fullscreen` | `1040` | | The editor in full screen in browsers without the Popover API (§8); above the page's fixed bars |
| `--stilo-menu-h1-size` … `-h6-size` | `1.5em`, `1.3em`, `1.15em`, `1em`, `1em`, `1em` | | Heading preview in the menu |

The swatches of the color popover get a light inset border in dark, so that dark colors stay
visible.

Layout choices:

- **Sticky toolbar** (`sticky`, default on): the class `stilo-toolbar-host` goes on the
  toolbar's container, not on the toolbar, because a sticky element only moves inside its
  parent. Pure CSS, no scroll listener: the toolbar follows the page when the editor flows in
  it, and stays in place when only the editor content scrolls. An ancestor with `overflow`
  between the container and the scrolling area stops it from sticking (a CSS limit), while
  `overflow: clip` does not. The demo shows the fixed-height layout at `/demo/?fixed`.
- While stuck (`@container scroll-state(stuck: top)`) the toolbar gets a shadow; browsers
  without scroll-state queries show none. The toolbar sets ProseMirror's `scrollMargin` from the
  height of its container, so the selection scrolled into view stays below it.
- **No border and no `overflow` on the toolbar**: the editor's outer border is enough, and
  `overflow` would cut the popovers. The toolbar and the status bar inherit the corner radii of
  their container, so a rounded editor box keeps its corners.
- The font family trigger has a fixed width, so the toolbar does not move with the font name; a
  long name ends with `…`.
- The find bar slides in with a CSS transition (`@starting-style`), none with
  `prefers-reduced-motion`.

## 8. Full screen

The `fullscreen` item (SPEC F-810) makes the editor fill the browser window, not the screen:
the Fullscreen API does not work on iPhone, takes `Escape` for the browser and hides what the
page shows outside the editor, its dialogs included. Together with `F11`, the editor fills the
whole screen.

- **Over the page: the top layer.** Where the Popover API exists, the box gets
  `popover="manual"` and `showPopover()`: the browser draws it in the top layer, over every
  element of the page whatever its `z-index` (a sticky header, a fixed bar), and an ancestor with
  `transform`, `filter` or `contain` does not hold it. A modal `<dialog>` the page opens later
  goes over it. A manual popover does not close by itself nor with `Escape`. Leaving calls
  `hidePopover()` and removes the attribute.
- **Without the Popover API** (older browsers), the box stays in the page: `z-index:
  var(--stilo-z-fullscreen)` (`1040`) places it. A page with fixed or sticky elements above
  that raises the property; it has no effect in the top layer. There an ancestor with
  `transform`, `filter` or `contain` makes `position: fixed` relative to it (a CSS limit), and
  the editor fills that ancestor.

- **Which element**: the nearest ancestor of the toolbar's container that also holds the editor,
  found when full screen starts: the editor's box of the page, or the root element of the React,
  Vue and Svelte components. A status bar inside that box comes along. It gets the class
  `stilo-fullscreen`, the editor's element (the parent of `view.dom`) `stilo-fullscreen__editor`.
- **Layout, pure CSS**: `position: fixed; inset: 0`, a flex column. The toolbar and the status
  bar never scroll: the editor's element takes the height left (`flex: 1 1 auto; min-height: 0`)
  and is the only part that scrolls (`overflow-y: auto`, `overscroll-behavior: contain`),
  whatever `sticky` and whatever the host's layout outside full screen (an editor that flows in
  the page or scrolls inside a frame). The editable area fills it. With `sticky`, the scroll
  margin of ProseMirror drops the toolbar height (§7): the toolbar covers no content. The box
  scrolls itself only when the editor's element is not one of its children. Margins, sizes,
  `max-*` and corner radius are reset; a rule of the page more specific than one class (a fixed
  height, for example) wins: write it for `:not(.stilo-fullscreen)`, as the demo does in
  `?fixed`. The browser's popover look (border, padding, colors) is reset in
  `@layer stilo-fullscreen`: a layer wins over the browser's styles and loses to any rule of the
  page, so the border and the padding of the host's box stay.
- **Leaving**: the button again, or `Escape` in the editor. The listener is a capture on
  `view.dom`, because ProseMirror prevents the default of every `Escape`; an open popover takes
  the key first (capture on the document) and prevents its default, so the first `Escape`
  closes the popover and the second one leaves full screen.
- **Scroll**: out of the flow, the box shortens the page and the browser scrolls it back to the
  top. The toolbar keeps the scroll positions of the scrolled ancestors when full screen starts
  and puts them back when it ends.
- **The page under it** does not scroll and shows no scrollbar: the root element (`<html>`)
  gets the class `stilo-fullscreen-page` (`overflow: hidden`). A class set by the toolbar, not
  `:root:has(.stilo-fullscreen)`, which the browser would check at every change of the DOM,
  typing included. A page that scrolls another element (`body` with its own `overflow`) keeps
  its scrollbar.
- The button works in a read-only editor. `destroy()` leaves full screen.
