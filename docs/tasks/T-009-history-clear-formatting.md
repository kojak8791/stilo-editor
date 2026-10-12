# T-009 — History and ClearFormatting

| Field | Value |
|---|---|
| Status | `todo` |
| Spec | F-101, F-102, F-103, F-212 |
| Milestone | M1 |
| Depends on | T-008 |
| Branch | `task/T-009-history-clear-formatting` (already created) |

## Goal

Two new extensions without nodes or marks, with their unit tests, added to `StarterKit` and to
the extensions index: `History` (undo/redo) and `ClearFormatting` (removes every formatting mark
except links). The code to write is given below.

## Context (read before starting)

- `AGENTS.md` (all of it)
- `src/extensions/bold/index.ts` and `src/extensions/bold/bold.test.ts`: the reference for an
  extension and its tests
- `src/extensions/heading/index.ts`: lines 1–30 only (an extension with options)
- `src/extensions/starter-kit/index.ts` and `starter-kit.test.ts`
- `docs/ARCHITECTURE.md` §7.2 (the paragraph "Mark exclusion") and §10 (test helpers)

## Scope

Files to create:

- `src/extensions/history/index.ts`, `src/extensions/history/history.test.ts`
- `src/extensions/clear-formatting/index.ts`,
  `src/extensions/clear-formatting/clear-formatting.test.ts`

Files to modify:

- `src/extensions/index.ts` — add (alphabetical order):
  `export { ClearFormatting } from './clear-formatting';` after `BulletList`, and
  `export { History, type HistoryOptions } from './history';` after `Heading`.
- `src/extensions/starter-kit/index.ts` — import `ClearFormatting` and
  `History, type HistoryOptions`; add to `StarterKitOptions` after `link`:
  `clearFormatting?: false;` and `history?: false | Partial<HistoryOptions>;`; add after the
  `Link` line: `...include(ClearFormatting, options.clearFormatting),` then
  `...include(History, options.history),`.
- `src/extensions/starter-kit/starter-kit.test.ts` — update **only** the two expected name
  lists: add `'clearFormatting', 'history'` after `'link'` in both. This is the only allowed
  change to an existing test.

Do not touch: everything else, in particular `src/core/` and the existing extensions.

## Contract

### History (`src/extensions/history/index.ts`), exactly this code

```ts
import { history, redo, undo } from 'prosemirror-history';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /** Undoes the last change. */
    undo: () => Command;
    /** Redoes the last undone change. */
    redo: () => Command;
  }
}

/** Options of {@link History}. */
export interface HistoryOptions {
  /** Maximum number of undo steps kept (approximately). Default: 100. */
  depth: number;
  /** Changes closer in time than this (ms) and adjacent are grouped in one step. Default: 500. */
  newGroupDelay: number;
}

/**
 * Undo/redo with `prosemirror-history`, docs/SPEC.md F-101, F-102. Swappable: another extension
 * (e.g. collaboration) may provide `undo`/`redo` instead.
 */
export const History = defineExtension<HistoryOptions>({
  name: 'history',
  defaultOptions: { depth: 100, newGroupDelay: 500 },
  commands: () => ({
    undo: () => undo,
    redo: () => redo,
  }),
  keymap: ({ editor }) => ({
    'Mod-z': () => editor.commands.undo(),
    'Mod-Shift-z': () => editor.commands.redo(),
    'Mod-y': () => editor.commands.redo(),
  }),
  plugins: ({ options }) => [history(options)],
});
```

### ClearFormatting (`src/extensions/clear-formatting/index.ts`), exactly this code

```ts
import type { MarkType } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /** Removes every formatting mark (all marks except links) from the selection. */
    clearFormatting: () => Command;
  }
}

/** Command: removes the marks of `types` from the selection, or from the stored marks. */
function clearMarks(types: readonly MarkType[]): Command {
  return (state, dispatch) => {
    const { empty, $from, ranges } = state.selection;
    if (empty) {
      const marks = state.storedMarks ?? $from.marks();
      const kept = marks.filter((mark) => !types.includes(mark.type));
      if (kept.length === marks.length) return false;
      dispatch?.(state.tr.setStoredMarks(kept));
      return true;
    }

    const hasMark = ranges.some((range) =>
      types.some((type) => state.doc.rangeHasMark(range.$from.pos, range.$to.pos, type)),
    );
    if (!hasMark) return false;

    if (dispatch) {
      const tr = state.tr;
      for (const range of ranges) {
        for (const type of types) tr.removeMark(range.$from.pos, range.$to.pos, type);
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

/**
 * The `clearFormatting` command, docs/SPEC.md F-212: removes the marks of the `formatting`
 * group (docs/ARCHITECTURE.md §7.2), so links stay.
 */
export const ClearFormatting = defineExtension({
  name: 'clearFormatting',
  commands: ({ schema }) => {
    const types = Object.values(schema.marks).filter((type) =>
      (type.spec.group ?? '').split(' ').includes('formatting'),
    );
    return { clearFormatting: () => clearMarks(types) };
  },
  keymap: ({ editor }) => ({
    'Mod-\\': () => editor.commands.clearFormatting(),
  }),
});
```

The key `'Mod-\\'` is the TypeScript string for `Mod-` followed by **one** backslash. In tests
write it the same way: `pressKey(editor, 'Mod-\\')`.

## Tests

Results verified against a reference implementation. Use `createTestEditor`,
`getHTMLWithSelection`, `typeText`, `pressKey` from `tests/helpers`. **Every expected return
value is written explicitly below: never derive it from whether the HTML changed.**

### `history.test.ts`

Each numbered item is one `it`, with its steps in this order. "→" means "then
`getHTMLWithSelection(editor)` is".

1. `<p>a|</p>`: `can().undo()` is `false`, `can().redo()` is `false`, `undo()` returns `false`.
2. `<p>a|</p>`, `typeText 'bc'` → `<p>abc|</p>`; `undo()` returns `true` → `<p>a|</p>`;
   `redo()` returns `true` → `<p>abc|</p>`.
3. `<p>a|</p>`, `typeText 'bc'`; `pressKey 'Mod-z'` returns `true` → `<p>a|</p>`;
   `pressKey 'Mod-Shift-z'` returns `true` → `<p>abc|</p>`; `pressKey 'Mod-z'`;
   `pressKey 'Mod-y'` returns `true` → `<p>abc|</p>`.
4. `<p>[ab]</p>`, `toggleBold()`; `undo()` returns `true` → `<p>[ab]</p>`; `redo()` returns
   `true` → `<p><strong>[ab]</strong></p>`.
5. `<p>a|</p>`, `typeText 'b'`, `setHTML('<p>x</p>')`; `undo()` returns `true` and `getHTML()` is
   `<p>ab</p>`; `undo()` returns `true` and `getHTML()` is `<p>a</p>`.
6. `<p>a|</p>`, `setHTML('<p>y</p>', { resetHistory: true })`: `can().undo()` is `false`.
7. `createTestEditor({ html: '<p>a|</p>', extensions: [StarterKit({ history: false })] })`
   (import `StarterKit` from `'../starter-kit'`): `pressKey 'Mod-z'` returns `false`.

Then add exactly this block (it needs `afterEach`, `beforeEach`, `vi` from `vitest`):

```ts
describe('History: options', () => {
  // Only `Date` is faked: prosemirror-history reads the transaction time from `Date.now()`.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [{}, 400, '<p>a|</p>'],
    [{}, 1000, '<p>ab|</p>'],
    [{ newGroupDelay: 2000 }, 1000, '<p>a|</p>'],
  ])('with %j and %i ms between two characters, undo gives %j', (history, ms, expected) => {
    const editor = createTestEditor({ html: '<p>a|</p>', extensions: [StarterKit({ history })] });
    typeText(editor, 'b');
    vi.advanceTimersByTime(ms);
    typeText(editor, 'c');
    expect(editor.commands.undo()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('keeps about `depth` undo steps', () => {
    const undoSteps = (depth: number) => {
      const editor = createTestEditor({
        html: '<p>|</p>',
        extensions: [StarterKit({ history: { depth } })],
      });
      for (let i = 0; i < 60; i++) {
        typeText(editor, 'a');
        vi.advanceTimersByTime(1000);
      }
      let steps = 0;
      while (editor.commands.undo()) steps++;
      return steps;
    };
    expect(undoSteps(100)).toBe(60);
    expect(undoSteps(3)).toBeLessThan(60);
  });
});
```

### `clear-formatting.test.ts`

`clearFormatting()` (`getHTMLWithSelection` after the command):

| Start | Returns | Result |
|---|---|---|
| `<p><strong><em>[ab]</em></strong></p>` | `true` | `<p>[ab]</p>` |
| `<p>a<strong>[b<em>c</em></strong>d]</p>` | `true` | `<p>a[bcd]</p>` |
| `<p><strong>a[b]c</strong></p>` | `true` | `<p><strong>a</strong>[b]<strong>c</strong></p>` |
| `<p><u><s>[a</s></u><code>b]</code></p>` | `true` | `<p>[ab]</p>` |
| `<p><a href="x"><strong>[ab]</strong></a></p>` | `true` | `<p><a href="x">[ab]</a></p>` |
| `<h1><strong>[a</strong></h1><p><em>b]</em></p>` | `true` | `<h1>[a</h1><p>b]</p>` |
| `<ul><li><strong>[a</strong></li><li><em>b]</em></li></ul>` | `true` | `<ul><li>[a</li><li>b]</li></ul>` |
| `<p><strong>a\|b</strong></p>` | `true` | `<p><strong>a</strong>\|<strong>b</strong></p>` |
| `<p><a href="x"><strong>a\|b</strong></a></p>` | `true` | `<p><a href="x"><strong>a</strong>\|<strong>b</strong></a></p>` |
| `<p><a href="x">[ab]</a></p>` | `false` | `<p><a href="x">[ab]</a></p>` |
| `<p>[ab]</p>` | `false` | `<p>[ab]</p>` |
| `<p>a\|b</p>` | `false` | `<p>a\|b</p>` |
| `<p><a href="x">a\|b</a></p>` | `false` | `<p><a href="x">a\|b</a></p>` |

(`\|` in the table is a plain `|`.)

Multi-step cases, one `it` each:

1. `<p><strong>[ab]</strong></p>`: `pressKey 'Mod-\\'` returns `true` → `<p>[ab]</p>`.
2. `can().clearFormatting()` is `true` on `<p><strong>[ab]</strong></p>` and `false` on
   `<p>[ab]</p>`; `getHTMLWithSelection` is unchanged afterwards in both.
3. `<p><strong>a|b</strong></p>`: `clearFormatting()`, then `typeText 'c'` →
   `<p><strong>a</strong>c|<strong>b</strong></p>`.
4. `<p><strong>[ab]</strong></p>`: `clearFormatting()`, then `undo()` returns `true` →
   `<p><strong>[ab]</strong></p>`.

## Acceptance criteria

- [ ] `npm run check` passes (typecheck + lint + unit tests), after `npm run format`.
- [ ] Every case listed in Tests is covered and passes.
- [ ] `git status` shows only the files in Scope (plus this task file's `## Questions` /
      `## Report` sections).
- [ ] No `any`, `@ts-ignore`, `biome-ignore`; no `!= null` on command results.
- [ ] One commit on branch `task/T-009-history-clear-formatting`:
      `feat(extensions): add history and clear formatting (T-009)`.

## Notes

- `createTestEditor` starts from a fresh state: the selection markers leave no undo step.
- If a test fails, compare the expected HTML with the lists above before changing code: the
  results were produced by the editor itself.
- Run one folder while working: `npx vitest run src/extensions/history`.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

## Report

<!-- Implementer: files changed, what you did, points for the reviewer. -->
