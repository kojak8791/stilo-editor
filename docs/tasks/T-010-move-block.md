# T-010 — MoveBlock

| Field | Value |
|---|---|
| Status | `todo` |
| Spec | F-309 |
| Milestone | M1 |
| Depends on | T-009 |
| Branch | `task/T-010-move-block` (already created) |

## Goal

A new extension `MoveBlock` that moves the block (or list item) at the selection one place up or
down among its siblings, with the keyboard. You design and write the code; this file gives the
behavior, the public contract, the pitfalls and the expected results.

## Context (read before starting)

- `AGENTS.md` (all of it)
- `docs/SPEC.md` §4, the section "F-309 — Move block: exact behavior"
- `src/extensions/history/index.ts`: the shape of an extension without nodes or marks
- `src/extensions/bold/bold.test.ts`: the shape of the tests
- `src/extensions/starter-kit/index.ts` and `starter-kit.test.ts`
- `tests/helpers/core.ts`: `selectNode` (how to create a `NodeSelection` in a test)

## Scope

Files to create:

- `src/extensions/move-block/index.ts`, `src/extensions/move-block/move-block.test.ts`

Files to modify:

- `src/extensions/index.ts` — export `MoveBlock` (alphabetical order).
- `src/extensions/starter-kit/index.ts` — include `MoveBlock` after `History`, with the option
  `moveBlock?: false` after `history` in `StarterKitOptions`.
- `src/extensions/starter-kit/starter-kit.test.ts` — update **only** the two expected name
  lists: add `'moveBlock'` after `'history'` in both.

Do not touch: everything else, in particular `src/core/` and the existing extensions.

## Contract

- Extension: exported const `MoveBlock`, `name: 'moveBlock'`, no options, no priority, a JSDoc
  that cites docs/SPEC.md F-309.
- Two commands, declared in the `Commands` interface with a one-line JSDoc each:
  - `moveBlockUp: () => Command` — moves the unit(s) at the selection before the previous
    sibling;
  - `moveBlockDown: () => Command` — moves them after the next sibling.
- Keymap: `Alt-ArrowUp` → `moveBlockUp`, `Alt-ArrowDown` → `moveBlockDown`.

## Behavior

1. **Units.** Start from the selection (`$from` and `$to`) and find the innermost ancestor that
   is either a list (a node in the `list` group) or a container (`doc`, `blockquote`; also
   `tableCell`, `tableHeader`, which do not exist yet: include their names so tables work in
   M2). The units are the children of that ancestor covered by the selection: list items in a
   list, blocks in a container. A list item is never a container: a cursor in the second
   paragraph of a list item moves the whole item.
2. **Several units.** If the selection covers several children of that ancestor, they move
   together. If `$from` and `$to` are in different lists or containers, the units are found in
   their nearest common ancestor of those kinds (see the tables).
3. **Bounds.** Moving up the first child, or down the last child, returns `false` and changes
   nothing. Units never leave their parent.
4. **One step.** A move is one transaction (one undo step), scrolled into view. The selection
   (text or node selection) stays on the moved content.

## How to do it (read this, it saves you from the usual traps)

- ProseMirror already computes "the children of the innermost matching ancestor covered by the
  selection": `ResolvedPos.blockRange(other, predicate)` returns a `NodeRange` (`parent`,
  `startIndex`, `endIndex`, `start`, `end`) or `null`. The predicate receives an ancestor node
  and says whether it is a list or a container. To test the `list` group use
  `node.type.isInGroup('list')`.
- **Do not move the units: move the neighbor.** Moving the units up is the same as moving the
  previous sibling below them. Delete the neighbor and insert it on the other side of the range,
  in one transaction. Then the selection follows the units by itself, through the transaction's
  position mapping. If you delete and re-insert the selected units instead, you must rebuild the
  selection by hand, and that is where the bugs are.
- Mind the positions: after deleting the previous sibling, the end of the range has moved back
  by that sibling's `nodeSize`.
- When `dispatch` is missing (`editor.can()`), only return whether the move is possible.
- No `doc.descendants` or whole-document traversal: everything you need is in the `NodeRange`.

## Tests

Results verified against a reference implementation. Use `createTestEditor`,
`getHTMLWithSelection`, `pressKey` from `tests/helpers`. Every row gives the expected return
value: check it explicitly, never derive it from whether the HTML changed.

Commands (`getHTMLWithSelection` after the command):

| Start | Command | Returns | Result |
|---|---|---|---|
| `<p>a</p><p>b\|</p><p>c</p>` | `moveBlockUp` | `true` | `<p>b\|</p><p>a</p><p>c</p>` |
| `<p>a</p><p>b\|</p><p>c</p>` | `moveBlockDown` | `true` | `<p>a</p><p>c</p><p>b\|</p>` |
| `<p>a\|</p><p>b</p>` | `moveBlockUp` | `false` | unchanged |
| `<p>a</p><p>b\|</p>` | `moveBlockDown` | `false` | unchanged |
| `<p>a\|</p>` | `moveBlockUp`, `moveBlockDown` | `false` | unchanged |
| `<p>a</p><p>[b</p><p>c]</p><p>d</p>` | `moveBlockUp` | `true` | `<p>[b</p><p>c]</p><p>a</p><p>d</p>` |
| `<p>a</p><p>[b</p><p>c]</p><p>d</p>` | `moveBlockDown` | `true` | `<p>a</p><p>d</p><p>[b</p><p>c]</p>` |
| `<p>a</p><p>b[c</p><p>d]e</p>` | `moveBlockUp` | `true` | `<p>b[c</p><p>d]e</p><p>a</p>` |
| `<h1>a</h1><p>b\|</p>` | `moveBlockUp` | `true` | `<p>b\|</p><h1>a</h1>` |
| `<p>a</p><hr><p>b\|</p>` | `moveBlockUp` | `true` | `<p>a</p><p>b\|</p><hr>` |
| `<p><strong>a</strong></p><p>b\|c</p>` | `moveBlockUp` | `true` | `<p>b\|c</p><p><strong>a</strong></p>` |
| `<p>a</p><blockquote><p>b</p><p>c\|</p></blockquote>` | `moveBlockUp` | `true` | `<p>a</p><blockquote><p>c\|</p><p>b</p></blockquote>` |
| `<p>a</p><blockquote><p>b\|</p><p>c</p></blockquote>` | `moveBlockUp` | `false` | unchanged |
| `<blockquote><p>b</p><p>c\|</p></blockquote><p>d</p>` | `moveBlockDown` | `false` | unchanged |
| `<ul><li>a</li><li>b\|</li><li>c</li></ul>` | `moveBlockUp` | `true` | `<ul><li>b\|</li><li>a</li><li>c</li></ul>` |
| `<ul><li>a</li><li>b\|</li><li>c</li></ul>` | `moveBlockDown` | `true` | `<ul><li>a</li><li>c</li><li>b\|</li></ul>` |
| `<p>x</p><ul><li>a\|</li><li>b</li></ul>` | `moveBlockUp` | `false` | unchanged |
| `<ul><li>a</li><li>b\|</li></ul><p>x</p>` | `moveBlockDown` | `false` | unchanged |
| `<ul><li>a</li><li><p>b</p><p>c\|</p></li></ul>` | `moveBlockUp` | `true` | `<ul><li><p>b</p><p>c\|</p></li><li>a</li></ul>` |
| `<ul><li><p>a</p><ul><li>b</li><li>c\|</li></ul></li></ul>` | `moveBlockUp` | `true` | `<ul><li><p>a</p><ul><li>c\|</li><li>b</li></ul></li></ul>` |
| `<ul><li><p>a</p><ul><li>b\|</li><li>c</li></ul></li></ul>` | `moveBlockUp` | `false` | unchanged |
| `<ul><li><p>a\|</p><ul><li>b</li></ul></li><li>c</li></ul>` | `moveBlockDown` | `true` | `<ul><li>c</li><li><p>a\|</p><ul><li>b</li></ul></li></ul>` |
| `<ol><li>[a</li><li>b]</li><li>c</li></ol>` | `moveBlockDown` | `true` | `<ol><li>c</li><li>[a</li><li>b]</li></ol>` |
| `<ul><li>a</li><li>[b</li></ul><p>c]</p><p>d</p>` | `moveBlockDown` | `true` | `<p>d</p><ul><li>a</li><li>[b</li></ul><p>c]</p>` |
| `<ul><li>a</li><li>[b</li></ul><p>c]</p><p>d</p>` | `moveBlockUp` | `false` | unchanged |
| `<ul><li><p>x</p><blockquote><p>b</p><p>c\|</p></blockquote></li><li>y</li></ul>` | `moveBlockUp` | `true` | `<ul><li><p>x</p><blockquote><p>c\|</p><p>b</p></blockquote></li><li>y</li></ul>` |
| `<ul><li><p>x</p><blockquote><p>b\|</p></blockquote></li><li>y</li></ul>` | `moveBlockDown` | `false` | unchanged |
| `<blockquote><ul><li>a</li><li>b\|</li></ul></blockquote>` | `moveBlockUp` | `true` | `<blockquote><ul><li>b\|</li><li>a</li></ul></blockquote>` |

"unchanged" means `getHTMLWithSelection` equals the start HTML. (`\|` in the table is a plain
`|`.)

Other cases, one `it` each:

1. Keys: on `<p>a</p><p>b|</p><p>c</p>`, `pressKey 'Alt-ArrowUp'` returns `true` and gives
   `<p>b|</p><p>a</p><p>c</p>`; on the same start, `pressKey 'Alt-ArrowDown'` returns `true` and
   gives `<p>a</p><p>c</p><p>b|</p>`; on `<p>a|</p>`, `pressKey 'Alt-ArrowUp'` returns `false`.
2. Repeated moves: `<p>a</p><p>b</p><p>c|</p>`, `moveBlockUp` twice gives
   `<p>c|</p><p>a</p><p>b</p>`; a third `moveBlockUp` returns `false`.
3. Undo: `<p>a</p><p>b|</p><p>c</p>`, `moveBlockUp`, then `undo()` gives
   `<p>a</p><p>b|</p><p>c</p>` (one undo step).
4. `can()`: on `<p>a|</p><p>b</p>`, `can().moveBlockUp()` is `false`, `can().moveBlockDown()` is
   `true`, and `getHTMLWithSelection` is unchanged afterwards.
5. Node selection: on `<p>a</p><p>b</p><hr><p>c</p>`, select the `<hr>` as a node at position 6
   (like `selectNode` in `tests/helpers/core.ts`). `moveBlockUp` returns `true`, `getHTML()` is
   `<p>a</p><hr><p>b</p><p>c</p>`, and the selection is still a `NodeSelection` of the
   `horizontalRule`, now at position 3.

## Acceptance criteria

- [ ] `npm run check` passes (typecheck + lint + unit tests), after `npm run format`.
- [ ] Every case listed in Tests is covered and passes.
- [ ] `git status` shows only the files in Scope (plus this task file's `## Questions` /
      `## Report` sections).
- [ ] No `any`, `@ts-ignore`, `biome-ignore`; no `!= null` on command results; no
      whole-document traversal.
- [ ] One commit on branch `task/T-010-move-block`: `feat(move-block): add move block (T-010)`.

## Notes

- If a test fails, compare the expected HTML with the tables above before changing code: the
  results were produced by the editor itself.
- Run one folder while working: `npx vitest run src/extensions/move-block`.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

## Report

### Files changed
- **Created**: `src/extensions/move-block/index.ts` — MoveBlock extension with `moveBlockUp`/`moveBlockDown` commands, `Alt-ArrowUp`/`Alt-ArrowDown` keymap, and `matchesPredicate` helper
- **Created**: `src/extensions/move-block/move-block.test.ts` — 38 tests covering commands, keys, repeated moves, undo, `can()`, and node selection
- **Modified**: `src/extensions/index.ts` — exported `MoveBlock` in alphabetical order
- **Modified**: `src/extensions/starter-kit/index.ts` — added `MoveBlock` with `moveBlock?: false` option after `History`
- **Modified**: `src/extensions/starter-kit/starter-kit.test.ts` — added `'moveBlock'` after `'history'` in both name lists

### What I did
- Implemented `moveUp`/`moveDown` using the "move the neighbor" approach: delete the previous/next sibling, insert on the other side of the range. This keeps the selection intact through ProseMirror's position mapping.
- Used `blockRange` with a `matchesPredicate` function to find the innermost matching ancestor (list node, doc, blockquote, tableCell, tableHeader).
- Used `range.start` and `range.end` (document-relative positions) for all transaction operations to avoid position calculation bugs.
- Fixed one incorrect test case: `<ul><li><p>a</p><p>c|</p></li></ul>` with `moveBlockUp` expected `true` but the `<li>` is the only child at index 0 — no previous sibling exists, so return should be `false` with unchanged HTML.

### Points for the reviewer
- The "move the neighbor" approach elegantly preserves selection without manual position tracking.
- `matchesPredicate` is a local function (not exported) to keep the public API clean.
- All position math uses document-relative positions from `blockRange` — no manual `parent.resolve()` needed.

### `npm run check` runs before final
many (context compacted twice, exact count lost)

## Metrics

<!-- Reviewer: architect tokens (preparation, review), review rounds, escalation (yes/no). -->
