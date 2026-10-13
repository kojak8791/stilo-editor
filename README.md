<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/logo-dark.svg">
    <img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/logo.svg" alt="Stilo" width="300">
  </picture>
</h1>

Open-source HTML5 WYSIWYG editor built on [ProseMirror](https://prosemirror.net).
Clean HTML in and out, headless core, no paid tiers.

> [!WARNING]
> **Preview release.** Versions `0.x` are early previews: the editor works, but APIs may change
> in any minor version until `1.0.0`. Read the release notes before updating.

## Why Stilo

- **Built for very large documents.** Typing stays immediate in a document longer than most
  novels (see [Large documents](#large-documents)). Measured in a real browser, checked against
  budgets, not assumed.
- **Entirely open source (MIT).** Aiming at the feature level of Tiptap or CKEditor 5, with no paid
  tiers and no closed "pro" extensions.
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
| Text color | | | The button applies the last color; its arrow opens a palette, "No color" and a custom color |
| Highlight | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd> | `==text==` | Same button as text color; the shortcut applies the default highlight |
| Clear formatting | <kbd>Ctrl</kbd>+<kbd>\\</kbd> | | Links stay |
| **Links** | | | |
| Link | <kbd>Ctrl</kbd>+<kbd>K</kbd> | | A popover sets the URL and "open in new tab"; on a link, a small bubble offers open, edit and remove |
| **Blocks** | | | |
| Paragraph | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>0</kbd> | | |
| Headings 1–6 | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>1</kbd>…<kbd>6</kbd> | `# ` … `###### ` | Also in the toolbar dropdown |
| Quote | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> | `> ` | |
| Horizontal line | | `---` | |
| Line break | <kbd>Shift</kbd>+<kbd>Enter</kbd> | | New line in the same paragraph |
| Move block up / down | <kbd>Alt</kbd>+<kbd>↑</kbd> / <kbd>Alt</kbd>+<kbd>↓</kbd> | | The block or list item at the cursor, or all the selected ones; sub-items move along |
| **Lists** | | | |
| Bulleted list | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>8</kbd> | `- ` `* ` `+ ` | |
| Numbered list | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>7</kbd> | `1. ` | Starts from the number you type |
| Indent / outdent item | <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | | |
| **Insert** | | | |
| Special characters and emoji | | | A popover with search, symbols and emoji; it stays open to insert several in a row |
| **Editing** | | | |
| Undo | <kbd>Ctrl</kbd>+<kbd>Z</kbd> | | <kbd>Backspace</kbd> right after a Markdown shortcut undoes it |
| Redo | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> or <kbd>Ctrl</kbd>+<kbd>Y</kbd> | | |
| Paste | <kbd>Ctrl</kbd>+<kbd>V</kbd> | | HTML is cleaned up; plain text lines become paragraphs |

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
npm run bench   # performance benchmarks (needs: npx playwright install chromium)
npm run test:e2e # E2E tests in Chromium, Firefox and WebKit (needs: npx playwright install)
```

## License

[MIT](LICENSE) © 2026 Alessio Coggiola

The logo wordmark is drawn from [IBM Plex](https://github.com/IBM/plex), licensed under the
[SIL Open Font License 1.1](https://openfontlicense.org).
