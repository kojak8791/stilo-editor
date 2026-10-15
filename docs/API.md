# Stilo — API reference

The public API of the `stilo-editor` package, for applications that use it. Versions `0.x` are
previews: names and behaviors may still change in any minor version; the release notes on
GitHub say what changed. Contributors find the design and the internals in
[ARCHITECTURE.md](ARCHITECTURE.md) and [UI.md](UI.md).

## 1. Install and import

```sh
npm install stilo-editor
```

| Import | Content |
|---|---|
| `stilo-editor` | The core: `Editor`, `defaultExtensions`, every extension, helpers, types |
| `stilo-editor/ui` | The default UI: toolbar, popovers, UI strings |
| `stilo-editor/style.css` | `content.css` + `ui.css` |
| `stilo-editor/content.css` | Styles of the editable content only, for a custom UI |
| `stilo-editor/ui.css` | Styles of the default UI only |

The package is ESM only and ships its TypeScript types. The core works without the default UI:
import `content.css` instead of `style.css` and build your own controls on the API below.

```ts
import 'stilo-editor/style.css';
import { Editor, defaultExtensions } from 'stilo-editor';
import { createToolbar } from 'stilo-editor/ui';

const editor = new Editor({
  element: document.querySelector<HTMLElement>('#editor')!,
  extensions: [defaultExtensions()],
  content: '<p>Hello <strong>world</strong></p>',
});

createToolbar(editor, { container: document.querySelector<HTMLElement>('#toolbar')! });
```

## 2. Editor

### 2.1 Options

`new Editor(options)` creates the editor inside `options.element`.

| Option | Type | Default | Meaning |
|---|---|---|---|
| `element` | `HTMLElement` | required | Container; the editor appends its own element inside it |
| `extensions` | `Array<Extension \| Extension[]>` | required | Extensions to load; nested arrays (such as `defaultExtensions()`) are flattened |
| `content` | `string` | empty document | Initial HTML |
| `editable` | `boolean` | `true` | Whether the content can be edited |
| `autofocus` | `boolean \| 'start' \| 'end'` | `false` | Focus the editor after creation, optionally with the cursor at the start or end |
| `ariaLabel` | `string` | none | `aria-label` of the editable area |
| `compactParagraphs` | `boolean` | `true` | Write a list item holding one plain paragraph as `<li>text</li>`; `false` writes `<li><p>text</p></li>` |

The editable element has the class `stilo-content`, `role="textbox"` and
`aria-multiline="true"`.

### 2.2 Content

| Member | Returns | Meaning |
|---|---|---|
| `getHTML()` | `string` | The content as clean HTML (§5). The empty document is `<p></p>` |
| `setHTML(html, options?)` | `void` | Replaces the content; the HTML is sanitized first and the cursor goes to the start. `setHTML('')` empties the editor |
| `getJSON()` | `JSONContent` | The ProseMirror JSON of the document |
| `setJSON(json, options?)` | `void` | Replaces the content from ProseMirror JSON |
| `getText()` | `string` | Plain text: top-level blocks separated by a blank line, line breaks as `\n` |
| `isEmpty` | `boolean` | Whether the document is a single empty paragraph |

`setHTML` and `setJSON` take `SetContentOptions`:

| Option | Default | Meaning |
|---|---|---|
| `resetHistory` | `false` | `false`: the replacement is one step that the user can undo. `true`: the editor starts fresh, with an empty undo history (to load another document, or for a "New" button) |
| `emitInput` | `true` | Emit the `input` event |

`getHTML()` serializes the whole document: in a large document, call it when you need it (on
save, or debounced after `input`), not on every change.

### 2.3 Selection state and focus

| Member | Meaning |
|---|---|
| `isActive(name, attrs?)` | Whether a mark (`'bold'`, `'link'`, …) is on all the selected text (with an empty selection: on the next typed character), or the selection is inside a node (`'heading'`, `'bulletList'`, …). With `attrs`, those attributes must match too: `isActive('heading', { level: 2 })` |
| `getAttributes(name)` | The attributes of the mark at the cursor (of the next typed character) or of the first one in the selection, or of the selected node or the innermost ancestor with that name: `getAttributes('link').href`. `{}` when there is none or the name is unknown |
| `focus(position?)` | Focuses the editor; `'start'` or `'end'` also move the cursor there |
| `blur()` | Removes the focus |
| `setEditable(editable)` | Makes the content editable or read-only |
| `isEditable` | Whether the content is editable |
| `destroy()` | Removes the editor and every event handler; calling it twice does nothing |
| `isDestroyed` | Whether `destroy()` was called |

For needs that this API does not cover yet, `editor.view` (the ProseMirror `EditorView`),
`editor.state` and `editor.schema` give access to ProseMirror. They are an escape hatch: their
use is not covered by the guarantees of this document.

### 2.4 Events

```ts
editor.on('input', ({ editor }) => save(editor.getHTML()));
```

`editor.off(event, handler)` removes a handler registered with the same function.

| Event | Payload | When |
|---|---|---|
| `input` | `{ editor, transaction }` | The document changed. `transaction` is `null` after `setHTML` / `setJSON` with `resetHistory: true` |
| `selectionchange` | `{ editor, transaction }` | The selection changed and the document did not |
| `transaction` | `{ editor, transaction }` | Every change of the editor state, including the two above |
| `focus` | `{ editor, event }` | The editor got the focus |
| `blur` | `{ editor, event }` | The editor lost the focus |
| `destroy` | `{ editor }` | `destroy()` was called |
| `imageRejected` | `{ editor, file, reason }` | A pasted image file was not inserted (`Image` extension): `reason` is `'tooLarge'` (over `maxInlineBytes`) or `'unsupportedType'` (not PNG, JPEG, GIF or WebP) |

## 3. Commands

`editor.commands` holds one function per command of the loaded extensions. A command applies
to the current selection and returns `true` when it did something, `false` when it could not
(for example bold inside inline code). Every command also has `.can()`, which takes the same
arguments and tells whether it would apply, without changing anything: use it to enable or
disable your buttons.

```ts
editor.commands.toggleBold();               // true: the selection is now bold
editor.commands.setHeading({ level: 2 });
editor.commands.setLink({ href: 'https://example.com', target: '_blank' });
editor.commands.undo.can();                 // false: nothing to undo
```

A command whose extension is not loaded is `undefined`: `'setLink' in editor.commands` tells
whether it is available.

| Extension | Commands |
|---|---|
| `Document` | `select(from, to?)`: a text selection between two positions, moved to the nearest text position; `false` outside the document. `selectNode(pos)`: `false` without a selectable node at `pos`. `selectAll()` |
| `Text` | `insertText(text)`: replaces the selection with `text`, keeping the marks at the cursor; `false` for an empty string |
| `Paragraph` | `setParagraph()` |
| `Heading` | `setHeading({ level })`, `toggleHeading({ level })`, `level` 1–6 |
| `Blockquote` | `setBlockquote()`, `unsetBlockquote()`, `toggleBlockquote()` |
| `CodeBlock` | `setCodeBlock({ language? })`: turns the selected blocks into one code block, a line each, or changes the language of the code block; `language` is letters, digits, `_` and `-` (`'js'`, `'c-sharp'`), `false` otherwise. `unsetCodeBlock()`: a paragraph per line. `toggleCodeBlock({ language? })` |
| `HorizontalRule` | `setHorizontalRule()` |
| `Table` | `insertTable({ rows?, cols?, withHeaderRow? })`: a table in place of the selection (3 × 3 with a header row by default), the cursor in the first cell; `false` inside a table, for counts that are not whole numbers ≥ 1, or where a table cannot go (a list item). `addRowBefore()`, `addRowAfter()`, `deleteRow()`, `addColumnBefore()`, `addColumnAfter()`, `deleteColumn()`: around the selected cells; delete is `false` when it would remove every row or column (use `deleteTable()`). `mergeCells()`: the selected rectangle of cells (drag across them). `splitCell()`: a merged cell. `selectRow(pos?)`, `selectColumn(pos?)`, `selectTable(pos?)`: select the cells of the row, the column or the table of the cell around `pos` (default: the selection); `false` outside a table. `toggleHeaderRow()`, `toggleHeaderColumn()`: the first row / column becomes header cells (`<th>`), or back. `deleteTable()`. `goToNextCell()` (adds a row in the last cell), `goToPreviousCell()` |
| `HardBreak` | `setHardBreak()` |
| `BulletList` | `toggleBulletList()` |
| `OrderedList` | `toggleOrderedList()` |
| `ListItem` | `splitListItem()`, `sinkListItem()` (indent), `liftListItem()` (outdent) |
| `TaskList` | `toggleTaskList()`: wraps the selection in a task list, lifts the items out, or converts a bulleted or numbered list (and back: the items lose their checked state) |
| `TaskItem` | `splitTaskItem()`, `sinkTaskItem()` (indent), `liftTaskItem()` (outdent). `toggleTaskChecked()`: checks the selected task items, or unchecks them when all are checked; `false` outside a task item and in a code block |
| `Bold`, `Italic`, `Underline`, `Strike`, `Code`, `Subscript`, `Superscript` | `set<Name>()`, `unset<Name>()`, `toggle<Name>()`: `toggleBold()`, `setItalic()`, `unsetCode()`, … |
| `Link` | `setLink({ href, target? })`: links the selection or updates the link at the cursor; `false` for an empty or unsafe `href`. `unsetLink()` |
| `TextStyle` | `setColor(color)`: `false` for an invalid CSS color. `unsetColor()`. `setFontFamily(fontFamily)`: a CSS `font-family` list, `false` when no name is valid. `unsetFontFamily()`. `setFontSize(fontSize)`: `px`, `pt`, `em`, `rem` or `%` (`'14px'`), `false` otherwise. `unsetFontSize()`. Each command keeps the other two styles. `stepFontSize(delta, unit?)`: each selected part goes from the size it has on the page to the next (`delta` 1) or previous (`-1`) whole number in `unit` (`'pt'` default, `'px'`, `'rem'` stepped in px), between 1 and 400 |
| `Highlight` | `setHighlight({ color? })`, `unsetHighlight()`, `toggleHighlight({ color? })`; without `color`, a plain `<mark>`, and `toggleHighlight()` removes a highlight of any color; with `color`, the highlight counts as active only in that color |
| `TextAlign` | `setTextAlign(alignment)`: `'left'`, `'center'`, `'right'` or `'justify'` on the selected paragraphs and headings; `false` for another value or where no block can be aligned |
| `LineHeight` | `setLineHeight(lineHeight)`: a number (`1.5`) or a percentage (`'150%'`, stored as `1.5`) on the selected paragraphs and headings; `false` for zero, `normal`, a length or where no block has a line height. `unsetLineHeight()` |
| `ClearFormatting` | `clearFormatting()`: removes every mark except links |
| `TextCase` | `setTextCase(letterCase)`: changes the characters of the selection, not a style; marks are kept. `'upper'` (UPPERCASE), `'lower'` (lowercase), `'title'` (Title Case: the first letter of each word), `'sentence'` (Sentence case: the first letter after `.` `!` `?` `…` and at the start of the block), `'toggle'` (tOGGLE cASE). `false` for an empty selection |
| `History` | `undo()`, `redo()` |
| `MoveBlock` | `moveBlockUp()`, `moveBlockDown()` |
| `Search` | `setSearch({ text, caseSensitive?, wholeWord? })`: highlights the matches of `text` (taken literally); an empty `text` clears the search. `clearSearch()`. `findNext()`, `findPrevious()`: select the next or previous match, wrapping around, and scroll it to the middle of the view when it is not visible (also while the focus is in a find field, where ProseMirror does not scroll); `false` without a search or a match. `replaceNext(replacement)`: replaces the selected match and selects the next one (selects the next match when the selection is not one). `replaceAll(replacement)`: one undoable step; `false` without matches. The replacement text is inserted as is, with the formatting of the match |

`select(from, to?)` and `selectNode(pos)` take ProseMirror document positions.

`getSearchResults(editor)` returns `{ count, limited, current }` for the active search: the
number of matches in the document, `limited` when only the first `maxMatches` (extension
option) are highlighted, and the 1-based index of the selected match among all of them (`0`
when the selection is not one). The matches have the class `stilo-search-match`, the selected one also
`stilo-search-match--current` (colors in `content.css`).

`getTableHeaders(editor)` returns `{ row, column }`: whether the first row and the first column
of the table at the selection are header cells, `null` outside a table.

Column widths set by dragging a column border are written twice: `data-colwidth` on the cells
(read back by the editor) and a `<colgroup>` with `<col style="width: 120px">` (shown by any
page). A table without widths has neither.

A task list is written as `<ul data-type="taskList">` with `<li data-checked="true">` or
`<li data-checked="false">` items: only the editor draws the checkboxes. To show them on
another page, load `content.css` and put the content in an element with the class
`stilo-content`, or style `li[data-checked]` yourself.

`getWordCount(editor)` returns `{ words, characters }` for the whole document: words are runs of
non-space characters with at least one letter or digit; characters include spaces, not line and
paragraph breaks. The first call reads the whole document, later calls only the blocks that
changed: still, call it on demand or after a pause, not on every change.

## 4. Extensions

Every feature is an extension. `defaultExtensions(options?)` returns the whole set used by the
demo and the default toolbar. Each extension can be turned off with `false`, and those that have
options take an object:

```ts
defaultExtensions({
  code: false,
  heading: { levels: [1, 2, 3] },
  placeholder: { placeholder: 'Write something…' },
});
```

| Name in `defaultExtensions` | Extension | Options |
|---|---|---|
| `doc`, `text`, `paragraph` | `Document`, `Text`, `Paragraph` | — (required: the editor does not start without them) |
| `heading` | `Heading` | `levels`: allowed levels, default `[1, 2, 3, 4, 5, 6]` |
| `blockquote`, `codeBlock`, `horizontalRule`, `hardBreak` | `Blockquote`, `CodeBlock`, `HorizontalRule`, `HardBreak` | — |
| `table` | `Table` (tables, cell selection, column resize) | — |
| `image` | `Image` (inline images: paste of image files, resize handles) | `maxInlineBytes`: largest pasted image file inserted as a data URL, default `5 * 1024 * 1024` (5 MB) |
| `bulletList`, `orderedList`, `listItem` | `BulletList`, `OrderedList`, `ListItem` | — |
| `taskList`, `taskItem` | `TaskList`, `TaskItem` (checklists: a checkbox for each item) | — |
| `bold`, `italic`, `underline`, `strike`, `subscript`, `superscript`, `code` | `Bold`, `Italic`, `Underline`, `Strike`, `Subscript`, `Superscript`, `Code` | — |
| `link` | `Link` | — |
| `textStyle`, `highlight` | `TextStyle` (text color, font family, font size), `Highlight` | — |
| `textAlign` | `TextAlign` (alignment command and shortcuts; aligned content keeps its alignment without it) | — |
| `lineHeight` | `LineHeight` (line spacing commands; content keeps its line spacing without it) | — |
| `clearFormatting` | `ClearFormatting` | — |
| `textCase` | `TextCase` | — |
| `history` | `History` | `depth`: undo steps kept, default `100`. `newGroupDelay`: changes closer than this (ms) are undone together, default `500` |
| `moveBlock` | `MoveBlock` | — |
| `placeholder` | `Placeholder` | `placeholder`: hint shown in the empty editor, default `''` (none) |
| `search` | `Search` (find and replace) | `maxMatches`: only the first matches are highlighted, default `1000`; all are counted, and `findNext` and `replaceAll` reach them all |
| `dropCursor` | `DropCursor` | `color`: CSS color, default `'currentColor'` (`false`: none, style it with `class`). `width` in pixels, default `1`. `class`: extra CSS class |
| `gapCursor` | `GapCursor` | — |

The extensions are also exported one by one, for an editor with only some features. An
extension factory takes its options directly:

```ts
import { Bold, Document, History, Paragraph, Text } from 'stilo-editor';

new Editor({
  element,
  extensions: [Document(), Text(), Paragraph(), Bold(), History({ depth: 50 })],
});
```

The package also exports what extensions are built with (`defineExtension` and helpers such as
`toggleMark`, `isMarkActive`, `markInputRule`). Writing your own extensions is not documented
for users yet; [ARCHITECTURE.md §6](ARCHITECTURE.md#6-extension-api) describes how the built-in
ones work.

## 5. HTML in and out

- **Out:** `getHTML()` writes semantic HTML5 (`<p>`, `<h2>`, `<strong>`, `<ul>`, `<a>`, …),
  without classes or editor attributes. Inline `style` appears only for values that have no
  tag: text color and highlight color (`<span style="color: #e03e2d">`). The output is stable:
  `setHTML(getHTML())` gives back the same string.
- **In:** every HTML that enters the editor (`setHTML`, `content`, paste, drop) is sanitized
  first: scripts, event handlers and unsafe URLs are removed, unknown tags are unwrapped and
  their text kept. Links accept `http:`, `https:`, `mailto:`, `tel:`, relative URLs and
  `#fragments`.
- **Paste** also cleans up what word processors add: from Microsoft Word and Google Docs, the
  font, size, color and line height of the document's body text are dropped (text that differs
  keeps them) and Word's list paragraphs become real lists; pasted tables keep the pixel column
  widths they carry. <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> pastes plain text only.
  Details: [ARCHITECTURE.md §8](ARCHITECTURE.md#8-input-pipeline).
- The full contract, element by element: [ARCHITECTURE.md §7](ARCHITECTURE.md#7-html-contract).

## 6. Default UI (`stilo-editor/ui`)

### 6.1 Toolbar

`createToolbar(editor, options)` appends the toolbar inside `options.container` and returns
`{ element, update(), destroy() }`.

| Option | Default | Meaning |
|---|---|---|
| `container` | required | The toolbar is appended inside it |
| `items` | `DEFAULT_TOOLBAR` | Groups of items: an ID of the default items or a custom item object |
| `messages` | `en` | UI strings |
| `sticky` | `true` | Keeps the toolbar visible at the top of the scrolling area |

A button whose extension is not loaded is not shown. Default item IDs: `undo`, `redo`,
`heading`, `fontFamily`, `fontSize`, `bold`, `italic`, `underline`, `strike`, `code`,
`subscript`, `superscript`,
`link`, `clearFormatting`, `textCase`, `textColor`, `highlight`, `textAlign`, `lineHeight`,
`bulletList`, `orderedList`, `taskList`,
`blockquote`, `codeBlock`, `horizontalRule`, `table`, `characters`, `find`.

The `table` button opens a grid to insert a table (with or without a header row); with the
cursor in a table it opens the table operations instead: rows, columns, merge and split,
header row and column, delete table. With the `Table` extension the toolbar also shows handles
next to the table: on the row and the column of the cell under the mouse (or with the cursor)
and at the corner of the table. A handle selects its row or column and opens its menu (insert,
delete); the corner opens merge, split and delete table.

The `find` button and <kbd>Ctrl</kbd>+<kbd>F</kbd> in the editor open the find bar, a panel
floating under the toolbar (`Search` extension); the button also closes it, and the popovers of
the toolbar open over it while the search stays active. It has a find field, result count,
previous and next match, match case, whole word, replace field, *Replace* and *Replace all*. It
searches 350 ms after the last keystroke and only from 2 characters; <kbd>Enter</kbd> goes to the next match at once,
<kbd>Shift</kbd>+<kbd>Enter</kbd> to the previous one, <kbd>Esc</kbd> closes the bar and clears
the highlights; the searched text stays in the field for the next time. Outside the editor,
<kbd>Ctrl</kbd>+<kbd>F</kbd> stays the browser's find.

```ts
createToolbar(editor, {
  container,
  items: [
    ['undo', 'redo'],
    ['bold', 'italic', 'link'],
    [textColorButton([{ color: '#0b5394', labelKey: 'Brand blue' }])],
  ],
});
```

`textColorButton(palette?)` and `highlightButton(palette?)` create the color buttons with
another palette (default `DEFAULT_PALETTE`). `fontFamilyDropdown(fonts?)` creates the font
dropdown with another list (default `DEFAULT_FONTS`); write a font list as the editor stores it
(names with spaces in single quotes, `, ` between names). `fontSizeInput({ unit?, sizes? })`
creates the font size control (−, a field with a list of sizes, +) with another unit or list:

```ts
fontFamilyDropdown([
  { fontFamily: 'Inter, sans-serif', labelKey: 'Inter' },
  { fontFamily: "'Source Serif 4', serif", labelKey: 'Source Serif' },
]);
fontSizeInput({ unit: 'px', sizes: [12, 14, 16, 20, 24] });
```

The unit of the font size control is `'pt'` by default, like word processors and the sizes
pasted from Word or Google Docs. `'px'` shows and writes px. px and pt are absolute: text with a
size does not follow the page's base size or the reader's default font size. `'rem'` shows px
and writes rem (px divided by the page's root font size), so the text follows them.

`getFontSize(editor, unit?, pos?)` (from `stilo-editor`) returns the size the browser renders at
a position (default: the selection start) in a unit; `toFontSize(editor, value, unit?)` the CSS
size for a number in a unit (`12` → `'12pt'`, `18` in rem → `'1.125rem'` with a 16px root).

### 6.2 Custom buttons

A custom item is an object; `icon` is an icon of the [`lucide`](https://lucide.dev) package
(add `lucide` to your own dependencies to import it):

```ts
import { Minus } from 'lucide';
import { createToolbar, DEFAULT_TOOLBAR, en, type ToolbarButton } from 'stilo-editor/ui';

const emDash: ToolbarButton = {
  id: 'emDash',
  kind: 'button',
  icon: Minus,
  labelKey: 'myApp.emDash',
  run: (editor) => {
    editor.commands.insertText('—');
  },
};

createToolbar(editor, {
  container,
  items: [...DEFAULT_TOOLBAR, [emDash]],
  messages: { ...en, 'myApp.emDash': 'Em dash' },
});
```

| Field of a button | Meaning |
|---|---|
| `id` | Unique in the toolbar |
| `kind` | `'button'` |
| `icon` | A `lucide` icon |
| `labelKey` | Key of the label in `messages`; a missing key is shown as is |
| `shortcut` | Shortcut shown in the tooltip, in keymap notation (`'Mod-b'`); the shortcut itself is defined by an extension |
| `run(editor, context)` | Runs on click. `context.openLinkPopover()` opens the link popover, `context.toggleFindBar()` opens or closes the find bar, `context.toggleTableMenu()` the table menu |
| `isActive(editor)` | Optional: makes it a toggle button and tells when it is pressed |
| `isEnabled(editor)` | Optional, default always enabled |
| `isAvailable(editor)` | Optional: `false` hides the button |

### 6.3 Status bar

`createStatusBar(editor, { container, messages? })` appends a status bar with the word and
character count of the document (`getWordCount`) inside `container`, typically under the
editor. It counts again 500 ms after the last change; it returns `{ element, update(), destroy() }`
and is removed with the editor.

```ts
createStatusBar(editor, { container: document.querySelector('#status')! });
```

### 6.4 Languages

`en` (default) and `it` are exported. To change a few strings, spread a locale:
`{ ...en, 'toolbar.bold': 'Strong' }`. The keys, with the English strings, are in
`src/ui/i18n/en.ts`; the conventions in [UI.md §6](UI.md#6-strings-i18n).

### 6.5 Styles

The look of the toolbar and of the popovers is set with `--stilo-*` CSS custom properties
(colors, font, sizes). Set them on `:root` or on any element that contains both the toolbar and
the editor:

```css
.my-editor {
  --stilo-color-focus: #7c3aed;
  --stilo-font-family: 'Inter', sans-serif;
}
```

The full list is in [UI.md §7](UI.md#7-styles-srcstylesuicss). The content is styled by
`content.css` under the class `stilo-content`: rules such as `.stilo-content h2`, loaded after
it, change it.
