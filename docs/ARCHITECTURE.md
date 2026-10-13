# Stilo — Architecture

Status: **draft v0.1** (2026-10-10). This document is the technical contract; changes go
through an ADR (`docs/decisions/`).

---

## 1. Stack

| Area | Choice |
|---|---|
| Language | TypeScript, `strict` mode, ESM only |
| Editor engine | ProseMirror (`prosemirror-*` packages) |
| Sanitization | DOMPurify |
| Icons (UI only) | `lucide` |
| Popover positioning (UI only) | `@floating-ui/dom` ([ADR 0002](decisions/0002-floating-ui.md)) |
| Build | Vite (library mode) + `tsc` for `.d.ts` |
| Unit tests | Vitest + jsdom |
| E2E & benchmarks | Playwright (`@playwright/test`), Chromium / Firefox / WebKit |
| Lint & format | Biome |
| Package manager | npm (lockfile committed). A move to pnpm is possible later via ADR |
| Node | ≥ 22 (development uses Node 24) |

### 1.1 Dependencies (closed list)

Runtime `dependencies`:

```
prosemirror-model  prosemirror-state  prosemirror-view  prosemirror-transform
prosemirror-commands  prosemirror-keymap  prosemirror-history  prosemirror-inputrules
prosemirror-schema-list  prosemirror-tables  prosemirror-dropcursor  prosemirror-gapcursor
dompurify  lucide  @floating-ui/dom
```

`devDependencies`:

```
typescript  vite  vitest  jsdom  @playwright/test  @biomejs/biome  @types/node
```

Exact versions are pinned by `package-lock.json`. **Adding, removing or upgrading a dependency
requires a decision** (ADR); never run `npm install <pkg>` as a side effect of other work.

ProseMirror packages are regular `dependencies` (not peer). If wrappers or third-party extensions
later need shared instances, we will re-export them from `stilo-editor/pm/*` (ADR when needed).

---

## 2. Package & build outputs

Single npm package `stilo-editor` with subpath exports:

| Import | Content |
|---|---|
| `stilo-editor` | Core: `Editor`, `defineExtension`, all extensions, `StarterKit`, types |
| `stilo-editor/ui` | Default UI: toolbar, menus, dialogs, i18n |
| `stilo-editor/content.css` | Content styles only (includes ProseMirror and prosemirror-tables base CSS) — for headless use |
| `stilo-editor/ui.css` | Default UI styles only |
| `stilo-editor/style.css` | `content.css` + `ui.css` |

Build output in `dist/` (never committed): `index.js`, `ui.js`, `*.d.ts`, `content.css`, `ui.css`,
`style.css`.
`package.json` has `"type": "module"`, `"sideEffects": ["**/*.css"]`.

Framework wrappers (M3) will be separate packages; the repo may then become an npm workspace (ADR).

### 2.2 Headless-first dependency rules

The default UI is a convenience, not a requirement: using only the core and building a custom UI
is a first-class scenario. Allowed import directions:

```
src/ui/          ──► src/index.ts (public core API only)
src/extensions/  ──► src/core/
src/core/        ──► (ProseMirror, DOMPurify only)
```

- `src/core/` and `src/extensions/` **never** import from `src/ui/`, `lucide` or `@floating-ui/dom`.
- `src/ui/` imports the core **only** through `src/index.ts`, never from `src/core/**` or
  `src/extensions/**` directly.
- Everything a UI needs (command execution, `can()`, `isActive()`, events, node attributes of the
  selection) must be available in the public core API. If our UI needs something that is not
  public, the core API is extended — the UI never takes a shortcut.
- These rules are enforced by `tests/architecture.test.ts` (scans import statements), part of
  `npm run check`.

### 2.1 npm scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Demo page with hot reload (`demo/`) |
| `build` | `vite build && tsc -p tsconfig.build.json` | Library build + declarations |
| `typecheck` | `tsc --noEmit` | Type checking |
| `lint` | `biome check .` | Lint + format check |
| `format` | `biome check --write .` | Auto-fix lint/format |
| `test` | `vitest run` | Unit tests |
| `test:watch` | `vitest` | Unit tests, watch mode |
| `test:e2e` | `playwright test` | E2E tests |
| `bench` | `playwright test -c playwright.bench.config.ts` | Performance benchmarks |
| `size` | `npm run build && node scripts/size.mjs` | Bundle size of typical apps, tree-shaking check |
| `check` | `npm run typecheck && npm run lint && npm run test` | **Quality gate** |

---

## 3. File layout

```
stilo-editor/
├── AGENTS.md                     Rules for contributors and coding agents
├── README.md
├── LICENSE                       MIT
├── package.json / package-lock.json
├── tsconfig.json                 Dev/typecheck config (src, tests, demo, bench)
├── tsconfig.build.json           Declarations for src/ only
├── vite.config.ts                Library build + demo dev server
├── vitest.config.ts
├── playwright.config.ts          E2E
├── playwright.bench.config.ts    Benchmarks
├── biome.json
├── docs/
│   ├── VISION.md  SPEC.md  ARCHITECTURE.md  UI.md  PERFORMANCE.md  BACKLOG.md
│   ├── decisions/                ADRs: NNNN-short-title.md
│   └── guides/                   How-to guides
├── src/
│   ├── index.ts                  Public API of the core (re-exports only)
│   ├── core/
│   │   ├── editor.ts             Editor class
│   │   ├── extension.ts          defineExtension + extension types
│   │   ├── extension-manager.ts  Builds schema, plugins, keymaps, input rules, commands
│   │   ├── events.ts             Typed event emitter
│   │   ├── types.ts              Shared public types (Commands interface, events, options)
│   │   ├── errors.ts             StiloError
│   │   ├── helpers/              Pure helpers (isMarkActive, findParentNode, ...)
│   │   └── html/
│   │       ├── sanitize.ts       DOMPurify instance + config + hooks
│   │       ├── css.ts            CSS allowlist, parse/normalize/build style strings
│   │       ├── parse.ts          HTML string -> ProseMirror doc
│   │       ├── serialize.ts      ProseMirror doc -> HTML string
│   │       └── paste/            Word / Google Docs cleanup (M2)
│   ├── extensions/
│   │   ├── index.ts              Re-exports all extensions
│   │   ├── starter-kit/          StarterKit() bundle
│   │   ├── document/  text/  paragraph/  heading/  blockquote/  ...
│   │   └── <name>/
│   │       ├── index.ts          export const <Name> = defineExtension({...})
│   │       ├── <name>.test.ts    Unit tests (colocated)
│   │       └── ...               Optional: commands.ts, plugin.ts, node-view.ts
│   ├── ui/
│   │   ├── index.ts              Public API of the UI
│   │   ├── toolbar/  menus/  dialogs/  components/
│   │   └── i18n/                 en.ts, it.ts, types.ts
│   └── styles/
│       ├── index.css             Entry: imports the files below
│       ├── content.css           Editable content defaults (scoped to .stilo-content)
│       └── ui.css                UI styles
├── demo/
│   ├── index.html
│   └── main.ts
├── tests/
│   ├── helpers/                  createTestEditor, selection markers, fixtures loader
│   ├── fixtures/                 html/ (word, gdocs, ...), xss/
│   └── e2e/                      *.spec.ts (Playwright)
├── scripts/
│   └── size.mjs                  Bundle size report (`npm run size`)
└── bench/
    ├── generators/               Benchmark document generators
    ├── *.bench.ts                Playwright benchmarks
    └── results/                  JSON output (git-ignored except baseline.json)
```

---

## 4. Conventions

### 4.1 Naming

| Thing | Convention | Example |
|---|---|---|
| Files and folders | kebab-case | `bullet-list/index.ts`, `move-block.ts` |
| Extension factory (exported const) | PascalCase | `BulletList` |
| Extension `name` | camelCase, equal to its main node/mark | `bulletList` |
| Node / mark names | camelCase | `listItem`, `tableHeader`, `textStyle` |
| Commands | camelCase verb | `toggleBold`, `setHeading`, `moveBlockUp` |
| Types / interfaces | PascalCase | `EditorOptions` |
| CSS classes | `stilo-` prefix, BEM | `stilo-toolbar__button--active` |
| CSS custom properties | `--stilo-` prefix | `--stilo-toolbar-bg` |
| i18n keys | dot.case | `toolbar.bold` |

### 4.2 Code rules

- Named exports only, **no default exports** (except config files).
- No `any`. Use `unknown` + narrowing.
- No TypeScript `enum`: use string literal unions.
- No DOM access at module top level (the core must be importable in Node).
- No global mutable state: everything lives in the `Editor` instance, plugin state, or closures.
- Relative imports without file extension (`moduleResolution: "Bundler"`). No path aliases.
- Public API (everything exported from `src/index.ts` and `src/ui/index.ts`) has JSDoc.
- Code, comments, docs and commit messages in **English**.
- Errors: `throw new StiloError('message')` (`src/core/errors.ts`), messages prefixed by context.

### 4.3 Formatting (Biome)

2 spaces, single quotes, semicolons, trailing commas, line width 100. Run `npm run format`.

---

## 5. Editor API

```ts
import { Editor, StarterKit } from 'stilo-editor';

const editor = new Editor({
  element: document.querySelector('#editor')!,
  extensions: [StarterKit()],
  content: '<p>Hello <strong>world</strong></p>',
});
```

```ts
interface EditorOptions {
  element: HTMLElement;                    // container; the editor appends its own DOM inside
  extensions: Array<Extension | Extension[]>; // flattened
  content?: string;                        // initial HTML (default: empty document)
  editable?: boolean;                      // default true
  autofocus?: boolean | 'start' | 'end';   // default false
  ariaLabel?: string;                      // aria-label of the editable area
  compactParagraphs?: boolean;             // default true: <li>text</li> (ADR 0001)
}

class Editor {
  constructor(options: EditorOptions);

  readonly view: EditorView;               // escape hatch
  readonly schema: Schema;
  get state(): EditorState;
  get isEmpty(): boolean;
  get isEditable(): boolean;
  get isDestroyed(): boolean;

  getHTML(): string;
  setHTML(html: string, options?: SetContentOptions): void;
  getJSON(): JSONContent;                  // = doc.toJSON()
  setJSON(json: JSONContent, options?: SetContentOptions): void;
  getText(): string;

  readonly commands: CommandRunners;       // editor.commands.toggleBold() -> boolean
  can(): CommandRunners;                   // dry run, no dispatch
  isActive(name: string, attrs?: Record<string, unknown>): boolean;
  getAttributes(name: string): Record<string, unknown>;

  setEditable(editable: boolean): void;
  focus(position?: 'start' | 'end'): void;
  blur(): void;

  on<E extends keyof EditorEvents>(event: E, handler: (payload: EditorEvents[E]) => void): void;
  off<E extends keyof EditorEvents>(event: E, handler: (payload: EditorEvents[E]) => void): void;

  destroy(): void;
}

interface EditorEvents {
  transaction: { editor: Editor; transaction: Transaction };
  update: { editor: Editor; transaction: Transaction };          // doc changed
  selectionUpdate: { editor: Editor; transaction: Transaction }; // selection changed, doc not
  focus: { editor: Editor; event: FocusEvent };
  blur: { editor: Editor; event: FocusEvent };
  destroy: { editor: Editor };
}
```

Semantics:

- `setHTML` / `setJSON` options:

  ```ts
  interface SetContentOptions {
    resetHistory?: boolean; // default false
    emitUpdate?: boolean;   // default true
  }
  ```

  - `resetHistory: false` (default): the whole content is replaced by **one undoable transaction**,
    never grouped with the changes before it (`closeHistory`); the selection goes to the start of
    the document.
  - `resetHistory: true`: a fresh `EditorState` is created with the same plugins (all plugin
    states, history included, start from scratch). Typical use: a "New document" button calls
    `setHTML('', { resetHistory: true })`, or loading a different document.
  - `update` is emitted unless `emitUpdate: false`.
  - `setHTML('')` produces the empty document (`<p></p>`).
- Empty document `getHTML()` returns `<p></p>`; use `isEmpty` to test emptiness.
- `getText()` separates top-level blocks with `\n\n`, hard breaks with `\n`.
- `isActive(name)` works for both marks (active across the selection or in stored marks) and nodes
  (an ancestor of the selection with that type and matching `attrs`).
- `getAttributes(name)`: for a mark, the attributes of the mark at the cursor (stored marks
  first) or of the first one in the selected range; for a node, the selected node or the deepest
  ancestor of that type. `{}` when there is none or the name is unknown.
- The editable element gets class `stilo-content`, `role="textbox"`, `aria-multiline="true"`.

---

## 6. Extension API

Every feature is an extension. All extensions have the same shape; **copy an existing extension as
a template** (the reference extension is `src/extensions/bold/`).

```ts
// src/core/extension.ts
interface ExtensionSpec<Options extends object = Record<string, never>> {
  name: string;                     // camelCase, unique
  priority?: number;                // default 100. Higher = earlier in schema order and
                                    // higher keymap precedence
  defaultOptions?: Options;
  nodes?(options: Options): Record<string, NodeSpec>;
  marks?(options: Options): Record<string, MarkSpec>;
  commands?(ctx: ExtensionContext<Options>): Partial<CommandFactories>;
  keymap?(ctx: ExtensionContext<Options>): Record<string, Command>;
  inputRules?(ctx: ExtensionContext<Options>): InputRule[];
  plugins?(ctx: ExtensionContext<Options>): Plugin[];
}

interface ExtensionContext<Options> {
  options: Readonly<Options>;
  schema: Schema;
  editor: Editor;
}

interface Extension<Options extends object = object> {
  readonly name: string;
  readonly priority: number;
  readonly options: Readonly<Options>;
  readonly spec: ExtensionSpec<Options>;
}

function defineExtension<Options extends object = Record<string, never>>(
  spec: ExtensionSpec<Options>,
): (options?: Partial<Options>) => Extension<Options>;
```

### 6.1 Commands and typing

Commands are standard ProseMirror `Command`s produced by factories. Each extension declares its
commands by **module augmentation** of the `Commands` interface:

```ts
// src/extensions/bold/index.ts
import { toggleMark } from 'prosemirror-commands';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    toggleBold: () => Command;
  }
}

export const Bold = defineExtension({
  name: 'bold',
  marks: () => ({
    bold: {
      parseDOM: [/* see §7.2 */],
      toDOM: () => ['strong', 0],
    },
  }),
  commands: ({ schema }) => ({
    toggleBold: () => toggleMark(schema.marks.bold!),
  }),
  keymap: ({ editor }) => ({
    'Mod-b': (_state, _dispatch) => editor.commands.toggleBold(),
  }),
});
```

`editor.commands.x(...args)` runs `factory(...args)(state, dispatch, view)` and returns the boolean
result. `editor.can().x(...args)` runs it without `dispatch`.

### 6.2 ExtensionManager rules

1. Extensions are flattened and sorted by `priority` (desc), then by order of appearance.
2. Duplicate extension names, node/mark names or command names → `StiloError`.
3. The schema requires `doc`, `paragraph` and `text`; otherwise → `StiloError`.
   `Paragraph` has priority 1000 so it is the first `block` node (ProseMirror's default block).
   `Text`, always present, also provides `insertText(text)`: it replaces the selection with
   `text`, with the marks active at the cursor (`false` for an empty string).
4. Schema mark order (affects nesting in HTML output, outermost first):
   `link`, `textStyle`, `highlight`, `bold`, `italic`, `underline`, `strike`, `subscript`,
   `superscript`, `code`. The first three have priorities 103, 102, 101 (the other marks keep
   the default 100 and follow the `StarterKit` order).
5. Plugin order: input rules plugin, then `Backspace: undoInputRule` (it applies only right after
   an input rule, so it may take precedence over every extension), then keymaps (by priority),
   then other plugins (by priority), then `baseKeymap` from `prosemirror-commands` last.

### 6.3 StarterKit

`StarterKit(options?)` returns the default extension set: `Document`, `Text`, `Paragraph`,
`Heading`, `Blockquote`, `HorizontalRule`, `HardBreak`, `BulletList`, `OrderedList`, `ListItem`,
`Bold`, `Italic`, `Underline`, `Strike`, `Subscript`, `Superscript`, `Code`, `Link`, `TextStyle`,
`Highlight`, `ClearFormatting`, `History`, `MoveBlock`, `Placeholder`, `DropCursor`, `GapCursor`. Each can be disabled with `{ <name>: false }` or
configured with `{ <name>: { ...options } }`.

---

## 7. HTML contract

`getHTML()` output is **canonical**: semantic HTML5, void elements without slash (`<br>`, `<hr>`,
`<img>`), no pretty-printing, attributes in the order listed below, no editor-internal attributes.

### 7.1 Nodes

| Node | Output | Also parsed from | Attributes |
|---|---|---|---|
| `doc` | — | — | content `block+` |
| `paragraph` | `<p>` | `p`, `div` (fallback) | `textAlign` (M2) |
| `heading` | `<h1>`…`<h6>` | same | `level` 1–6, `textAlign` (M2) |
| `blockquote` | `<blockquote>` | same | content `block+` |
| `horizontalRule` | `<hr>` | same | — |
| `hardBreak` | `<br>` | same | inline |
| `bulletList` | `<ul>` | `ul` | content `listItem+` |
| `orderedList` | `<ol start="n">` | `ol` | `start` (omitted when 1) |
| `listItem` | `<li>` | `li` | content `paragraph block*`; a single paragraph without attributes is written without `<p>` (`compactParagraphs`, ADR 0001) |
| `codeBlock` (M2) | `<pre><code class="language-x">` | `pre` | `language` (class omitted when null); no marks |
| `taskList` (M2) | `<ul data-type="taskList">` | same | content `taskItem+` |
| `taskItem` (M2) | `<li data-checked="true\|false">` | `li[data-checked]` | `checked` |
| `table` etc. (M2) | `<table><tbody><tr><th\|td>` | same (+ `thead`, `tfoot` flattened) | `colspan`, `rowspan`, `colwidth`: details fixed by ADR in the tables task |
| `image` (M2) | `<img src alt title width height>` | `img[src]` not inside `figure` | inline atom; empty attributes omitted |
| `figure` (M2) | `<figure><img src alt title width height><figcaption>text</figcaption></figure>` | `figure` containing an `img[src]` | block atom; attrs `src`, `alt`, `title`, `width`, `height`, `caption` (plain text); `<figcaption>` omitted when caption is empty |

### 7.2 Marks

| Mark | Output | Also parsed from |
|---|---|---|
| `link` | `<a href target rel>` | `a[href]` with a non-empty allowed `href` (`isAllowedHref`). Attributes `href` and `target` (`_blank` or none); `rel` is not stored: it is written as `noopener noreferrer nofollow` when `target="_blank"`, and dropped on input. Not inclusive (typing at its end does not extend it) |
| `textStyle` | `<span style="font-family; font-size; color">` | `span[style]`, `font[face/size/color]`; dropped when no allowed property remains. Attribute `color` (F-208); `fontFamily` and `fontSize` come with F-210 and F-211. Commands `setColor(color)` (`false` for an invalid color), `unsetColor()` |
| `highlight` | `<mark>` or `<mark style="background-color: x">` | `mark`, and a `background-color` style on any element; `transparent` counts as no color (Google Docs writes it on every span). Attribute `color` (`null` for a plain `<mark>`). `toggleHighlight()` without attributes removes any highlight; with `{ color }` it is active only for that color |
| `bold` | `<strong>` | `strong`, `b` (except Google Docs `<b style="font-weight:normal">`), `font-weight: bold \| ≥600` |
| `italic` | `<em>` | `em`, `i`, `font-style: italic` |
| `underline` | `<u>` | `u`, `text-decoration: underline` |
| `strike` | `<s>` | `s`, `del`, `strike`, `text-decoration: line-through` |
| `subscript` / `superscript` | `<sub>` / `<sup>` | same, `vertical-align: sub/super`; mutually exclusive |
| `code` | `<code>` | `code`; excludes all other marks except `link` (see below) |

Mark exclusion: every mark except `link` declares `group: 'formatting'`, and `code` declares
`excludes: 'formatting'`. Naming the group instead of the marks keeps the schema valid when some
marks are disabled. `setMark` (and so every `set*`/`toggle*` command) returns `false` where an
existing mark excludes the new one, so `can().toggleBold()` is `false` inside code. Marks that
exclude each other replace each other instead: `subscript` and `superscript` are both in the
group `script` and declare `excludes: 'script'`, so setting one removes the other.

### 7.3 Inline styles: allowlist and normalization

Rules: semantic HTML first; inline `style` **only** for free-valued properties; classes never in
content (exceptions in §7.4).

Allowed CSS properties (anything else is dropped on input):

| Property | Used by | Normalization |
|---|---|---|
| `font-family` | `textStyle` | Split by comma, trim, strip quotes, re-quote with `'` when the name contains anything other than letters/digits/hyphen; joined with `, ` |
| `font-size` | `textStyle` | Must match `^\d+(\.\d+)?(px\|pt\|em\|rem\|%)$` (lowercased), else dropped |
| `color` | `textStyle` | See color rule |
| `background-color` | `highlight` | See color rule |
| `text-align` | `paragraph`, `heading` | `left\|center\|right\|justify`; `start` → `left`; `left` is the default and is omitted on output |

Color rule: `#rgb`/`#rrggbb` → lowercase `#rrggbb`; `rgb(r, g, b)` and `rgba(..., 1)` → `#rrggbb`;
`rgba` with alpha < 1 → `rgba(r, g, b, a)`; a lowercase keyword `^[a-z]{3,20}$` is kept unless it
is `inherit`, `initial`, `unset`, `revert`, `currentcolor`; anything else dropped.

Output format: properties in the table order, `prop: value` joined with `; `, no trailing `;`.
`serializeHTML` rewrites every `style` attribute with `sanitizeStyle`, because ProseMirror sets
styles through `style.cssText` and the browser re-serializes them (trailing `;`, `rgb()`).
Example: `<span style="font-family: 'Times New Roman', serif; font-size: 12pt; color: #ff0000">`.

All parsing/normalization/building of style strings goes through `src/core/html/css.ts`
(`parseStyle`, `normalizeColor`, `normalizeFontSize`, `normalizeFontFamily`, `normalizeTextAlign`,
`buildStyle`). Extensions never handle raw style strings themselves.

### 7.4 Exceptions (non-style attributes in content)

- `class="language-<x>"` on `<code>` inside `<pre>` (de-facto standard for highlighters).
- `data-type="taskList"` and `data-checked` for task lists.
- Table column widths: decided in the tables task ADR (M2).

### 7.5 Idempotence

For every extension, tests verify: `getHTML()` after `setHTML(getHTML())` is identical.

---

## 8. Input pipeline

```
setHTML(html)           paste (transformPastedHTML)          drop
     │                          │                             │
     │                   inert DOMParser ──► paste cleanup     │
     │                   (Word / GDocs, M2) ──► string          │
     ▼                          ▼                             ▼
                sanitize()  — DOMPurify, Stilo-owned instance
                                │
                ProseMirror DOMParser.fromSchema(schema) — parse rules (§7)
                                │
                          document / slice
```

`src/core/html/sanitize.ts`:

- Uses a **dedicated DOMPurify instance** created lazily with `DOMPurify(window)`. Hooks are added
  only to that instance, never to the default export (it is shared with the host application).
- `ALLOWED_TAGS`: `p div span br hr h1 h2 h3 h4 h5 h6 blockquote pre code ul ol li table thead
  tbody tfoot tr th td colgroup col img figure figcaption a strong b em i u s del strike sub sup
  mark font`.
- `ALLOWED_ATTR`: `href target rel title src alt width height start colspan rowspan style class
  data-type data-checked data-colwidth face size color`. `ALLOW_DATA_ATTR: false`.
- Hooks: `style` filtered through the §7.3 allowlist; `class` reduced to `language-*` values;
  `href`/`src` protocol checks per SPEC NFR-2.
- Unknown tags are unwrapped (content kept), as per DOMPurify default `KEEP_CONTENT`.

`src/core/html/serialize.ts`: `DOMSerializer.fromSchema(schema).serializeFragment()` into a
container of a detached document (`document.implementation.createHTMLDocument()`), then
`innerHTML`.

Plain-text paste uses ProseMirror's default: every line becomes a paragraph, runs of empty lines
collapse (so `getText()` pasted back gives the same blocks), whitespace is kept as typed.

ProseMirror's `data-pm-slice` attribute (open depths and wrapping nodes of a copied slice) is
**not** in `ALLOWED_ATTR`: its context carries arbitrary node attributes, so pasted HTML is
never trusted with it. Accepted cost: a single whole list item (or the paragraph of a blockquote)
copied and pasted into an empty paragraph arrives as a plain paragraph.

### 8.1 Output pipeline (copy)

```
getHTML()                                  copy / cut / drag
     │                                            │
DOMSerializer (schema toDOM)          clipboardSerializer (same, per call)
     │                                            │
     └──────► canonical post-processing ◄─────────┘
              (styles via css.ts; compactParagraphs, ADR 0001)
```

Copied HTML follows §7 exactly, plus ProseMirror's `data-pm-slice` on the first element; the
plain text is `textBetween(…, '

')`, the same rule as `getText()`.

---

## 9. Default UI (`src/ui/`)

The detailed design (modules, types, DOM, behavior, styles) is in [`docs/UI.md`](UI.md).

- Separate entry `stilo-editor/ui`, fully optional (see §2.2). It uses only the public core API
  (`editor.commands`, `editor.can()`, `editor.isActive()`, `editor.getAttributes()`, events).
  It touches `editor.view` only
  to anchor popovers to the selection and to listen to DOM events on `view.dom`.
- Customization levels, from least to most effort:
  1. CSS custom properties / overriding `ui.css`;
  2. toolbar configuration (which items, which groups, order) and custom items;
  3. replacing single UI parts (e.g. own link dialog) through options;
  4. no default UI at all: core only + `content.css`, custom UI on the public API.
- `createToolbar(editor, { container, items, messages })`. `items` is an array of groups; each
  entry is the ID of a default item or a custom item object (UI.md §3).
- Toolbar items have a fixed shape (`kind: 'button' | 'dropdown'`, label key, `run(editor)`
  (buttons also get a `context` with UI services such as `openLinkPopover()`),
  optional `isActive`, `isEnabled`, `isAvailable`). State refresh on `transaction` events,
  batched with `requestAnimationFrame`.
- Icons from `lucide`; floating elements positioned by `@floating-ui/dom` through one popover
  component (ADR 0002). Strings from `src/ui/i18n/<locale>.ts` (`en` default, `it`).
- Plain DOM, no framework. Styling in `src/styles/ui.css` with `--stilo-*` custom properties.

---

## 10. Testing

- **Unit** (Vitest + jsdom), colocated `*.test.ts`. Use `tests/helpers`:
  - `createTestEditor({ extensions?, html? })`: defaults to `StarterKit()`; returns an `Editor`.
  - Selection markers in `html`: `|` = cursor, `[` … `]` = range. Test content must not contain
    these characters as text.
  - `getHTMLWithSelection(editor)`: canonical HTML with the selection markers re-inserted. `|`
    carries the marks the next typed character would get (`<strong>b|</strong>`: typing
    continues in bold); `[` and `]` hug the selected text.
  - `typeText(editor, text)`: types character by character, running input rules.
  - `pressKey(editor, 'Mod-b')`: sends a key combination to the keymaps (`Mod` = `Ctrl`). Write
    the combination exactly as in the keymap (`'Mod-Shift-s'`, lowercase letter): the synthetic
    event has no `keyCode`, the fallback browsers use for `Shift`/Caps Lock variants.
- **Per-extension minimum tests**: parse (every "also parsed from" source in §7), serialize,
  idempotence, each command (enabled/disabled cases), each keyboard shortcut, each input rule.
- **E2E** (Playwright, `tests/e2e/`): real typing, clipboard, drag & drop, UI, anything needing
  layout. Runs against the demo page.
- **Security**: the payloads in `tests/fixtures/xss/vectors.ts` run through the sanitizer (and,
  from M1, `setHTML` and paste); output asserted clean.

## 11. Benchmarks

`bench/` per SPEC NFR-1. Generators are deterministic (seeded). Benchmarks load the demo page in a
special mode (`/demo/?bench`: no `getHTML()` per update), drive the editor through
`window.__stilo` (`demo/bench.ts`) and record metrics via `performance.now()` with a forced
layout, plus real key presses through Event Timing. Every document is measured first; a final
`budgets` test writes `bench/results/<date>.json` and checks `bench/budgets.ts`.
`bench/results/baseline.json` is the committed reference run (ADR 0003). Config:
`playwright.bench.config.ts` (Chromium, Vite dev server on port 5179). For readers:
[`docs/PERFORMANCE.md`](PERFORMANCE.md).

## 12. Collaboration readiness (M3)

- `History` is an extension providing the `undo`/`redo` commands. The future `Collaboration`
  extension provides the same commands via Yjs undo; using both together is a duplicate-command
  error by design.
- No state outside the ProseMirror document and plugin states; no reliance on DOM state.
- Node views must be pure functions of node attributes.

---

## 13. Decision log

| # | Decision | Date |
|---|---|---|
| D-01 | Build on ProseMirror rather than Tiptap: learning, full ownership, fully open source | 2026-10-10 |
| D-02 | HTML is the public in/out format; ProseMirror JSON is optional | 2026-10-10 |
| D-03 | Semantic HTML first; inline style only for free values with an allowlist; classes only for UI | 2026-10-10 |
| D-04 | Headless core + optional, decoupled UI in one package with subpath exports; no monorepo (§2.2) | 2026-10-10 |
| D-05 | Vanilla TS first; framework wrappers later | 2026-10-10 |
| D-06 | Toolchain: npm, Vite, Vitest+jsdom, Playwright, Biome, TS strict | 2026-10-10 |
| D-07 | History is a swappable extension (Yjs later) | 2026-10-10 |
| D-08 | Images (M2): inline `image` + block `figure` with plain-text caption; local (base64) and remote picker with alt/title/caption; upload callback, alignment, rich captions in M3 | 2026-10-10 |
| D-11 | `setHTML`/`setJSON` take an options object; replacement is undoable by default, `resetHistory: true` starts fresh | 2026-10-10 |
| D-09 | Performance verified by benchmarks with budgets (NFR-1) | 2026-10-10 |
| D-10 | Code and docs in English | 2026-10-10 |
| D-12 | Single-paragraph list items are written without `<p>`; option `compactParagraphs` ([ADR 0001](decisions/0001-tight-list-items.md)) | 2026-10-11 |
| D-13 | UI popovers positioned with Floating UI; native `title` tooltips in M1; `absolute` strategy in a host that scrolls with the anchor ([ADR 0002](decisions/0002-floating-ui.md)) | 2026-10-12 |
| D-14 | Top-level blocks use `content-visibility: auto`; performance budgets calibrated on the first measurement ([ADR 0003](decisions/0003-performance-baseline.md)) | 2026-10-12 |
