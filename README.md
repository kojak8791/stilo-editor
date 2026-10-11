# Stilo

Open-source HTML5 WYSIWYG editor built on [ProseMirror](https://prosemirror.net).
Clean HTML in and out, headless core, no paid tiers.

> [!WARNING]
> **Work in progress.** Stilo is in its first milestone (M0 — Foundations): the editor does not
> work yet and nothing is published on npm. APIs may change without notice.

## Why Stilo

- **Entirely open source (MIT).** Aiming at the feature level of Tiptap or CKEditor 5, with no paid
  tiers and no closed "pro" extensions.
- **HTML is the public format.** Content goes in as HTML and comes out as clean, semantic,
  self-contained HTML, with a strict allowlist for tags, attributes and inline styles.
- **Headless core, optional UI.** The core works without any UI; the default toolbar and menus are
  a separate, replaceable module.
- **Extensible by design.** Every feature is an extension with the same shape.
- **Measured performance.** Large-document performance is checked by automated benchmarks with
  explicit budgets.
- **Framework-agnostic.** Vanilla TypeScript first; React/Vue wrappers later as thin layers.

## Planned usage

This is the target API. It is not implemented yet.

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
| M0 — Foundations | Docs, scaffolding, core contracts, HTML pipeline, test helpers, `Bold` reference extension | In progress |
| M1 — MVP | Core editing, history, basic marks and blocks, lists, paste cleanup, default toolbar, demo | Planned |
| M2 — v1.0 | Tables, images, fonts and colors, productivity tools, first npm release | Planned |
| M3 — Later | Real-time collaboration (Yjs), framework wrappers, embeds | Planned |

Full feature list and priorities in [docs/SPEC.md](docs/SPEC.md).

## How it is built

Stilo is also an experiment in AI-assisted development. A human project manager and an
"architect" model (Claude) write every decision down first, in [docs/](docs/). A **local LLM**
then implements small, closed tasks ([docs/tasks/](docs/tasks/)), with tests as the contract and
the rules in [AGENTS.md](AGENTS.md). Every task is reviewed before it is merged.

| Document | Content |
|---|---|
| [VISION.md](docs/VISION.md) | Why and what |
| [SPEC.md](docs/SPEC.md) | Features, non-functional requirements, roadmap |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, file layout, extension API, HTML contract |
| [AGENTS.md](AGENTS.md) | Rules for the implementing agent |

## Development

Requires Node.js 22 or later.

```sh
npm install
npm run check   # typecheck + lint + unit tests
npm run dev     # demo page
```

## License

[MIT](LICENSE) © 2026 Alessio Coggiola
