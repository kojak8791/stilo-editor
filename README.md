<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/logo-dark.svg">
    <img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/logo.svg" alt="Stilo" width="300">
  </picture>
</p>

<h3 align="center">A complete rich text editor. Everything included, ready in minutes.</h3>

<p align="center">
  Free and open source (MIT) · clean HTML in and out · built on ProseMirror
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/stilo-editor"><img src="https://img.shields.io/npm/v/stilo-editor" alt="npm version"></a>
  <a href="https://github.com/kojak8791/stilo-editor/actions/workflows/ci.yml"><img src="https://github.com/kojak8791/stilo-editor/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <img src="https://img.shields.io/npm/types/stilo-editor" alt="TypeScript types included">
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/stilo-editor" alt="MIT license"></a>
</p>

<p align="center">
  <a href="https://kojak8791.github.io/stilo-editor/"><strong>Live demo</strong></a> ·
  <a href="docs/API.md"><strong>API</strong></a> ·
  <a href="docs/FEATURES.md"><strong>All features</strong></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/kojak8791/stilo-editor/main/assets/screenshot.png" alt="Stilo with the default toolbar: formatted text, a checklist, a table and the link popover open" width="800">
</p>

## Quick start

```sh
npm install stilo-editor
```

```html
<div id="toolbar"></div>
<div id="editor"></div>
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

✅ That is the whole setup.

### Want your own UI?

Skip the toolbar: the core is headless.

```ts
import 'stilo-editor/content.css';
import { Editor, defaultExtensions } from 'stilo-editor';

const editor = new Editor({
  element: document.querySelector<HTMLElement>('#editor')!,
  extensions: [defaultExtensions()],
});

document.querySelector('#bold')!.addEventListener('click', () => editor.commands.toggleBold());
document.querySelector('#undo')!.addEventListener('click', () => editor.commands.undo());
```

Commands, button states and events: [API reference](docs/API.md).

## What's included

- **Text:** bold, italic, underline, strikethrough, code, sub/superscript, fonts, sizes,
  colors, highlight, text case
- **Blocks:** headings, quotes, code blocks, alignment, line spacing, move up/down
- **Lists:** bulleted, numbered, checklists
- **Tables:** insert, merge and split, row and column handles, resizable columns
- **Images:** paste and resize
- **Tools:** links, find and replace, special characters and emoji, word count

Markdown shortcuts as you type, a keyboard shortcut for everything, a toolbar you can drive
from the keyboard alone. Every feature, shortcut and option: [All features](docs/FEATURES.md).

## Why Stilo

- **Clean, safe HTML.** HTML in, semantic HTML out, through a strict allowlist of tags,
  attributes and styles.
- **Paste from Word and Google Docs.** Real lists, kept tables, no stray fonts and colors.
- **Big documents welcome.** Typing stays instant at 10,000 paragraphs
  ([numbers](docs/PERFORMANCE.md)).
- **Tested in Chromium, Firefox and WebKit**, with TypeScript types included.
- **Nothing behind a paywall.** Tables, paste from Word, find and replace: all in the free,
  MIT-licensed package.

## Status

`0.x` preview: it works, but APIs may change in minor versions until `1.0.0`.
Read the [changelog](CHANGELOG.md) before updating.
Next: framework wrappers, real-time collaboration ([roadmap](docs/SPEC.md)).

## Contributing

Bugs, ideas and questions: [issues](https://github.com/kojak8791/stilo-editor/issues/new/choose).
Code: [CONTRIBUTING.md](CONTRIBUTING.md). Vulnerabilities: [SECURITY.md](SECURITY.md).

Designed by Alessio Coggiola and built with [Claude](https://claude.com/claude-code), from a
written [architecture](docs/ARCHITECTURE.md) and [decision records](docs/decisions/).

## License

[MIT](LICENSE) © 2026 Alessio Coggiola. Logo wordmark from
[IBM Plex](https://github.com/IBM/plex) ([OFL 1.1](https://openfontlicense.org)).
