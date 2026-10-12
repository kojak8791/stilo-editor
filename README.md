# Stilo

Open-source HTML5 WYSIWYG editor built on [ProseMirror](https://prosemirror.net).
Clean HTML in and out, headless core, no paid tiers.

> [!WARNING]
> **Work in progress.** Stilo is in its MVP milestone (M1): the editor works in the demo page,
> but nothing is published on npm yet. APIs may change without notice.

## Why Stilo

- **Built for very large documents.** Typing stays fluid in a document of 10,000 paragraphs and
  remains usable at 50,000 (see [Large documents](#large-documents)). Measured in a real browser,
  checked against budgets, not assumed.
- **Entirely open source (MIT).** Aiming at the feature level of Tiptap or CKEditor 5, with no paid
  tiers and no closed "pro" extensions.
- **HTML is the public format.** Content goes in as HTML and comes out as clean, semantic,
  self-contained HTML, with a strict allowlist for tags, attributes and inline styles.
- **Headless core, optional UI.** The core works without any UI; the default toolbar and menus are
  a separate, replaceable module.
- **Extensible by design.** Every feature is an extension with the same shape.
- **Framework-agnostic.** Vanilla TypeScript first; React/Vue wrappers later as thin layers.

## Large documents

Long contracts, manuals, books and reports with tens of thousands of paragraphs can be edited
in the browser, without pagination tricks and without splitting the content. Stilo builds on
[ProseMirror](https://prosemirror.net), which updates only the part of the page that changed,
and adds three rules of its own:

- no work proportional to the whole document on a keystroke: no full-document scans in plugins,
  no HTML serialization per change;
- the browser skips layout and painting of the blocks outside the viewport
  (`content-visibility`): this alone made typing in 10,000 paragraphs six times faster;
- every change can be measured: `npm run bench` drives the editor in Chromium on generated
  documents and fails when a budget is exceeded.

Reference measurements (Chromium, desktop PC, documents with headings, mixed formatting and
links; details in [ADR 0003](docs/decisions/0003-performance-baseline.md)):

| Document | HTML size | Load | Key press to screen (median) | Export `getHTML()` |
|---|---|---|---|---|
| 1,000 paragraphs | 0.4 MB | 0.13 s | under 16 ms | 13 ms |
| 10,000 paragraphs | 4 MB | 1.1 s | 24 ms | 125 ms |
| 50,000 paragraphs | 20 MB | 5.6 s | 150 ms | 0.7 s |
| Nested list, 2,000 items, 8 levels | 0.2 MB | 0.09 s | under 16 ms | 12 ms |

A key press under 16 ms fits in one frame of a 60 Hz screen. Beyond 50,000 paragraphs the limit
is the size of the page itself: Stilo does not virtualize the document, so every block stays in
the DOM and remains searchable, selectable and accessible.

## Usage

The API is usable in the demo page; the package is not on npm yet.

```ts
import { Editor, StarterKit } from 'stilo-editor';

const editor = new Editor({
  element: document.querySelector('#editor')!,
  extensions: [StarterKit()],
  content: '<p>Hello <strong>world</strong></p>',
});

editor.getHTML(); // '<p>Hello <strong>world</strong></p>'
```

## Roadmap

| Milestone | Content | Status |
|---|---|---|
| M0 — Foundations | Docs, scaffolding, core contracts, HTML pipeline, test helpers, `Bold` reference extension | Done |
| M1 — MVP | Core editing, history, basic marks and blocks, lists, paste cleanup, default toolbar, demo, benchmarks | In progress |
| M2 — v1.0 | Tables, images, fonts and colors, productivity tools, first npm release | Planned |
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
| [VISION.md](docs/VISION.md) | Why and what |
| [SPEC.md](docs/SPEC.md) | Features, non-functional requirements, roadmap |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, file layout, extension API, HTML contract |
| [UI.md](docs/UI.md) | Design of the default UI |
| [BACKLOG.md](docs/BACKLOG.md) | Tasks done and planned |
| [AGENTS.md](AGENTS.md) | Rules for contributors and coding agents |

## Development

Requires Node.js 22 or later.

```sh
npm install
npm run check   # typecheck + lint + unit tests
npm run dev     # demo page
npm run bench   # performance benchmarks (needs: npx playwright install chromium)
```

## License

[MIT](LICENSE) © 2026 Alessio Coggiola
