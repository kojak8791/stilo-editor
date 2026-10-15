<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/logo-dark.svg">
    <img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/logo.svg" alt="Stilo" width="300">
  </picture>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/stilo-editor"><img src="https://img.shields.io/npm/v/stilo-editor" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/stilo-editor" alt="MIT license"></a>
  <img src="https://img.shields.io/npm/types/stilo-editor" alt="TypeScript types included">
</p>

Open-source HTML5 WYSIWYG editor built on [ProseMirror](https://prosemirror.net).
Clean HTML in and out, headless core, no paid tiers.

<p align="center">
  <img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/screenshot.png" alt="Stilo with the default toolbar: formatted text, a checklist, a table and the link popover open" width="800">
</p>

<h2 align="center">
  <a href="https://kojak8791.github.io/stilo-editor/">See it in action: try the live demo →</a>
</h2>

> [!WARNING]
> **Preview release.** Versions `0.x` are early previews: the editor works, but APIs may change
> in any minor version until `1.0.0`. Read the release notes before updating.

## Why Stilo

- **Built for very large documents.** Typing stays immediate in a document longer than most
  novels (see [Large documents](https://github.com/kojak8791/stilo-editor#large-documents)).
  Measured in a real browser, checked against budgets, not assumed.
- **Entirely open source (MIT).** Aiming at the feature level of the established rich text
  editors, with no paid tiers and no closed "pro" extensions.
- **HTML is the public format.** Content goes in as HTML and comes out as clean, semantic,
  self-contained HTML, with a strict allowlist for tags, attributes and inline styles.
- **Headless core, optional UI.** The core works without any UI; the default toolbar and menus are
  a separate, replaceable module.
- **Extensible by design.** Every feature is an extension with the same shape.
- **Framework-agnostic.** Vanilla TypeScript first; React/Vue wrappers later as thin layers.

## Large documents

Stilo is made for long documents: contracts, manuals, books, reports. Typing feels immediate in
a document of 10,000 paragraphs — about 400,000 words, longer than most novels — and the editor
stays usable at five times that size, without pagination tricks and without splitting the
content. Formatting, search and selection keep up with the size of the text.

This is measured, not promised. A benchmark drives the editor in a real browser on generated
documents and times everything from loading and exporting the HTML down to the milliseconds
between a key press and the character on screen; every change is checked against performance
budgets. What it means in practice, the numbers and the limits:
[Performance](docs/PERFORMANCE.md).

## Features

What the editor does today, with `defaultExtensions` and the default toolbar. On macOS, use
<kbd>⌘</kbd> for <kbd>Ctrl</kbd> and <kbd>Option</kbd> for <kbd>Alt</kbd>. The *Markdown*
column is what you type to get the format as you write.

| Feature | Keyboard | Markdown | Notes |
|---|---|---|---|
| **Text** | | | |
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
| **Links** | | | |
| Link | <kbd>Ctrl</kbd>+<kbd>K</kbd> | | A popover sets the URL and "open in new tab"; on a link, a small bubble offers open, edit and remove |
| **Blocks** | | | |
| Paragraph | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>0</kbd> | | |
| Headings 1–6 | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>1</kbd>…<kbd>6</kbd> | `# ` … `###### ` | Also in the toolbar dropdown |
| Quote | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> | `> ` | |
| Code block | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>C</kbd> | ```` ``` ```` + space, ```` ```js ```` + space for a language | Plain text in a monospace font, no formatting; the selected paragraphs become one block, a line each, and back. <kbd>Enter</kbd> on an empty last line, or <kbd>Ctrl</kbd>+<kbd>Enter</kbd>, leaves it. The language is written as `class="language-js"` for syntax highlighters |
| Horizontal line | | `---` | |
| Line break | <kbd>Shift</kbd>+<kbd>Enter</kbd> | | New line in the same paragraph |
| Align left / center / right / justify | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> / <kbd>E</kbd> / <kbd>R</kbd> / <kbd>J</kbd> | | Paragraphs and headings; the toolbar button opens the four alignments; changing the block type (also with `# `) keeps the alignment |
| Line spacing | | | Paragraphs and headings; the toolbar menu offers Default, 1, 1.15, 1.5 and 2; changing the block type keeps it |
| Move block up / down | <kbd>Alt</kbd>+<kbd>↑</kbd> / <kbd>Alt</kbd>+<kbd>↓</kbd> | | The block or list item at the cursor, or all the selected ones; sub-items move along |
| **Lists** | | | |
| Bulleted list | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>8</kbd> | `- ` `* ` `+ ` | |
| Numbered list | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>7</kbd> | `1. ` | Starts from the number you type |
| Checklist | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>9</kbd> | `[ ] ` `[x] ` | Click a checkbox, or press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to check the selected items; checked items are struck through |
| Indent / outdent item | <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | | |
| **Tables** | | | |
| Insert a table | | | Toolbar grid up to 10 × 8, with or without a header row |
| Rows, columns, cells | | | With the cursor in a table, the same button opens: insert or delete rows and columns, merge and split cells, header row and column, delete table |
| Table handles | | | Handles on the row and column under the mouse select them and open their menu (insert, delete); a corner handle opens merge, split and delete table |
| Move between cells | <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | | <kbd>Tab</kbd> in the last cell adds a row |
| Select cells | | | Drag across cells |
| Resize a column | | | Drag the border of a column; the width is kept in the HTML |
| **Images** | | | |
| Paste an image | <kbd>Ctrl</kbd>+<kbd>V</kbd> | | A copied image or screenshot is embedded in the HTML (PNG, JPEG, GIF, WebP, up to 5 MB by default); an image copied from a web page keeps its address |
| Resize an image | | | Select it and drag one of its side handles; the proportions stay |
| **Insert** | | | |
| Special characters and emoji | | | A popover with search, symbols and emoji; it stays open to insert several in a row |
| **Editing** | | | |
| Undo | <kbd>Ctrl</kbd>+<kbd>Z</kbd> | | <kbd>Backspace</kbd> right after a Markdown shortcut undoes it |
| Redo | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> or <kbd>Ctrl</kbd>+<kbd>Y</kbd> | | |
| Paste | <kbd>Ctrl</kbd>+<kbd>V</kbd> | | HTML is cleaned up; plain text lines become paragraphs. From Word and Google Docs the body font, size and color are dropped (text that differs keeps them) and Word lists become real lists; tables keep their column widths |
| Paste as plain text | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> | | Only the text, without formatting |
| Find and replace | <kbd>Ctrl</kbd>+<kbd>F</kbd> | | A bar under the toolbar: match case, whole word, previous and next match, replace one or all; the matches are counted exactly and the first 1,000 are highlighted; <kbd>Enter</kbd> / <kbd>Shift</kbd>+<kbd>Enter</kbd> go to the next / previous match, <kbd>Esc</kbd> closes it |
| Word and character count | | | Optional status bar under the editor; also `getWordCount()` in the API |

<table>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/screenshot-find.png" alt="The find bar under the toolbar: five matches of espresso highlighted, the current one in orange, and ristretto in the replace field" width="400"></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/screenshot-table.png" alt="A coffee menu table with a row selected by its handle and the row menu open: insert row above, insert row below, delete row" width="400"></td>
  </tr>
  <tr>
    <td>Find and replace: match case, whole word, an exact count of the matches.</td>
    <td>Tables: handles on rows and columns open their menu.</td>
  </tr>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/screenshot-fonts.png" alt="The font dropdown open on a Times New Roman text, each font drawn in its own font" width="400"></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/screenshot-color.png" alt="The text color palette open, with No color, the color grid and a custom color field" width="400"></td>
  </tr>
  <tr>
    <td>Fonts and sizes: the toolbar shows the font and the size at the cursor.</td>
    <td>Text color and highlight: a palette, the last color one click away, a custom color.</td>
  </tr>
</table>

**Keyboard and accessibility.** Most shortcuts are the ones of Google Docs; the others follow
the usual conventions of web editors, and every toolbar tooltip shows its shortcut. The toolbar
follows the WAI-ARIA *Toolbar* pattern: <kbd>Alt</kbd>+<kbd>F10</kbd> moves the focus from the
text to the toolbar, the arrow keys move between buttons, <kbd>Esc</kbd> goes back to the text.
Every popover works with the keyboard alone and <kbd>Esc</kbd> closes it.

## Usage

```sh
npm install stilo-editor
```

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

editor.getHTML(); // '<p>Hello <strong>world</strong></p>'
```

Options, commands, events, extensions and the toolbar: **[API reference](docs/API.md)**.
Without the default toolbar, import `stilo-editor/content.css` instead of `style.css` and build
your own controls on the same API.

## Support

- **Bugs and feature requests:** open an
  [issue](https://github.com/kojak8791/stilo-editor/issues/new/choose); the forms ask for what
  is needed to reproduce a bug (steps, Stilo version, browser).
- **Questions:** open an issue too, with a short title that says what you are trying to do.
- **Security vulnerabilities:** never in a public issue; report them privately as described in
  [SECURITY.md](SECURITY.md).

Contributions are welcome: start from [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

| Milestone | Content | Status |
|---|---|---|
| M0 — Foundations | Docs, scaffolding, core contracts, HTML pipeline, test helpers, `Bold` reference extension | Done |
| M1 — MVP | Core editing, history, basic marks and blocks, lists, paste cleanup, default toolbar, demo, benchmarks | Done |
| M2 — v1.0 | Preview releases `0.x` on npm, then tables, images, fonts and colors, productivity tools up to `1.0.0` | In progress |
| M3 — Later | Real-time collaboration (Yjs), framework wrappers, embeds | Planned |

Full feature list and priorities in [docs/SPEC.md](docs/SPEC.md).

## How it is built

Stilo is designed and owned by Alessio Coggiola and developed with AI assistance
([Claude](https://claude.com/claude-code)). Every decision is written down before the code
([docs/](docs/), [ADRs](docs/decisions/)), every change goes through the quality gate
(typecheck, lint, about 950 unit tests including XSS vectors) and is tried in the demo before
it is merged, and performance is measured against explicit budgets (`npm run bench`).

| Document | Content |
|---|---|
| [API.md](docs/API.md) | API reference for applications |
| [VISION.md](docs/VISION.md) | Why and what |
| [SPEC.md](docs/SPEC.md) | Features, non-functional requirements, roadmap |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, file layout, extension API, HTML contract |
| [UI.md](docs/UI.md) | Design of the default UI |
| [PERFORMANCE.md](docs/PERFORMANCE.md) | Performance in practice, how it is measured, limits |
| [BACKLOG.md](docs/BACKLOG.md) | Tasks done and planned |
| [AGENTS.md](AGENTS.md) | Rules for contributors and coding agents |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to report bugs and propose changes |
| [SECURITY.md](SECURITY.md) | How to report a vulnerability |

## Development

Requires Node.js 22 or later.

```sh
npm install
npm run check   # typecheck + lint + unit tests
npm run dev     # demo page
npm run site    # public site (published on GitHub Pages from main)
npm run bench   # performance benchmarks (needs: npx playwright install chromium)
npm run test:e2e # E2E tests in Chromium, Firefox and WebKit (needs: npx playwright install)
```

## License

[MIT](LICENSE) © 2026 Alessio Coggiola

The logo wordmark is drawn from [IBM Plex](https://github.com/IBM/plex), licensed under the
[SIL Open Font License 1.1](https://openfontlicense.org).
