# T-011 — Placeholder, DropCursor and GapCursor

| Field | Value |
|---|---|
| Status | `todo` |
| Spec | F-011, F-012 |
| Milestone | M1 |
| Depends on | T-010 |
| Branch | `task/T-011-placeholder-cursors` (already created) |

## Goal

Three new extensions without nodes, marks, commands or keymaps, each made of one ProseMirror
plugin, with their unit tests, added to `StarterKit` and to the extensions index:
`Placeholder` (a hint text shown in the empty document), `DropCursor` and `GapCursor` (wrappers
of `prosemirror-dropcursor` and `prosemirror-gapcursor`). You design and write the code; this
file gives the behavior, the public contract, the pitfalls and the expected results.

## Context (read before starting)

- `AGENTS.md` (all of it)
- `src/extensions/history/index.ts`: the shape of an extension with options and a plugin
- `src/extensions/history/history.test.ts`: the shape of the tests, and how a test passes options
  through `StarterKit`
- `src/extensions/starter-kit/index.ts` and `starter-kit.test.ts`
- `src/core/editor.ts`: the getter `isEmpty` (lines 94–99) and the constructor (lines 46–90)
- `node_modules/prosemirror-dropcursor/dist/index.d.ts` and
  `node_modules/prosemirror-gapcursor/dist/index.d.ts` (short)
- ProseMirror decorations: `Decoration.node(from, to, attrs)` and `DecorationSet.create(doc,
  decorations)` from `prosemirror-view`; the plugin prop `decorations(state)`

## Scope

Files to create:

- `src/extensions/placeholder/index.ts`, `src/extensions/placeholder/placeholder.test.ts`
- `src/extensions/drop-cursor/index.ts`, `src/extensions/drop-cursor/drop-cursor.test.ts`
- `src/extensions/gap-cursor/index.ts`, `src/extensions/gap-cursor/gap-cursor.test.ts`

Files to modify:

- `src/extensions/index.ts` — export (alphabetical order) `DropCursor, type DropCursorOptions`,
  `GapCursor`, `Placeholder, type PlaceholderOptions`.
- `src/extensions/starter-kit/index.ts` — add to `StarterKitOptions`, after `moveBlock`:
  `placeholder?: false | Partial<PlaceholderOptions>;`, `dropCursor?: false |
  Partial<DropCursorOptions>;`, `gapCursor?: false;`. Include the three extensions after
  `MoveBlock`, in this order: `Placeholder`, `DropCursor`, `GapCursor`.
- `src/extensions/starter-kit/starter-kit.test.ts` — update **only** the two expected name
  lists: add `'placeholder', 'dropCursor', 'gapCursor'` after `'moveBlock'` in both. This is the
  only allowed change to an existing test.

Do not touch: everything else, in particular `src/core/`, the existing extensions, and CSS (no
stylesheet exists yet; the styles for these extensions come in a later task).

## Contract

### Placeholder (`src/extensions/placeholder/index.ts`)

- Exported const `Placeholder`, `name: 'placeholder'`, JSDoc citing docs/SPEC.md F-011.
- Exported interface `PlaceholderOptions` with one option, with a JSDoc:
  `placeholder: string` — the hint text. Default: `''` (no placeholder).
- One plugin with a `decorations(state)` prop.

### DropCursor (`src/extensions/drop-cursor/index.ts`)

- Exported const `DropCursor`, `name: 'dropCursor'`, JSDoc citing docs/SPEC.md F-012.
- Exported interface `DropCursorOptions` (our own: the package does not export its type), each
  option with a JSDoc:
  - `color: string | false` — CSS color of the cursor; `false` = no inline color, style it with
    `class`. Default: `'currentColor'`.
  - `width: number` — width in pixels. Default: `1`.
  - `class?: string` — extra CSS class of the cursor element. No default.
- One plugin: `dropCursor(options)` from `prosemirror-dropcursor`.

### GapCursor (`src/extensions/gap-cursor/index.ts`)

- Exported const `GapCursor`, `name: 'gapCursor'`, no options, JSDoc citing docs/SPEC.md F-012.
- One plugin: `gapCursor()` from `prosemirror-gapcursor`.

## Behavior

1. **Placeholder.** When the document is empty and the `placeholder` option is not `''`, the
   empty paragraph gets a node decoration with the attributes `class="stilo-placeholder"` and
   `data-placeholder="<the text>"`. "Empty" is exactly the rule of `Editor.isEmpty`: the document
   has one child, it is a `paragraph`, and its content size is 0. In every other case there is
   no decoration. The decoration follows the document: it appears and disappears as the user
   types, deletes, undoes, or the content is replaced (`setHTML`). It is shown whether the editor
   is editable or not. It never changes `getHTML()`.
2. **DropCursor.** While something is dragged over the editor, a line shows where it would be
   dropped. Everything is done by `prosemirror-dropcursor`; the extension only passes the options.
3. **GapCursor.** Where no text cursor can go (before a horizontal rule at the start of the
   document, between two horizontal rules, ...), the arrow keys and clicks create a gap cursor
   selection, drawn as an element with class `ProseMirror-gapcursor`. Everything is done by
   `prosemirror-gapcursor`.

## How to do it (read this, it saves you from the usual traps)

- In `decorations(state)`, read the document from the `state` argument. **Never** use
  `editor.state` or `editor.isEmpty` there: the first decorations are computed while the
  `EditorView` is being built, before `editor.view` exists, so those getters crash.
- The emptiness check looks only at the first child and the child count: constant time. No
  `doc.descendants`, no traversal (AGENTS.md §4).
- The empty paragraph starts at position 0 and ends at `firstChild.nodeSize`.
- No placeholder text → no decoration at all (never `data-placeholder=""`).
- Name clash in tests: our extension is `GapCursor`, and the package's selection class is also
  `GapCursor`. In `gap-cursor.test.ts` import the class as
  `import { GapCursor as GapCursorSelection } from 'prosemirror-gapcursor';`.
- jsdom has no layout: arrow keys next to a gap and drag-and-drop do not work in unit tests
  (they throw or do nothing). Do not test them; the tests below set the gap cursor selection by
  hand. Do not use `typeText` while a gap cursor is selected: in a browser the typing goes
  through a `beforeinput` handler that the helper does not run.
- `getHTMLWithSelection` supports text selections only: with a gap cursor use `getHTML()` and
  check the selection yourself.

## Tests

Cases reasoned from the spec and the ProseMirror behavior (the gap cursor cases were checked in
jsdom). Use `createTestEditor`, `getHTMLWithSelection`, `typeText`, `pressKey` from
`tests/helpers`. Every expected return value is written explicitly: check it, never derive it
from whether the HTML changed. If a case contradicts the behavior described above, stop and ask
in `## Questions`.

### `placeholder.test.ts`

Unless a case says otherwise, the editor is
`createTestEditor({ html, extensions: [StarterKit({ placeholder: { placeholder: 'Write here' } })] })`.
"Shown" means: `editor.view.dom.querySelectorAll('.stilo-placeholder')` has exactly one element,
its `tagName` is `'P'`, its `data-placeholder` attribute is `'Write here'`, and
`editor.view.dom.querySelectorAll('[data-placeholder]')` also has exactly one element. "Hidden"
means both queries find no element. Write one small helper for these checks.

| Start `html` | Placeholder | `getHTML()` |
|---|---|---|
| `''` | shown | `<p></p>` |
| `<p></p>` | shown | `<p></p>` |
| `<p>a</p>` | hidden | `<p>a</p>` |
| `<p></p><p></p>` | hidden | `<p></p><p></p>` |
| `<h1></h1>` | hidden | `<h1></h1>` |
| `<blockquote><p></p></blockquote>` | hidden | `<blockquote><p></p></blockquote>` |
| `<hr>` | hidden | `<hr>` |

Multi-step cases, one `it` each:

1. `html: ''`: `typeText 'a'` → hidden, `getHTML()` is `<p>a</p>`; `undo()` returns `true` →
   shown, `getHTML()` is `<p></p>`.
2. `html: '<p>[a]</p>'`: hidden; `pressKey 'Backspace'` returns `true` → shown,
   `getHTMLWithSelection` is `<p>|</p>`.
3. `html: '<p>a</p>'`: hidden; `setHTML('')` → shown; `setHTML('<p>b</p>', { resetHistory: true })`
   → hidden; `setHTML('', { resetHistory: true })` → shown.
4. `html: ''`: `setEditable(false)` → shown.
5. `html: ''` with the default options, `createTestEditor({ html: '' })` → hidden.

### `drop-cursor.test.ts`

Drag-and-drop cannot run in jsdom: test only the wiring and the options.

1. `DropCursor().options` equals `{ color: 'currentColor', width: 1 }`.
2. `DropCursor({ width: 2, class: 'x' }).options` equals
   `{ color: 'currentColor', width: 2, class: 'x' }`.
3. `createTestEditor().state.plugins.length` is exactly 1 more than
   `createTestEditor({ extensions: [StarterKit({ dropCursor: false })] }).state.plugins.length`.

### `gap-cursor.test.ts`

"Set a gap at `pos`" means:
`editor.view.dispatch(editor.state.tr.setSelection(new GapCursorSelection(editor.state.doc.resolve(pos))))`.
"Gap elements" means `editor.view.dom.querySelectorAll('.ProseMirror-gapcursor').length`.

1. `html: '<hr><hr>'`, set a gap at 1: gap elements is 1; `getHTML()` is `<hr><hr>`.
2. `html: '<hr><hr>'` with `extensions: [StarterKit({ gapCursor: false })]`, set a gap at 1: gap
   elements is 0.
3. `html: '<hr><p>a</p>'`, set a gap at 0: gap elements is 1; then
   `editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 2)))`:
   gap elements is 0.
4. `html: '<hr><hr>'`, set a gap at 1; `pressKey 'Enter'` returns `true`; `getHTML()` is
   `<hr><p></p><hr>`; the selection is a `TextSelection` with `from` 2; gap elements is 0.
5. `createTestEditor().state.plugins.length` is exactly 1 more than
   `createTestEditor({ extensions: [StarterKit({ gapCursor: false })] }).state.plugins.length`.

## Acceptance criteria

- [ ] `npm run check` passes (typecheck + lint + unit tests), after `npm run format`.
- [ ] Every case listed in Tests is covered and passes.
- [ ] `git status` shows only the files in Scope (plus this task file's `## Questions` /
      `## Report` sections).
- [ ] No `any`, `@ts-ignore`, `biome-ignore`; no whole-document traversal; no CSS files.
- [ ] One commit on branch `task/T-011-placeholder-cursors`:
      `feat(extensions): add placeholder, drop cursor and gap cursor (T-011)`.

## Notes

- Run one folder while working: `npx vitest run src/extensions/placeholder`.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

## Report

<!-- Implementer: fill in when done. Files changed, summary, points for the reviewer, failed
`npm run check` runs before the final one (write "unknown" if you did not count them). -->

## Metrics

<!-- Reviewer only (the implementer never edits this section): architect tokens (preparation,
review), implementer failed check runs and context compactions, review rounds, escalation. -->
