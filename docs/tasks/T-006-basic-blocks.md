# T-006 — Basic blocks: Heading, Blockquote, HorizontalRule, HardBreak

| Field | Value |
|---|---|
| Status | `done` |
| Spec | F-302, F-303, F-304, F-305 |
| Milestone | M1 |
| Depends on | T-005 |
| Branch | `task/T-006-basic-blocks` (already created) |

## Goal

Four new node extensions with their unit tests, added to `StarterKit` and to the extensions
index. They follow the shape of the existing extensions; the code to write is given below.

## Context (read before starting)

- `AGENTS.md` (all of it)
- `src/extensions/bold/index.ts` and `src/extensions/bold/bold.test.ts`: the reference for the
  file shape (imports, `declare module` block with JSDoc, extension JSDoc) and the test layout
- `src/extensions/paragraph/index.ts`: a node extension with a command and a keymap
- `src/core/helpers/nodes.ts` (`insertBlock`, `insertBlockNode`) and `src/core/helpers/active.ts`
  (`isNodeActive`): read only the JSDoc
- `src/extensions/starter-kit/index.ts` and `starter-kit.test.ts`
- `docs/ARCHITECTURE.md` §7.1 (nodes table) and §10 (test helpers)

## Scope

Files to create:

- `src/extensions/heading/index.ts`, `src/extensions/heading/heading.test.ts`
- `src/extensions/blockquote/index.ts`, `src/extensions/blockquote/blockquote.test.ts`
- `src/extensions/horizontal-rule/index.ts`, `src/extensions/horizontal-rule/horizontal-rule.test.ts`
- `src/extensions/hard-break/index.ts`, `src/extensions/hard-break/hard-break.test.ts`

Files to modify:

- `src/extensions/index.ts` — add (alphabetical order):
  `export { Blockquote } from './blockquote';`, `export { HardBreak } from './hard-break';`,
  `export { Heading, type HeadingLevel, type HeadingOptions } from './heading';`,
  `export { HorizontalRule } from './horizontal-rule';`
- `src/extensions/starter-kit/index.ts` — add the four extensions right after `Paragraph`, in the
  order Heading, Blockquote, HorizontalRule, HardBreak; add to `StarterKitOptions`:
  `heading?: false | Partial<HeadingOptions>; blockquote?: false; horizontalRule?: false;
  hardBreak?: false;`
- `src/extensions/starter-kit/starter-kit.test.ts` — update **only** the two expected name lists:
  `['doc', 'text', 'paragraph', 'heading', 'blockquote', 'horizontalRule', 'hardBreak', 'bold',
  'italic', 'underline', 'strike', 'code']` and the same without `'bold'`. This is the only
  allowed change to an existing test.

Do not touch: everything else, in particular `src/core/` and the existing extensions.

## Contract

Each extension: `name` equal to the node name, a `declare module '../../core/types'` block whose
commands have a one-line JSDoc (as in Bold), and a one-line JSDoc on the extension, for example:

```ts
/** The `heading` node (`<h1>`…`<h6>`), docs/SPEC.md F-302. */
```

No `priority`.

### Heading (`heading`, F-302)

```ts
/** A heading level. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Options of {@link Heading}. */
export interface HeadingOptions {
  /** Allowed levels. Default: all six. */
  levels: HeadingLevel[];
}
```

- `defineExtension<HeadingOptions>({ name: 'heading', defaultOptions: { levels: [1, 2, 3, 4, 5, 6] }, ... })`
- Node (only the allowed levels are parsed):

  ```ts
  nodes: ({ levels }) => ({
    heading: {
      group: 'block',
      content: 'inline*',
      defining: true,
      attrs: { level: { default: levels[0] ?? 1 } },
      parseDOM: levels.map((level) => ({ tag: `h${level}`, attrs: { level } })),
      toDOM: (node) => [`h${node.attrs.level}`, 0],
    },
  }),
  ```

- Commands (import `setBlockType` from `prosemirror-commands`, `isNodeActive` from
  `'../../core/helpers/active'`):
  - `setHeading: (attrs: { level: HeadingLevel }) => Command` — `false` when `level` is not in
    `options.levels`, otherwise `setBlockType(heading, { level })`.
  - `toggleHeading: (attrs: { level: HeadingLevel }) => Command` — when
    `isNodeActive(state, heading, { level })`: `setBlockType(paragraph)`; otherwise `setHeading`.
  - Write `setHeading` as a local `const` inside `commands` and reuse it in `toggleHeading`.
- Keymap: `Mod-Alt-<level>` → `editor.commands.toggleHeading({ level })`, one per allowed level,
  built with `Object.fromEntries(options.levels.map(...))`.
- Input rules (import `textblockTypeInputRule` from `prosemirror-inputrules`), one per allowed
  level:

  ```ts
  inputRules: ({ schema, options }) =>
    options.levels.map((level) =>
      textblockTypeInputRule(new RegExp(`^#{${level}}\\s$`), schema.nodes.heading!, { level }),
    ),
  ```

### Blockquote (`blockquote`, F-303)

- Node: `{ group: 'block', content: 'block+', defining: true, parseDOM: [{ tag: 'blockquote' }], toDOM: () => ['blockquote', 0] }`
- Commands (import `lift`, `wrapIn` from `prosemirror-commands`):
  - `setBlockquote: () => Command` — `wrapIn(blockquote)`
  - `unsetBlockquote: () => Command` — `isNodeActive(state, blockquote) && lift(state, dispatch)`
  - `toggleBlockquote: () => Command` — `lift` when `isNodeActive`, otherwise `wrapIn`
- Keymap: `'Mod-Shift-b'` → `toggleBlockquote`
- Input rule (import `wrappingInputRule`): `wrappingInputRule(/^\s*>\s$/, blockquote)`

### HorizontalRule (`horizontalRule`, F-304)

- Node: `{ group: 'block', parseDOM: [{ tag: 'hr' }], toDOM: () => ['hr'] }`
- Command: `setHorizontalRule: () => Command` — `insertBlock(horizontalRule)` (from
  `'../../core/helpers/nodes'`)
- Input rule (import `InputRule` from `prosemirror-inputrules`):
  `new InputRule(/^---$/, (state, _match, start, end) => insertBlockNode(state.tr.delete(start, end), horizontalRule.create()))`
- No keymap.

### HardBreak (`hardBreak`, F-305)

- Node: `{ inline: true, group: 'inline', selectable: false, linebreakReplacement: true, leafText: () => '\n', parseDOM: [{ tag: 'br' }], toDOM: () => ['br'] }`
- Command: `setHardBreak: () => Command`:

  ```ts
  setHardBreak: () => (state, dispatch) => {
    const type = schema.nodes.hardBreak!;
    const { $from } = state.selection;
    if (!$from.parent.canReplaceWith($from.index(), $from.index(), type)) return false;
    dispatch?.(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
    return true;
  },
  ```

- Keymap: `'Shift-Enter'` → `setHardBreak`

## Tests

Each test file copies the layout of `bold.test.ts` and covers **at least** the cases below
(results verified against a reference implementation). Use `createTestEditor`,
`getHTMLWithSelection`, `typeText`, `pressKey` from `tests/helpers`; for the `levels` option pass
`extensions: [StarterKit({ heading: { levels: [1, 2, 3] } })]`.

Parse (`getHTML()` of `createTestEditor({ html })`), plus one idempotence test per extension:

| Input | Expected |
|---|---|
| `<h1>a</h1><h2>b</h2><h3>c</h3><h4>d</h4><h5>e</h5><h6>f</h6>` | same |
| `<h1>a</h1><h4>d</h4>` with levels `[1, 2, 3]` | `<h1>a</h1><p>d</p>` |
| `<h2>a <strong>b</strong></h2>` | same |
| `<blockquote><p>a</p><p>b</p></blockquote>` | same |
| `<blockquote>a</blockquote>` | `<blockquote><p>a</p></blockquote>` |
| `<blockquote><h1>t</h1><blockquote><p>n</p></blockquote></blockquote>` | same |
| `<p>a</p><hr><p>b</p>` | same |
| `<p>a<br>b</p>` and `<p><strong>a<br>b</strong></p>` | same |

Also: `getText()` of `<p>a<br>b</p><h1>c</h1>` is `'a\nb\n\nc'`.

Commands and keys (`getHTMLWithSelection` after the action):

| Start | Action | Returns | Result |
|---|---|---|---|
| `<p>a\|b</p>` | `setHeading({ level: 2 })` | `true` | `<h2>a\|b</h2>` |
| `<h2>a\|b</h2>` | `toggleHeading({ level: 2 })` | `true` | `<p>a\|b</p>` |
| `<h2>a\|b</h2>` | `toggleHeading({ level: 3 })` | `true` | `<h3>a\|b</h3>` |
| `<p>[a</p><p>b]</p>` | `setHeading({ level: 1 })` | `true` | `<h1>[a</h1><h1>b]</h1>` |
| `<p>a\|b</p>`, levels `[1, 2, 3]` | `setHeading({ level: 4 })` | `false` | `<p>a\|b</p>` |
| `<p>a\|b</p>`, levels `[1, 2, 3]` | `pressKey 'Mod-Alt-4'` | `false` | `<p>a\|b</p>` |
| `<p>a\|b</p>` | `pressKey 'Mod-Alt-1'` / `'Mod-Alt-6'` | `true` | `<h1>a\|b</h1>` / `<h6>a\|b</h6>` |
| `<h1>ab\|</h1>` | `pressKey 'Enter'` | `true` | `<h1>ab</h1><p>\|</p>` |
| `<p>a\|b</p>` | `setBlockquote()` | `true` | `<blockquote><p>a\|b</p></blockquote>` |
| `<p>[a</p><p>b]</p>` | `setBlockquote()` | `true` | `<blockquote><p>[a</p><p>b]</p></blockquote>` |
| `<blockquote><p>a\|b</p></blockquote>` | `unsetBlockquote()` | `true` | `<p>a\|b</p>` |
| `<p>a\|b</p>` | `unsetBlockquote()` | `false` | `<p>a\|b</p>` |
| `<blockquote><p>a\|b</p></blockquote>` | `toggleBlockquote()` | `true` | `<p>a\|b</p>` |
| `<p>a\|b</p>` | `pressKey 'Mod-Shift-b'` | `true` | `<blockquote><p>a\|b</p></blockquote>` |
| `<p>ab\|</p>` | `setHorizontalRule()` | `true` | `<p>ab</p><hr><p>\|</p>` |
| `<p>a\|b</p>` | `setHorizontalRule()` | `true` | `<p>a</p><hr><p>\|b</p>` |
| `<p>\|</p><p>x</p>` | `setHorizontalRule()` | `true` | `<hr><p>\|x</p>` |
| `<p>a[b]c</p>` | `setHorizontalRule()` | `true` | `<p>a</p><hr><p>\|c</p>` |
| `<blockquote><p>a\|</p></blockquote>` | `setHorizontalRule()` | `true` | `<blockquote><p>a</p><hr><p>\|</p></blockquote>` |
| `<p>a\|b</p>` | `setHardBreak()` | `true` | `<p>a<br>\|b</p>` |
| `<p>a[b]c</p>` | `setHardBreak()` | `true` | `<p>a<br>\|c</p>` |
| `<p><strong>a\|b</strong></p>` | `pressKey 'Shift-Enter'` | `true` | `<p><strong>a<br>\|b</strong></p>` |

Input rules (`typeText`):

| Start | Typed | Result |
|---|---|---|
| `<p>\|</p>` | `# a` / `### a` / `###### a` | `<h1>a\|</h1>` / `<h3>a\|</h3>` / `<h6>a\|</h6>` |
| `<p>\|</p>` | `####### a` | `<p>####### a\|</p>` |
| `<p>\|</p>` | `#a` | `<p>#a\|</p>` |
| `<p>x\|</p>` | `# a` | `<p>x# a\|</p>` |
| `<p>\|x</p>` | `## ` | `<h2>\|x</h2>` |
| `<p>\|</p>`, levels `[1, 2, 3]` | `#### a` | `<p>#### a\|</p>` |
| `<p>\|</p>` | `> a` | `<blockquote><p>a\|</p></blockquote>` |
| `<p>\|</p>` | `---` | `<hr><p>\|</p>` |
| `<p>\|</p><p>y</p>` | `---` | `<hr><p>\|y</p>` |

(`\|` in the tables is a plain `|`.)

## Acceptance criteria

- [ ] `npm run check` passes (typecheck + lint + unit tests), after `npm run format`.
- [ ] Every case listed in Tests is covered and passes.
- [ ] `git status` shows only the files in Scope (plus this task file's `## Questions` /
      `## Report` sections).
- [ ] No `any`, `@ts-ignore`, `biome-ignore`.
- [ ] One commit on branch `task/T-006-basic-blocks`:
      `feat(extensions): add heading, blockquote, horizontal rule and hard break (T-006)`.

## Notes

- In the heading regex the template literal needs `\\s` (it becomes `\s` in the string).
- `pressKey`: write the combination exactly as in the keymap (`'Mod-Alt-1'`, `'Shift-Enter'`).
- `editor.commands.setHeading({ level: 2 })`: with `it.each`, type the level as `HeadingLevel`
  (import the type from `'../heading'` or `'.'`) or add `as const` to the table.
- Run one folder while working: `npx vitest run src/extensions/heading`.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

## Report

### Files changed

**Created (8 files):**
- `src/extensions/heading/index.ts` — Heading node extension with `setHeading`/`toggleHeading` commands, `Mod-Alt-<N>` keymap, and `#N ` input rules
- `src/extensions/heading/heading.test.ts` — Parse, idempotence, command, keymap, and input rule tests
- `src/extensions/blockquote/index.ts` — Blockquote node extension with `setBlockquote`/`unsetBlockquote`/`toggleBlockquote` commands, `Mod-Shift-b` keymap, and `> ` input rule
- `src/extensions/blockquote/blockquote.test.ts` — Parse, idempotence, command, keymap, and input rule tests
- `src/extensions/horizontal-rule/index.ts` — HorizontalRule node extension with `setHorizontalRule` command and `---` input rule
- `src/extensions/horizontal-rule/horizontal-rule.test.ts` — Parse, idempotence, command, and input rule tests
- `src/extensions/hard-break/index.ts` — HardBreak node extension with `setHardBreak` command and `Shift-Enter` keymap
- `src/extensions/hard-break/hard-break.test.ts` — Parse, idempotence, getText, command, and keymap tests

**Modified (3 files):**
- `src/extensions/index.ts` — Added alphabetical exports for Blockquote, HardBreak, Heading (with types), HorizontalRule
- `src/extensions/starter-kit/index.ts` — Added imports, `StarterKitOptions` entries (`heading`, `blockquote`, `horizontalRule`, `hardBreak`), and four `include()` calls in order after Paragraph
- `src/extensions/starter-kit/starter-kit.test.ts` — Updated both expected name lists to include the four new node names

### What was done

Implemented four block-level node extensions following the reference extension shape:

1. **Heading** — Configurable levels (default all six), `setBlockType`-based commands, keymap per allowed level, `textblockTypeInputRule` per level
2. **Blockquote** — Uses `lift`/`wrapIn` from `prosemirror-commands`, `lift` when active / `wrapIn` when inactive for toggle
3. **HorizontalRule** — Uses `insertBlockNode` from core helpers, `InputRule` with `tr.delete()` for the `---` pattern
4. **HardBreak** — Inline node with `linebreakReplacement: true` and `leafText: () => '\n'`, uses `replaceSelectionWith(type.create())`

### Points for the reviewer

- The `lift`/`wrapIn` functions from `prosemirror-commands` return `Transaction | null`, so I convert to `boolean` with `!= null` checks to satisfy the `Command` return type
- `setHeading` is a local factory function (not typed as `Command`) to preserve its `(attrs) => Command` signature while being reusable in `toggleHeading`
- All 484 tests pass (including the 51 new tests across 4 test files)
