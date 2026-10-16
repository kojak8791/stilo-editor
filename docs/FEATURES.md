# Features

What Stilo does with `defaultExtensions` and the default toolbar. Try each feature in the
[live demo](https://kojak8791.github.io/stilo-editor/); the API behind them is in
[API.md](API.md).

On macOS, use <kbd>⌘</kbd> for <kbd>Ctrl</kbd> and <kbd>Option</kbd> for <kbd>Alt</kbd>. The
*Markdown* column is what you type to get the format as you write.

## Text

| Feature | Keyboard | Markdown | Notes |
|---|---|---|---|
| Bold | <kbd>Ctrl</kbd>+<kbd>B</kbd> | `**text**` | |
| Italic | <kbd>Ctrl</kbd>+<kbd>I</kbd> | `*text*` `_text_` | |
| Underline | <kbd>Ctrl</kbd>+<kbd>U</kbd> | | |
| Strikethrough | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> | `~~text~~` | |
| Inline code | <kbd>Ctrl</kbd>+<kbd>E</kbd> | `` `text` `` | |
| Subscript | <kbd>Ctrl</kbd>+<kbd>,</kbd> | | Subscript and superscript exclude each other |
| Superscript | <kbd>Ctrl</kbd>+<kbd>.</kbd> | | |
| Font family | | | Toolbar dropdown: generic families (sans serif, serif, monospace) and common fonts, each shown in its own font; a font that is not in the list (e.g. pasted from Word) is still shown |
| Font size | | | − and + change the size by one point; the field between them shows the size, takes a typed one and opens a list. Unit pt by default (px or rem as an option) |
| Text color | | | The button applies the last color; its arrow opens a palette, "No color" and a custom color |
| Highlight | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd> | `==text==` | Same button as text color; the shortcut applies the default highlight |
| Clear formatting | <kbd>Ctrl</kbd>+<kbd>\\</kbd> | | Links stay |
| Text case | | | A menu: UPPERCASE, lowercase, Title Case, Sentence case, tOGGLE cASE; the letters change, the formatting stays |

<table>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/screenshot-fonts.png" alt="The font dropdown open on a Times New Roman text, each font drawn in its own font" width="400"></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/screenshot-color.png" alt="The text color palette open, with No color, the color grid and a custom color field" width="400"></td>
  </tr>
  <tr>
    <td>The toolbar shows the font and the size at the cursor.</td>
    <td>A palette, the last color one click away, a custom color.</td>
  </tr>
</table>

## Links

| Feature | Keyboard | Markdown | Notes |
|---|---|---|---|
| Link | <kbd>Ctrl</kbd>+<kbd>K</kbd> | | A popover sets the URL and "open in new tab"; on a link, a small bubble offers open, edit and remove |

<img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/screenshot.png" alt="Stilo with the default toolbar: formatted text, a checklist, a table and the link popover open" width="800">

## Blocks

| Feature | Keyboard | Markdown | Notes |
|---|---|---|---|
| Paragraph | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>0</kbd> | | |
| Headings 1–6 | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>1</kbd>…<kbd>6</kbd> | `# ` … `###### ` | Also in the toolbar dropdown |
| Quote | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> | `> ` | |
| Code block | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>C</kbd> | ```` ``` ```` + space, ```` ```js ```` + space for a language | Plain text in a monospace font, no formatting; the selected paragraphs become one block, a line each, and back. <kbd>Enter</kbd> on an empty last line, or <kbd>Ctrl</kbd>+<kbd>Enter</kbd>, leaves it. The language is written as `class="language-js"` for syntax highlighters |
| Horizontal line | | `---` | |
| Line break | <kbd>Shift</kbd>+<kbd>Enter</kbd> | | New line in the same paragraph |
| Align left / center / right / justify | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> / <kbd>E</kbd> / <kbd>R</kbd> / <kbd>J</kbd> | | Paragraphs and headings; the toolbar button opens the four alignments; changing the block type (also with `# `) keeps the alignment |
| Line spacing | | | Paragraphs and headings; the toolbar menu offers Default, 1, 1.15, 1.5 and 2; changing the block type keeps it |
| Move block up / down | <kbd>Alt</kbd>+<kbd>↑</kbd> / <kbd>Alt</kbd>+<kbd>↓</kbd> | | The block or list item at the cursor, or all the selected ones; sub-items move along |

## Lists

| Feature | Keyboard | Markdown | Notes |
|---|---|---|---|
| Bulleted list | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>8</kbd> | `- ` `* ` `+ ` | |
| Numbered list | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>7</kbd> | `1. ` | Starts from the number you type |
| Checklist | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>9</kbd> | `[ ] ` `[x] ` | Click a checkbox, or press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to check the selected items; checked items are struck through |
| Indent / outdent item | <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | | |

## Tables

| Feature | Keyboard | Markdown | Notes |
|---|---|---|---|
| Insert a table | | | Toolbar grid up to 10 × 8, with or without a header row |
| Rows, columns, cells | | | With the cursor in a table, the same button opens: insert or delete rows and columns, merge and split cells, header row and column, delete table |
| Table handles | | | Handles on the row and column under the mouse select them and open their menu (insert, delete); a corner handle opens merge, split and delete table |
| Move between cells | <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | | <kbd>Tab</kbd> in the last cell adds a row |
| Select cells | | | Drag across cells |
| Resize a column | | | Drag the border of a column; the width is kept in the HTML |

<img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/screenshot-table.png" alt="A coffee menu table with a row selected by its handle and the row menu open: insert row above, insert row below, delete row" width="600">

## Images

| Feature | Keyboard | Markdown | Notes |
|---|---|---|---|
| Paste an image | <kbd>Ctrl</kbd>+<kbd>V</kbd> | | A copied image or screenshot is embedded in the HTML (PNG, JPEG, GIF, WebP, up to 5 MB by default); an image copied from a web page keeps its address |
| Resize an image | | | Select it and drag one of its side handles; the proportions stay |

## Insert

| Feature | Keyboard | Markdown | Notes |
|---|---|---|---|
| Special characters and emoji | | | A popover with search, symbols and emoji; it stays open to insert several in a row |

## Editing

| Feature | Keyboard | Markdown | Notes |
|---|---|---|---|
| Undo | <kbd>Ctrl</kbd>+<kbd>Z</kbd> | | <kbd>Backspace</kbd> right after a Markdown shortcut undoes it |
| Redo | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> or <kbd>Ctrl</kbd>+<kbd>Y</kbd> | | |
| Paste | <kbd>Ctrl</kbd>+<kbd>V</kbd> | | HTML is cleaned up; plain text lines become paragraphs. From Word and Google Docs the body font, size and color are dropped (text that differs keeps them) and Word lists become real lists; tables keep their column widths |
| Paste as plain text | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> | | Only the text, without formatting |
| Find and replace | <kbd>Ctrl</kbd>+<kbd>F</kbd> | | A bar under the toolbar: match case, whole word, previous and next match, replace one or all; the matches are counted exactly and the first 1,000 are highlighted; <kbd>Enter</kbd> / <kbd>Shift</kbd>+<kbd>Enter</kbd> go to the next / previous match, <kbd>Esc</kbd> closes it |
| Word and character count | | | Optional status bar under the editor; also `getWordCount()` in the API |

<img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/screenshot-find.png" alt="The find bar under the toolbar: five matches of espresso highlighted, the current one in orange, and ristretto in the replace field" width="600">

## Keyboard and accessibility

Most shortcuts are the ones of Google Docs; the others follow
the usual conventions of web editors, and every toolbar tooltip shows its shortcut. The toolbar
follows the WAI-ARIA *Toolbar* pattern: <kbd>Alt</kbd>+<kbd>F10</kbd> moves the focus from the
text to the toolbar, the arrow keys move between buttons, <kbd>Esc</kbd> goes back to the text.
Every popover works with the keyboard alone and <kbd>Esc</kbd> closes it.
