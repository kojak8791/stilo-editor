# T-007 — Lists: BulletList, OrderedList, ListItem

| Field | Value |
|---|---|
| Status | `done` |
| Spec | F-401, F-402, F-403, F-404, F-405 |
| Milestone | M1 |
| Depends on | T-006 |
| Branch | `task/T-007-lists` (already created) |

## Goal

Three new node extensions with their unit tests, added to `StarterKit` and to the extensions
index. The code to write is given below; the lists are serialized as tight lists
(`<li>text</li>`) by the core (see `docs/decisions/0001-tight-list-items.md`).

## Context (read before starting)

- `AGENTS.md` (all of it, in particular §3 on commands returning `boolean`)
- `src/extensions/blockquote/index.ts` and `src/extensions/blockquote/blockquote.test.ts`: the
  reference for a node extension and its tests
- `src/core/helpers/lists.ts` (`toggleList`): read only the JSDoc
- `docs/decisions/0001-tight-list-items.md`
- `src/extensions/starter-kit/index.ts` and `starter-kit.test.ts`
- `docs/ARCHITECTURE.md` §7.1 (nodes table) and §10 (test helpers)

## Scope

Files to create:

- `src/extensions/list-item/index.ts`, `src/extensions/list-item/list-item.test.ts`
- `src/extensions/bullet-list/index.ts`, `src/extensions/bullet-list/bullet-list.test.ts`
- `src/extensions/ordered-list/index.ts`, `src/extensions/ordered-list/ordered-list.test.ts`

Files to modify:

- `src/extensions/index.ts` — add (alphabetical order): `export { BulletList } from
  './bullet-list';`, `export { ListItem } from './list-item';`, `export { OrderedList } from
  './ordered-list';`
- `src/extensions/starter-kit/index.ts` — add the three extensions right after `HardBreak`, in
  the order BulletList, OrderedList, ListItem; add to `StarterKitOptions` (after `hardBreak`):
  `bulletList?: false; orderedList?: false; listItem?: false;`
- `src/extensions/starter-kit/starter-kit.test.ts` — update **only** the two expected name
  lists: insert `'bulletList', 'orderedList', 'listItem'` after `'hardBreak'` in both. This is
  the only allowed change to an existing test.

Do not touch: everything else, in particular `src/core/` and the existing extensions.

## Contract

Each extension: `name` equal to the node name, a `declare module '../../core/types'` block whose
commands have the one-line JSDoc written below, and the extension JSDoc written below. No
`priority`. Do not add the sentence "Reference extension: …" (it belongs to Bold only).

### ListItem (`src/extensions/list-item/index.ts`)

```ts
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /** Splits the list item at the cursor; in an empty item, lifts it out of the list. */
    splitListItem: () => Command;
    /** Nests the selected list items one level deeper. */
    sinkListItem: () => Command;
    /** Lifts the selected list items one level up (out of the list at the top level). */
    liftListItem: () => Command;
  }
}

/**
 * The `listItem` node (`<li>`), docs/SPEC.md F-403, F-404. Required by `BulletList` and
 * `OrderedList`.
 */
export const ListItem = defineExtension({
  name: 'listItem',
  nodes: () => ({
    listItem: {
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ tag: 'li' }],
      toDOM: () => ['li', 0],
    },
  }),
  commands: ({ schema }) => {
    const listItem = schema.nodes.listItem!;
    return {
      splitListItem: () => splitListItem(listItem),
      sinkListItem: () => sinkListItem(listItem),
      liftListItem: () => liftListItem(listItem),
    };
  },
  keymap: ({ editor, schema }) => ({
    Enter: () => editor.commands.splitListItem(),
    Tab: () => editor.commands.sinkListItem(),
    'Shift-Tab': () => editor.commands.liftListItem(),
    // At the start of the first paragraph of an item, Backspace lifts the item.
    Backspace: (state) => {
      const { $from, empty } = state.selection;
      const isItemStart =
        empty &&
        $from.parentOffset === 0 &&
        $from.depth >= 2 &&
        $from.node(-1).type === schema.nodes.listItem &&
        $from.index(-1) === 0;
      return isItemStart && editor.commands.liftListItem();
    },
  }),
});
```

### BulletList (`src/extensions/bullet-list/index.ts`)

- JSDoc of the command and of the extension:

  ```ts
  /** Wraps the selection in a bullet list, lifts it out, or converts another list type. */
  /** The `bulletList` node (`<ul>`), docs/SPEC.md F-401, F-405. Requires `ListItem`. */
  ```

- Node: `bulletList: { group: 'block list', content: 'listItem+', parseDOM: [{ tag: 'ul' }], toDOM: () => ['ul', 0] }`.
  The `list` group is what `toggleList` uses to recognize lists.
- Command: `toggleBulletList: () => toggleList(schema.nodes.bulletList!, schema.nodes.listItem!)`
  (`toggleList` from `'../../core/helpers/lists'`).
- Keymap: `'Mod-Shift-8'` → `editor.commands.toggleBulletList()`.
- Input rule: `wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bulletList!)` (from
  `prosemirror-inputrules`).

### OrderedList (`src/extensions/ordered-list/index.ts`)

Same shape as BulletList, with `toggleOrderedList`, `'Mod-Shift-7'`, and this node, helper and
input rule:

```ts
/** Reads the `start` attribute: a non-negative integer (like the `0. ` input rule), else 1. */
function parseStart(element: HTMLElement): number {
  const value = element.getAttribute('start')?.trim() ?? '';
  return /^\d+$/.test(value) ? Number(value) : 1;
}
```

```ts
  nodes: () => ({
    orderedList: {
      group: 'block list',
      content: 'listItem+',
      attrs: { start: { default: 1 } },
      parseDOM: [{ tag: 'ol', getAttrs: (element) => ({ start: parseStart(element) }) }],
      toDOM: (node) =>
        node.attrs.start === 1 ? ['ol', 0] : ['ol', { start: node.attrs.start }, 0],
    },
  }),
```

```ts
  inputRules: ({ schema }) => [
    wrappingInputRule(
      /^(\d+)\.\s$/,
      schema.nodes.orderedList!,
      (match) => ({ start: Number(match[1]) }),
      (match, node) => node.childCount + node.attrs.start === Number(match[1]),
    ),
  ],
```

- JSDoc of the command and of the extension:

  ```ts
  /** Wraps the selection in an ordered list, lifts it out, or converts another list type. */
  /**
   * The `orderedList` node (`<ol start="n">`, `start` omitted when 1), docs/SPEC.md F-402, F-405.
   * Requires `ListItem`.
   */
  ```

## Tests

Each test file copies the layout of `blockquote.test.ts` and covers **at least** the cases below
(results verified against a reference implementation). Use `createTestEditor`,
`getHTMLWithSelection`, `typeText`, `pressKey` from `tests/helpers`. Put each case in the test
file of the extension it is about (`Enter`, `Tab`, `Shift-Tab`, `Backspace` → `list-item.test.ts`).

Parse (`getHTML()` of `createTestEditor({ html })`), plus one idempotence test per list type:

| Input | Expected |
|---|---|
| `<ul><li>a</li><li>b</li></ul>` | same |
| `<ul><li><p>a</p></li></ul>` | `<ul><li>a</li></ul>` |
| `<ul><li><p>a</p><p>b</p></li></ul>` | same |
| `<ul><li>a<ul><li>b</li></ul></li></ul>` | `<ul><li><p>a</p><ul><li>b</li></ul></li></ul>` |
| `<ul><li>a<ol><li>b</li></ol></li></ul>` | `<ul><li><p>a</p><ol><li>b</li></ol></li></ul>` |
| `<ul><li><strong>a</strong> b</li></ul>` | same |
| `<li>orphan</li>` | `<ul><li>orphan</li></ul>` |
| `<ol><li>a</li></ol>` and `<ol start="1"><li>a</li></ol>` | `<ol><li>a</li></ol>` |
| `<ol start="3"><li>a</li></ol>` and `<ol start="0"><li>a</li></ol>` | same |
| `<ol start="x">…`, `<ol start="">…`, `<ol start="-2">…`, `<ol start="2.5">…` (one item `a`) | `<ol><li>a</li></ol>` |

Also: `getText()` of `<ul><li>a</li><li>b</li></ul>` is `'a\n\nb'`.

Commands and keys (`getHTMLWithSelection` after the action):

| Start | Action | Returns | Result |
|---|---|---|---|
| `<p>a\|</p>` | `toggleBulletList()` | `true` | `<ul><li>a\|</li></ul>` |
| `<p>[a</p><p>b]</p>` | `toggleBulletList()` | `true` | `<ul><li>[a</li><li>b]</li></ul>` |
| `<ul><li>a\|</li></ul>` | `toggleBulletList()` | `true` | `<p>a\|</p>` |
| `<ul><li>a\|</li><li>b</li></ul>` | `toggleOrderedList()` | `true` | `<ol><li>a\|</li><li>b</li></ol>` |
| `<ol start="3"><li>a\|</li></ol>` | `toggleBulletList()` | `true` | `<ul><li>a\|</li></ul>` |
| `<p>a\|</p>` | `toggleOrderedList()` | `true` | `<ol><li>a\|</li></ol>` |
| `<blockquote><p>a\|</p></blockquote>` | `toggleBulletList()` | `true` | `<blockquote><ul><li>a\|</li></ul></blockquote>` |
| `<p>a\|</p>` | `pressKey 'Mod-Shift-8'` / `'Mod-Shift-7'` | `true` | `<ul><li>a\|</li></ul>` / `<ol><li>a\|</li></ol>` |
| `<ul><li>ab\|</li></ul>` | `pressKey 'Enter'` | `true` | `<ul><li>ab</li><li>\|</li></ul>` |
| `<ul><li>a\|b</li></ul>` | `pressKey 'Enter'` | `true` | `<ul><li>a</li><li>\|b</li></ul>` |
| `<ul><li>a</li><li>\|</li></ul>` | `pressKey 'Enter'` | `true` | `<ul><li>a</li></ul><p>\|</p>` |
| `<ul><li>a</li><li>\|</li><li>b</li></ul>` | `pressKey 'Enter'` | `true` | `<ul><li>a</li></ul><p>\|</p><ul><li>b</li></ul>` |
| `<ul><li><p>a</p><ul><li>\|</li></ul></li></ul>` | `pressKey 'Enter'` | `true` | `<ul><li>a</li><li>\|</li></ul>` |
| `<ul><li>a</li><li>b\|</li></ul>` | `pressKey 'Tab'` | `true` | `<ul><li><p>a</p><ul><li>b\|</li></ul></li></ul>` |
| `<ul><li>a\|</li></ul>` | `pressKey 'Tab'` | `false` | `<ul><li>a\|</li></ul>` |
| `<p>a\|</p>` | `pressKey 'Tab'` | `false` | `<p>a\|</p>` |
| `<ul><li><p>a</p><ul><li>b\|</li></ul></li></ul>` | `pressKey 'Shift-Tab'` | `true` | `<ul><li>a</li><li>b\|</li></ul>` |
| `<ul><li>a\|</li></ul>` | `pressKey 'Shift-Tab'` | `true` | `<p>a\|</p>` |
| `<ul><li>a</li><li>\|b</li></ul>` | `pressKey 'Backspace'` | `true` | `<ul><li>a</li></ul><p>\|b</p>` |
| `<ul><li>a\|b</li></ul>` | `pressKey 'Backspace'` | `false` | `<ul><li>a\|b</li></ul>` |
| `<ul><li><p>a</p><p>\|b</p></li></ul>` | `pressKey 'Backspace'` | `true` | `<ul><li>a\|b</li></ul>` |
| `<p>a\|</p>` | `liftListItem()` | `false` | `<p>a\|</p>` |

Input rules (`typeText`, then optionally a key):

| Start | Typed | Result |
|---|---|---|
| `<p>\|</p>` | `- a` / `* a` / `+ a` | `<ul><li>a\|</li></ul>` |
| `<p>\|</p>` | `1. a` | `<ol><li>a\|</li></ol>` |
| `<p>\|</p>` | `3. a` | `<ol start="3"><li>a\|</li></ol>` |
| `<p>\|</p>` | `-a` / `1.a` | `<p>-a\|</p>` / `<p>1.a\|</p>` |
| `<p>x\|</p>` | `- ` | `<p>x- \|</p>` |
| `<p>\|</p>` | `- `, then `pressKey 'Backspace'` | `<p>- \|</p>` |
| `<ul><li>a</li></ul><p>\|</p>` | `- ` | `<ul><li>a</li><li>\|</li></ul>` |
| `<ol><li>a</li></ol><p>\|</p>` | `2. ` | `<ol><li>a</li><li>\|</li></ol>` |

(`\|` in the tables is a plain `|`.)

## Acceptance criteria

- [ ] `npm run check` passes (typecheck + lint + unit tests), after `npm run format`.
- [ ] Every case listed in Tests is covered and passes.
- [ ] `git status` shows only the files in Scope (plus this task file's `## Questions` /
      `## Report` sections).
- [ ] No `any`, `@ts-ignore`, `biome-ignore`; no `!= null` on command results.
- [ ] One commit on branch `task/T-007-lists`:
      `feat(extensions): add bullet list, ordered list and list item (T-007)`.

## Notes

- `pressKey`: write the combination exactly as in the keymap (`'Mod-Shift-8'`, `'Shift-Tab'`).
- If a test fails, compare the expected HTML with the tables above before changing code: the
  results were produced by the editor itself.
- Run one folder while working: `npx vitest run src/extensions/list-item`.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

## Report

### Files changed

**Created (6 files):**
- `src/extensions/bullet-list/index.ts` — `BulletList` extension with `toggleBulletList` command, `Mod-Shift-8` keymap, and `-/+/*` input rules.
- `src/extensions/bullet-list/bullet-list.test.ts` — parse, idempotence, command, keymap, and input rule tests for bullet lists.
- `src/extensions/list-item/index.ts` — `ListItem` extension with `splitListItem`, `sinkListItem`, `liftListItem` commands and `Enter`/`Tab`/`Shift-Tab`/`Backspace` keymap.
- `src/extensions/list-item/list-item.test.ts` — parse, idempotence, `getText`, command, keymap, and input rule tests covering all cases from the task.
- `src/extensions/ordered-list/index.ts` — `OrderedList` extension with `toggleOrderedList` command, `Mod-Shift-7` keymap, `parseStart` helper, and `\d+. ` input rules.
- `src/extensions/ordered-list/ordered-list.test.ts` — parse, idempotence, command, keymap, and input rule tests for ordered lists.

**Modified (3 files):**
- `src/extensions/index.ts` — added alphabetical exports for `BulletList`, `ListItem`, `OrderedList`.
- `src/extensions/starter-kit/index.ts` — imported the three extensions, added `bulletList`/`orderedList`/`listItem` to `StarterKitOptions`, added them to `StarterKit()` after `HardBreak`.
- `src/extensions/starter-kit/starter-kit.test.ts` — added `'bulletList', 'orderedList', 'listItem'` to both expected name lists.

### Summary

Implemented three node extensions (BulletList, OrderedList, ListItem) following the exact code given in the task contract. The ListItem extension provides split/sink/lift commands and keymap handlers (Enter, Tab, Shift-Tab, Backspace). BulletList and OrderedList each provide a `toggleList` command, keyboard shortcut (`Mod-Shift-8` / `Mod-Shift-7`), and input rules for automatic list creation. All 589 tests pass including the new list tests.

### Points for the reviewer

- All test cases from the task's Tests table are covered (parse, serialize, idempotence, commands, keymap, input rules).
- The `parseStart` helper for `<ol start="n">` follows the exact code from the contract.
- Input rules: `-`/`*`/`+` for bullet lists, `\d+. ` for ordered lists, with the `match` filter for ordered lists to avoid resetting the start number.
