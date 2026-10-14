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
| Text search | `prosemirror-search`, its `SearchQuery` only ([ADR 0004](decisions/0004-find-and-replace.md)) |
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
prosemirror-search  dompurify  lucide  @floating-ui/dom
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
| `stilo-editor` | Core: `Editor`, `defineExtension`, all extensions, `defaultExtensions`, types |
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
- Everything a UI needs (command execution, `.can()`, `isActive()`, events, node attributes of the
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
| `prepublishOnly` | `npm run check && npm run build` | Run by `npm publish`: never publish an old or failing build |

---

## 3. File layout

```
stilo-editor/
├── AGENTS.md                     Rules for contributors and coding agents
├── README.md
├── CONTRIBUTING.md               How to report bugs and propose changes
├── SECURITY.md                   Private vulnerability reports
├── LICENSE                       MIT
├── .github/ISSUE_TEMPLATE/       Issue forms: bug report, feature request
├── package.json / package-lock.json
├── tsconfig.json                 Dev/typecheck config (src, tests, demo, bench)
├── tsconfig.build.json           Declarations for src/ only
├── vite.config.ts                Library build + demo dev server
├── vitest.config.ts
├── playwright.config.ts          E2E
├── playwright.bench.config.ts    Benchmarks
├── biome.json
├── assets/                     Brand: logo and symbol (light/dark), favicon, README screenshot; source/ has the black shapes
├── docs/
│   ├── VISION.md  SPEC.md  ARCHITECTURE.md  UI.md  PERFORMANCE.md  BACKLOG.md
│   ├── API.md                    API reference for applications (users of the package)
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
│   │   ├── drop.ts               Drag-and-drop move cleanup (§8.2)
│   │   ├── helpers/              Pure helpers (isMarkActive, findParentNode, ...)
│   │   └── html/
│   │       ├── sanitize.ts       DOMPurify instance + config + hooks
│   │       ├── css.ts            CSS allowlist, parse/normalize/build style strings
│   │       ├── parse.ts          HTML string -> ProseMirror doc
│   │       ├── serialize.ts      ProseMirror doc -> HTML string
│   │       └── paste/            Paste cleanup: Word, Google Docs, table widths
│   ├── extensions/
│   │   ├── index.ts              Re-exports all extensions
│   │   ├── default-extensions/ defaultExtensions() bundle
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
| Extension sets (function returning extensions) | camelCase | `defaultExtensions` |
| Events | lowercase | `input`, `selectionchange` |
| Types / interfaces | PascalCase | `EditorOptions` |
| CSS classes | `stilo-` prefix, BEM | `stilo-toolbar__button--active` |
| CSS custom properties | `--stilo-` prefix | `--stilo-toolbar-bg` |
| i18n keys | dot.case | `toolbar.bold` |

Public API names use the web platform term when one exists (`getHTML`, `select`, `input`),
otherwise they describe what the thing does.

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
import { Editor, defaultExtensions } from 'stilo-editor';

const editor = new Editor({
  element: document.querySelector('#editor')!,
  extensions: [defaultExtensions()],
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
                                           // editor.commands.toggleBold.can(): dry run
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
  input: { editor: Editor; transaction: Transaction | null };    // doc changed (null: state
                                                                 // replaced, resetHistory)
  selectionchange: { editor: Editor; transaction: Transaction }; // selection changed, doc not
  focus: { editor: Editor; event: FocusEvent };
  blur: { editor: Editor; event: FocusEvent };
  destroy: { editor: Editor };
  // Extensions add their own events (module augmentation), e.g. `imageRejected` (`Image`).
}
```

Semantics:

- `setHTML` / `setJSON` options:

  ```ts
  interface SetContentOptions {
    resetHistory?: boolean; // default false
    emitInput?: boolean;    // default true
  }
  ```

  - `resetHistory: false` (default): the whole content is replaced by **one undoable transaction**,
    never grouped with the changes before it (`closeHistory`); the selection goes to the start of
    the document.
  - `resetHistory: true`: a fresh `EditorState` is created with the same plugins (all plugin
    states, history included, start from scratch). Typical use: a "New document" button calls
    `setHTML('', { resetHistory: true })`, or loading a different document.
  - `input` is emitted unless `emitInput: false`; with `resetHistory: true` its `transaction`
    is `null`.
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
  // Emits an editor event. An extension adds its events to `EditorEvents` by module
  // augmentation, as it does for `Commands` (e.g. `imageRejected` of `Image`).
  emit<E extends keyof EditorEvents>(event: E, payload: EditorEvents[E]): void;
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
result. `editor.commands.x.can(...args)` runs it without `dispatch`.

### 6.2 ExtensionManager rules

1. Extensions are flattened and sorted by `priority` (desc), then by order of appearance.
2. Duplicate extension names, node/mark names or command names → `StiloError`.
3. The schema requires `doc`, `paragraph` and `text`; otherwise → `StiloError`.
   `Paragraph` has priority 1000 so it is the first `block` node (ProseMirror's default block).
   `Text`, always present, also provides `insertText(text)`: it replaces the selection with
   `text`, with the marks active at the cursor (`false` for an empty string). `Document`,
   always present, provides the selection commands: `select(from, to?)` (a text selection
   between document positions, moved to the nearest text position; `false` outside the
   document), `selectNode(pos)` (`false` without a selectable node at `pos`) and `selectAll()`.
4. Schema mark order (affects nesting in HTML output, outermost first):
   `link`, `highlight`, `textStyle`, `bold`, `italic`, `underline`, `strike`, `subscript`,
   `superscript`, `code`. `textStyle` is inside `highlight` because browsers give `<mark>` its
   own text color (`MarkText`), which would hide a color set outside it. The first three have
   priorities 103, 102, 101 (the other marks keep
   the default 100 and follow the `defaultExtensions` order).
5. Plugin order: input rules plugin, then `Backspace: undoInputRule` (it applies only right after
   an input rule, so it may take precedence over every extension), then keymaps (by priority),
   then other plugins (by priority), then `baseKeymap` from `prosemirror-commands` last.

### 6.3 Default extensions

`defaultExtensions(options?)` returns the default extension set: `Document`, `Text`, `Paragraph`,
`Heading`, `Blockquote`, `CodeBlock`, `HorizontalRule`, `HardBreak`, `Image`, `Table`, `BulletList`, `OrderedList`, `ListItem`, `TaskList`, `TaskItem`,
`Bold`, `Italic`, `Underline`, `Strike`, `Subscript`, `Superscript`, `Code`, `Link`, `TextStyle`,
`Highlight`, `TextAlign`, `LineHeight`, `ClearFormatting`, `TextCase`, `History`, `MoveBlock`, `Placeholder`, `Search`, `DropCursor`, `GapCursor`. Each can be disabled with `{ <name>: false }` or
configured with `{ <name>: { ...options } }`.

---

## 7. HTML contract

`getHTML()` output is **canonical**: semantic HTML5, void elements without slash (`<br>`, `<hr>`,
`<img>`), no pretty-printing, attributes in the order listed below, no editor-internal attributes.

### 7.1 Nodes

| Node | Output | Also parsed from | Attributes |
|---|---|---|---|
| `doc` | — | — | content `block+` |
| `paragraph` | `<p>` | `p`, `div` (fallback) | `textAlign` (F-308): `<p style="text-align: center">`, `null` for left; `lineHeight` (F-312): `<p style="line-height: 1.5">`, `null` when unset |
| `heading` | `<h1>`…`<h6>` | same | `level` 1–6, `textAlign` and `lineHeight` as `paragraph` |
| `blockquote` | `<blockquote>` | same | content `block+` |
| `horizontalRule` | `<hr>` | same | — |
| `hardBreak` | `<br>` | same | inline |
| `bulletList` | `<ul>` | `ul` | content `listItem+` |
| `orderedList` | `<ol start="n">` | `ol` | `start` (omitted when 1) |
| `listItem` | `<li>` | `li` | content `paragraph block*`; a single paragraph without attributes is written without `<p>` (`compactParagraphs`, ADR 0001) |
| `codeBlock` | `<pre><code class="language-x">` | `pre` (whitespace kept, `<br>` → newline, inner elements reduced to their text) | `language` (class omitted when null), from the first `language-*` class of the `<code>` or else of the `<pre>`; content `text*`, no marks |
| `taskList` | `<ul data-type="taskList">` | same | content `taskItem+` |
| `taskItem` | `<li data-checked="true\|false">` | `li` inside a `taskList` (`checked` only for `data-checked="true"`) | `checked`; content `paragraph block*`; a single paragraph without attributes is written without `<p>` (`compactParagraphs`, ADR 0001) |
| `table` | `<table>`, with `<colgroup>` when a column has a width (ADR 0005) | `table` | content `tableRow+` |
| `tableRow` | `<tr>` | `tr` (`thead`, `tbody`, `tfoot` flattened: the rows keep their order) | content `(tableCell \| tableHeader)*` |
| `tableCell` / `tableHeader` | `<td>` / `<th>` | same | `colspan`, `rowspan` (omitted when 1; clamped to 1000 and 65534 as browsers do), `colwidth` (`data-colwidth`, ADR 0005); content `block+`; a single paragraph without attributes is written without `<p>` (`compactParagraphs`, ADR 0001) |
| `image` | `<img src alt title width height>` | `img[src]` (not inside `figure`, M2) | inline atom (F-601); empty attributes omitted; `width` and `height` are whole pixels, other values (`50%`) dropped |
| `figure` (M2) | `<figure><img src alt title width height><figcaption>text</figcaption></figure>` | `figure` containing an `img[src]` | block atom; attrs `src`, `alt`, `title`, `width`, `height`, `caption` (plain text); `<figcaption>` omitted when caption is empty |

Text alignment (F-308) and line spacing (F-312): the `textAlign` and `lineHeight` attributes
belong to `paragraph` and `heading` (`core/helpers/block-style.ts`), so content keeps them even
without the `TextAlign` and `LineHeight` extensions, which only add the commands:
`setTextAlign(alignment)` with `Mod-Shift-l/e/r/j` (priority 101 puts its keymap before the
marks', so `Mod-Shift-e` never falls back to `Mod-e`), `setLineHeight(lineHeight)` and
`unsetLineHeight()` (no shortcut). Both set the attribute on every selected textblock that has it
(`setTextblockAttr`). A block with neither style parses with the shared default attributes: one
attribute object per paragraph cost 19 MB of heap at 50k paragraphs. `setParagraph`, `setHeading`
and `toggleHeading` use `setTextblockType`, which keeps both styles when the block type changes,
and so does the heading input rule (`# `…`###### `, our `textblockTypeInputRule` in
`core/helpers/input-rules.ts`); a list item's paragraph with a style keeps its `<p>` (`compactParagraphs` unwraps only paragraphs
without attributes). Output order: `text-align` then `line-height` (§7.3).

Text case (F-213): the `TextCase` extension, a command and no schema. `setTextCase(letterCase)`
changes the characters, so the HTML has no `text-transform`. The text of each selected textblock
gives the context of `title` (a word starts after a character that is not a letter, digit or
apostrophe: `l'amico` → `L'amico`) and `sentence` (a sentence starts at the block start and after
`.` `!` `?` `…`), so a selection that starts inside a word or a sentence keeps it lowercase. The
top-level blocks the selection touches are rebuilt and replaced in **one step**, the marks kept
on each piece of text; the selection is mapped through a step map of the texts whose length
changed (`ß` → `SS`). Nothing is dispatched when no character changes.

Code block (F-306): the `CodeBlock` extension. `setCodeBlock({ language? })` turns the selected
textblocks into code blocks with `setTextblockType`, then joins the sibling code blocks of the
selection into one, a newline between each pair; on a code block it changes the language.
`language` must match `^[\w-]+$` (the class the sanitizer keeps), otherwise the command returns
`false`. `unsetCodeBlock()` turns every selected code block into one paragraph per line: each
newline becomes a split, so the cursor keeps its line and column. Other conversions (the
paragraph or a heading from the dropdown, `Backspace` into the previous block) use ProseMirror's
`linebreakReplacement`: `hardBreak` declares it, so a newline becomes a `<br>` and back. Keys:
`Mod-Alt-c` toggles; `Enter` and `Shift-Enter` insert a newline (`newlineInCode`), but `Enter` on an
empty last line removes it and adds a paragraph after the block; `Mod-Enter` (`exitCode`, from
`baseKeymap`) also leaves it; `Backspace` in an empty code block turns it into a paragraph; `Tab`
is not handled, so it never traps the focus. Priority 101 puts its `Enter` before the list item's,
which would split the item. Input rule: ```` ``` ```` or ```` ```lang ```` and a space at the
start of a textblock. `code: true` turns off input rules and marks inside it. A list item
cannot start with a code block (content `paragraph block*`).

Task lists (F-406): the `TaskList` and `TaskItem` extensions. `toggleTaskList()` (`Mod-Shift-9`) works like the other list toggles (`toggleList`, `core/helpers/lists.ts`): it wraps the selection, lifts the items, or converts the nearest list; a conversion between lists whose items differ (`listItem` and `taskItem`) rebuilds the list in one step, and task items lose their `checked` state. Input rule: `[ ] ` or `[x] ` (`[X] `) at the start of a textblock, joined to a task list right before it. `splitTaskItem()` (`Enter`): the text keeps the item's state, a new empty item is unchecked (also the one made before the text at the start of a checked item); `sinkTaskItem()` (`Tab`), `liftTaskItem()` (`Shift-Tab`) and `Backspace` behave as in list items. `toggleTaskChecked()` (`Mod-Enter`) checks the innermost task item around each selected textblock, or unchecks them when all are checked; `false` outside a task item and in a code block, where `Mod-Enter` leaves the code. It replaces the siblings holding the items in **one step**: a step per item copies the parent's children each time (884 ms for 4,000 items in jsdom, 9 ms in one step). In the editor, a node view (`TaskItemView`) renders `<li data-checked>` with an `input.stilo-task-item__checkbox` and the content in `div.stilo-task-item__content`; clicking the checkbox sets `checked`, leaves the focus in the editor, and does nothing when the editor is not editable. The checkbox is not in `getHTML()`: for content shown elsewhere under the class `stilo-content`, `content.css` draws a box from `data-checked`.

Tables (F-501…F-507): the `Table` extension, on `prosemirror-tables` (its `TableMap`, commands, `tableEditing` and `columnResizing` plugins; our own node specs, with the names of §4.1). `insertTable({ rows = 3, cols = 3, withHeaderRow = true })` replaces the selection with a table, the cursor in the first cell, and adds a paragraph after it when nothing follows; `false` inside a table (no nested tables from the command; pasted ones are kept) or where the container refuses a table. `addRowBefore/After`, `deleteRow`, `addColumnBefore/After`, `deleteColumn`, `mergeCells`, `splitCell`, `toggleHeaderRow` and `toggleHeaderColumn` (the first row / column of the table, whatever the selection) run on a document holding only the table, which then replaces the table in **one step**: the library makes a step per cell, and each step copies the top-level blocks (164 ms for a header column of 200 rows in 50,000 paragraphs, 35 ms in one step). `deleteRow` and `deleteColumn` return `false` (also from `.can()`) when the selection covers every row / column: that is `deleteTable()`. `selectRow(pos?)`, `selectColumn(pos?)` and `selectTable(pos?)` set a cell selection (`CellSelection.rowSelection` / `colSelection`, or every cell) around the cell at `pos`, by default the head of the selection: the table handles of the UI select what their menu acts on. `getTableHeaders(editor)` tells whether the first row and column are headers (`null` outside a table). Keys: `Tab` goes to the next cell (selecting its text) and in the last cell adds a row; `Shift-Tab` goes back; outside a table they are not handled. Dragging the border of a column sets the `colwidth` of its cells (`columnResizing`); the table node view (`TableView`) draws the `<colgroup>` in the editor. `tableEditing` adds the cell selection (drag across cells) and fixes the tables a transaction changes (missing cells, overlapping spans, widths that disagree); the extension wraps it so that it looks for those tables only when the changed part of the document (`findDiffStart` / `findDiffEnd`) holds, or lies in, a table with problems (`TableMap.problems`): its own search (`changedDescendants`) does not move on in the old document after a block that differs, so a change to every block cost quadratic time, tables or not: the new state of a text case over 50,000 paragraphs took 4.1 s in Chrome, 1 ms with the check (T-050); the extension fixes the tables of a loaded document too, in the empty transaction the `Editor` applies to every new state (`LOAD_META`, no undo step), so `getHTML()` never changes after the first edit.

Images (F-601, F-603, F-607, F-608): the `Image` extension. `src` follows SPEC NFR-2 (the
sanitizer drops other URLs, SVG data URLs included). Paste: when the clipboard has HTML,
ProseMirror pastes it, so an image copied from a web page keeps its URL; otherwise each PNG,
JPEG, GIF or WebP file becomes an `image` with a base64 `data:` URL, in place of the selection at
the time the files have been read. A file larger than `maxInlineBytes` (default 5 MB) or of
another type is skipped and reported with the `imageRejected` event (`{ editor, file, reason:
'tooLarge' | 'unsupportedType' }`). In the editor, a node view wraps the `<img>` in
`span.stilo-image` with two side handles (`span.stilo-image__handle--left/right`), inside the
image because a top-level block clips what overflows it (`content-visibility`, ADR 0003), shown
by `content.css` while the image is selected and the editor editable. Only a selected image is
`position: relative`: a positioned element paints over the caret placed right after it. Dragging a handle changes
the width (at least 32px, at most the editor width) and keeps the aspect ratio; releasing it sets
`width` and `height` with attribute steps: one undo step, the image stays selected.
`content.css` gives every content image `max-width: 100%; height: auto`.

### 7.2 Marks

| Mark | Output | Also parsed from |
|---|---|---|
| `link` | `<a href target rel>` | `a[href]` with a non-empty allowed `href` (`isAllowedHref`). Attributes `href` and `target` (`_blank` or none); `rel` is not stored: it is written as `noopener noreferrer nofollow` when `target="_blank"`, and dropped on input. Not inclusive (typing at its end does not extend it) |
| `textStyle` | `<span style="font-family; font-size; color">` | `span[style]`, `font[face/size/color]` (`size` 1–7 → `10px`, `13px`, `16px`, `18px`, `24px`, `32px`, `48px`; other values dropped); dropped when no allowed property remains. Attributes `fontFamily`, `fontSize`, `color` (F-208, F-210, F-211). The mark excludes itself, so a nested `<span>`/`<font>` would drop the outer values: the innermost one also takes the values of the enclosing ones (CSS inheritance). Commands `setColor(color)`, `setFontFamily(fontFamily)`, `setFontSize(fontSize)` (`false` for an invalid value) and `unsetColor()`, `unsetFontFamily()`, `unsetFontSize()`: each changes only its own attribute (`updateMarkAttrs`), and the mark goes away when none is left. `stepFontSize(delta, unit = 'pt')` changes each selected part from the size the browser renders (`getComputedStyle`, read through the view) to the next / previous whole number in `unit` (`pt`, `px`, or `rem` stepped in px), between 1 and 400 |
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
existing mark excludes the new one, so `commands.toggleBold.can()` is `false` inside code. Marks that
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
| `width` | `<col>` of `table` (ADR 0005) | Whole pixels: `^\d+(\.\d+)?px$`, rounded; zero and other units dropped |
| `line-height` | `paragraph`, `heading` | A unitless number `^\d+(\.\d+)?$` or a percentage of one (`115%` → `1.15`), rounded to 2 decimals without trailing zeros; zero, `normal` and lengths (`24px`, `1.5em`) dropped |

Color rule: `#rgb`/`#rrggbb` → lowercase `#rrggbb`; `rgb(r, g, b)` and `rgba(..., 1)` → `#rrggbb`;
`rgba` with alpha < 1 → `rgba(r, g, b, a)`; a lowercase keyword `^[a-z]{3,20}$` is kept unless it
is `inherit`, `initial`, `unset`, `revert`, `currentcolor`; anything else dropped.

Output format: properties in the table order, `prop: value` joined with `; `, no trailing `;`.
`serializeHTML` rewrites every `style` attribute with `sanitizeStyle`, because ProseMirror sets
styles through `style.cssText` and the browser re-serializes them (trailing `;`, `rgb()`).
Example: `<span style="font-family: 'Times New Roman', serif; font-size: 12pt; color: #ff0000">`.

All parsing/normalization/building of style strings goes through `src/core/html/css.ts`
(`parseStyle`, `normalizeColor`, `normalizeFontSize`, `normalizeFontFamily`, `normalizeTextAlign`,
`normalizeLineHeight`, `normalizeWidth`, `buildStyle`). Extensions never handle raw style strings themselves.

### 7.4 Exceptions (non-style attributes in content)

- `class="language-<x>"` on `<code>` inside `<pre>` (de-facto standard for highlighters).
- `data-type="taskList"` and `data-checked` for task lists.
- `data-colwidth` on `<td>` / `<th>`: the column widths, which the editor reads back; the `<colgroup>` written next to them is what other pages display ([ADR 0005](decisions/0005-table-column-widths.md)).

### 7.5 Idempotence

For every extension, tests verify: `getHTML()` after `setHTML(getHTML())` is identical.

---

## 8. Input pipeline

```
setHTML(html)           paste (transformPastedHTML)          drop
     │                          │                             │
     │                   inert DOMParser ──► paste cleanup     │
     │                   (Word, GDocs, tables) ► string         │
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

Paste cleanup (`src/core/html/paste/`, F-703, F-704) runs on pasted HTML before the sanitizer, on
a document parsed with an inert `DOMParser` (no scripts run, no images load):

- **Microsoft Word** (HTML with the `urn:schemas-microsoft-com:office:word` namespace or the
  `Word.Document` meta): the `<o:p>` paragraph ends are removed; list paragraphs
  (`mso-list: l0 level1 lfo1`) become `<ul>` / `<ol>` nested by level, one list per run of
  consecutive list paragraphs. The marker (the `mso-list: Ignore` span) is removed and gives the
  type: `1.`, `a)`, `iv.` are numbered (a number above 1 gives `start`), anything else is a
  bullet. Built on the clipboard format of Word for Windows (test fixtures, not verified with
  Word yet); Word on the web is not recognized.
- **Google Docs** (a `docs-internal-guid-*` wrapper): a `<br>` between the blocks of the wrapper
  (an empty paragraph) becomes an empty `<p>`.
- **Base style**, for both: Word and Google Docs write the font, size, color and line height of
  the document on every run of text. For each of `font-family`, `font-size`, `color` and
  `line-height`, the normalized value that covers most of the pasted characters is removed
  everywhere; the text that differs keeps its value, and when most of the text has no value
  nothing is removed. `font-size` is also removed inside headings (the level gives the size).
  Accepted cost: a fragment that is all red, pasted alone, loses its red.
- **Every paste**: a heading that is the first child of a `<li>` becomes a `<p>` (a list item
  starts with a paragraph; otherwise the list breaks around it). A table whose cells have no
  `data-colwidth` gets it from the pixel widths it carries
  ([ADR 0005](decisions/0005-table-column-widths.md)): its `<col>` elements (`width` attribute,
  `style="width"`, `span`), else the `width` of the cells that span one column; the column of each
  cell follows `colspan` and the `rowspan` of the rows above. Other units (`%`, `em`) are not
  read: those columns stay fluid. `setHTML` reads widths from `data-colwidth` only.

`Mod-Shift-v` pastes the plain text of the clipboard (F-705): ProseMirror's own behavior while
Shift is held, also when the clipboard has HTML.

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

### 8.2 Drag and drop (move)

ProseMirror moves a dragged selection by deleting it and inserting the slice at the drop point. When
the selection covers whole textblocks (triple click, or from the start of a block to the end of
another), that is a move of blocks, and ProseMirror's default treats it as a move of text: it keeps
the emptied blocks behind, and dropped inside the text of another block it merges the text into it.
`createDropMovePlugin()` (`src/core/drop.ts`, added by the `Editor` after the extension plugins)
makes it a move of blocks.

- **Dropped inside text** (`handleDrop`, sibling blocks only): the target textblock is split at the
  drop point and the blocks go between the halves; at the start or end of its text they go before or
  after it, so no half is empty. Inside a list item the item is split too and every block gets its
  own item; blocks that cannot start an item (headings) split the list instead. Dropped on
  themselves, the blocks do not move.
- **Emptied source** (`appendTransaction` on `uiEvent: 'drop'`, also after ProseMirror's own drops
  between blocks): the textblock the move left empty is deleted, together with the containers left
  holding only it (list item, list, blockquote). It stays when the selection did not cover whole
  blocks, for a copy (`Ctrl` held, `Option` on macOS: the block is not emptied), or when its parent
  cannot lose it (the only block of the document, the first paragraph of a list item).

All of it belongs to the same undo step as the move.

---

## 9. Default UI (`src/ui/`)

The detailed design (modules, types, DOM, behavior, styles) is in [`docs/UI.md`](UI.md).

- Separate entry `stilo-editor/ui`, fully optional (see §2.2). It uses only the public core API
  (`editor.commands` and their `.can()`, `editor.isActive()`, `editor.getAttributes()`, events).
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
  - `createTestEditor({ extensions?, html? })`: defaults to `defaultExtensions()`; returns an `Editor`.
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
  layout. Runs against the demo page in Chromium, Firefox and WebKit (`playwright.config.ts`,
  Vite dev server on port 5180). Two rules keep the tests faithful to real input:
  - Type through the spec's `type()` helper, which waits for a rendered frame before each key.
    A real key press makes the browser render; Playwright's synthetic keys do not, and without
    a frame Chromium keeps a newly created block skipped by `content-visibility` (ADR 0003) and
    puts the caret before the first character typed into it. Real Chrome is not affected.
    The same holds for every script that drives the demo (visual checks, probes): keys sent
    faster than any person types can fail where real typing works, so a failure seen only with
    synthetic keys is first rerun at a human pace before it is called an editor bug.
  - Paste with a `paste` event that carries its own `DataTransfer`, never the system clipboard:
    it is shared by the parallel workers (and by the developer).
  - Drag with the real mouse from the middle of the selected text. Playwright's WebKit on
    Windows resolves every point of a text to offset 0 during a drop, so drops *inside* text
    are skipped there (Safari is checked by hand); drops between blocks run everywhere.
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
| D-15 | Find and replace on `SearchQuery` of `prosemirror-search`, with our own incremental highlight plugin capped at 1,000 matches ([ADR 0004](decisions/0004-find-and-replace.md)) | 2026-10-14 |
| D-16 | Table column widths written twice: `data-colwidth` on the cells, read back, and a `<colgroup>` for display ([ADR 0005](decisions/0005-table-column-widths.md)) | 2026-10-14 |
