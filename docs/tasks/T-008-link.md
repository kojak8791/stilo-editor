# T-008 — Link

| Field | Value |
|---|---|
| Status | `todo` |
| Spec | F-206 |
| Milestone | M1 |
| Depends on | T-007 |
| Branch | `task/T-008-link` (already created) |

## Goal

A new mark extension `Link` with its unit tests, added to `StarterKit` and to the extensions
index. The code to write is given below. `Link` has **no keyboard shortcut**: `Mod-k` belongs to
the link popover (T-014).

## Context (read before starting)

- `AGENTS.md` (all of it)
- `src/extensions/bold/index.ts` and `src/extensions/bold/bold.test.ts`: the reference for a mark
  extension and its tests
- `src/core/helpers/marks.ts`: read only the JSDoc of `setMark`, `unsetMark`, `markRangeAt`
- `src/core/html/sanitize.ts`: read only the JSDoc of `isAllowedHref`
- `src/extensions/starter-kit/index.ts` and `starter-kit.test.ts`
- `docs/ARCHITECTURE.md` §7.2 (`link` row) and §10 (test helpers)

## Scope

Files to create:

- `src/extensions/link/index.ts`, `src/extensions/link/link.test.ts`

Files to modify:

- `src/extensions/index.ts` — add after `Italic` (alphabetical order):
  `export { Link, type LinkAttributes } from './link';`
- `src/extensions/starter-kit/index.ts` — import `Link`; add `link?: false;` to
  `StarterKitOptions` after `code`; add `...include(Link, options.link),` after the `Code` line.
- `src/extensions/starter-kit/starter-kit.test.ts` — update **only** the two expected name
  lists: add `'link'` after `'code'` in both. This is the only allowed change to an existing
  test.

Do not touch: everything else, in particular `src/core/` and the existing extensions.

## Contract

`src/extensions/link/index.ts`, exactly this code:

```ts
import type { MarkType } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { markRangeAt, setMark, unsetMark } from '../../core/helpers/marks';
import { isAllowedHref } from '../../core/html/sanitize';

/** Attributes of the `link` mark. */
export interface LinkAttributes {
  href: string;
  /** `'_blank'` opens the link in a new tab; omitted or `null` for none. */
  target?: '_blank' | null;
}

declare module '../../core/types' {
  interface Commands {
    /**
     * Links the selection, or updates the whole link at the cursor. Returns `false` when `href`
     * is empty or not allowed, or with a cursor outside a link.
     */
    setLink: (attributes: LinkAttributes) => Command;
    /** Removes links from the selection, or the whole link at the cursor. */
    unsetLink: () => Command;
  }
}

/** Reads the attributes of an `<a>`: `false` (not a link) when `href` is empty or not allowed. */
function parseLink(element: HTMLElement): LinkAttributes | false {
  const href = element.getAttribute('href')?.trim() ?? '';
  if (!href || !isAllowedHref(href)) return false;
  return { href, target: element.getAttribute('target') === '_blank' ? '_blank' : null };
}

/** Command: adds the link to the selection, or replaces the link at the cursor. */
function setLink(type: MarkType, { href, target = null }: LinkAttributes): Command {
  return (state, dispatch) => {
    const url = href.trim();
    if (!url || !isAllowedHref(url)) return false;
    const attrs = { href: url, target };
    if (!state.selection.empty) return setMark(type, attrs)(state, dispatch);
    const range = markRangeAt(state.selection.$from, type);
    if (!range) return false;
    dispatch?.(state.tr.addMark(range.from, range.to, type.create(attrs)).scrollIntoView());
    return true;
  };
}

/** Command: removes links from the selection, or the link at the cursor. */
function unsetLink(type: MarkType): Command {
  return (state, dispatch) => {
    if (!state.selection.empty) return unsetMark(type)(state, dispatch);
    const range = markRangeAt(state.selection.$from, type);
    if (!range) return false;
    dispatch?.(state.tr.removeMark(range.from, range.to, type).scrollIntoView());
    return true;
  };
}

/**
 * The `link` mark (`<a href target rel>`), docs/SPEC.md F-206. `rel="noopener noreferrer
 * nofollow"` is written when `target="_blank"`. No shortcut: `Mod-k` belongs to the link popover.
 */
export const Link = defineExtension({
  name: 'link',
  priority: 103,
  marks: () => ({
    link: {
      attrs: { href: {}, target: { default: null } },
      inclusive: false,
      parseDOM: [{ tag: 'a[href]', getAttrs: parseLink }],
      toDOM: (mark) => [
        'a',
        mark.attrs.target === '_blank'
          ? { href: mark.attrs.href, target: '_blank', rel: 'noopener noreferrer nofollow' }
          : { href: mark.attrs.href },
        0,
      ],
    },
  }),
  commands: ({ schema }) => {
    const type = schema.marks.link!;
    return {
      setLink: (attributes) => setLink(type, attributes),
      unsetLink: () => unsetLink(type),
    };
  },
});
```

Why it looks like this (do not change it):

- `priority: 103` makes `link` the outermost mark in the HTML (`docs/ARCHITECTURE.md` §6.2).
- No `group: 'formatting'`: `code` must not exclude links.
- `inclusive: false`: typing at the end of a link does not extend it. So a cursor `|` at the end
  of a link is **outside** it: `getHTMLWithSelection` writes `<a href="x">ab</a>|`.

## Tests

`src/extensions/link/link.test.ts` copies the layout of `bold.test.ts` and covers **at least**
the cases below (results verified against a reference implementation). Use `createTestEditor`,
`getHTMLWithSelection`, `typeText` from `tests/helpers`.

Parse (`getHTML()` of `createTestEditor({ html })`), plus one idempotence test on
`<p><a href="x" target="_blank">a</a> <a href="/y">b</a></p>`:

| Input | Expected |
|---|---|
| `<p><a href="https://x.com">a</a></p>` | same |
| `<p><a href=" https://x.com ">a</a></p>` | `<p><a href="https://x.com">a</a></p>` |
| `<p><a href="/page">a</a></p>`, `<p><a href="#top">a</a></p>`, `<p><a href="mailto:a@b.c">a</a></p>`, `<p><a href="tel:+39123">a</a></p>` | same |
| `<p><a href="https://x.com" target="_blank">a</a></p>` | `<p><a href="https://x.com" target="_blank" rel="noopener noreferrer nofollow">a</a></p>` |
| `<p><a href="https://x.com" target="_blank" rel="noopener">a</a></p>` | `<p><a href="https://x.com" target="_blank" rel="noopener noreferrer nofollow">a</a></p>` |
| `<p><a href="https://x.com" rel="nofollow">a</a></p>`, `<p><a href="https://x.com" target="_self">a</a></p>`, `<p><a href="https://x.com" title="t">a</a></p>` | `<p><a href="https://x.com">a</a></p>` |
| `<p><a href="javascript:alert(1)">a</a></p>`, `<p><a href="data:text/html,x">a</a></p>`, `<p><a href="ftp://x.com">a</a></p>` | `<p>a</p>` |
| `<p><a href="">a</a></p>`, `<p><a href="  ">a</a></p>`, `<p><a>a</a></p>`, `<p><a name="x">a</a></p>` | `<p>a</p>` |
| `<p><strong><a href="x">a</a></strong></p>` | `<p><a href="x"><strong>a</strong></a></p>` |
| `<p><code><a href="x">a</a></code></p>` | `<p><a href="x"><code>a</code></a></p>` |
| `<p><a href="x">a<br>b</a></p>` | same |
| `<p><a href="x">a</a><a href="x">b</a></p>` | `<p><a href="x">ab</a></p>` |
| `<p><a href="x">a</a><a href="y">b</a></p>` | same |
| `<a href="x">a</a>` | `<p><a href="x">a</a></p>` |
| `<p><a href="x?a=1&amp;b=2">a</a></p>` | same |

Commands (`getHTMLWithSelection` after the command):

| Start | Command | Returns | Result |
|---|---|---|---|
| `<p>a[b]c</p>` | `setLink({ href: 'x' })` | `true` | `<p>a<a href="x">[b]</a>c</p>` |
| `<p>a[b]c</p>` | `setLink({ href: 'x', target: '_blank' })` | `true` | `<p>a<a href="x" target="_blank" rel="noopener noreferrer nofollow">[b]</a>c</p>` |
| `<p>a[b]c</p>` | `setLink({ href: ' https://x.com ' })` | `true` | `<p>a<a href="https://x.com">[b]</a>c</p>` |
| `<p>a[b]c</p>` | `setLink({ href: 'javascript:alert(1)' })`, `setLink({ href: '' })`, `setLink({ href: '  ' })` | `false` | `<p>a[b]c</p>` |
| `<p>a\|b</p>` | `setLink({ href: 'x' })` | `false` | `<p>a\|b</p>` |
| `<p>a<a href="x">b\|c</a>d</p>` | `setLink({ href: 'y', target: '_blank' })` | `true` | `<p>a<a href="y" target="_blank" rel="noopener noreferrer nofollow">b\|c</a>d</p>` |
| `<p>a<a href="x" target="_blank">b\|c</a>d</p>` | `setLink({ href: 'y' })` | `true` | `<p>a<a href="y">b\|c</a>d</p>` |
| `<p><a href="x">a<strong>b\|</strong>c</a></p>` | `setLink({ href: 'y' })` | `true` | `<p><a href="y">a<strong>b\|</strong>c</a></p>` |
| `<p>a<a href="x">bc\|</a>d</p>` | `setLink({ href: 'y' })` | `false` | `<p>a<a href="x">bc</a>\|d</p>` |
| `<p>a<a href="x">\|bc</a>d</p>` | `setLink({ href: 'y' })` | `false` | `<p>a\|<a href="x">bc</a>d</p>` |
| `<p><a href="x">[b]c</a></p>` | `setLink({ href: 'y' })` | `true` | `<p><a href="y">[b]</a><a href="x">c</a></p>` |
| `<p><a href="x">a[b</a>c]</p>` | `setLink({ href: 'y' })` | `true` | `<p><a href="x">a</a><a href="y">[bc]</a></p>` |
| `<p><code>a[b]c</code></p>` | `setLink({ href: 'x' })` | `true` | `<p><code>a</code><a href="x"><code>[b]</code></a><code>c</code></p>` |
| `<p><a href="x">a[b]c</a></p>` | `unsetLink()` | `true` | `<p><a href="x">a</a>[b]<a href="x">c</a></p>` |
| `<p><a href="x">a</a>[b<a href="y">c]</a></p>` | `unsetLink()` | `true` | `<p><a href="x">a</a>[bc]</p>` |
| `<p>a<a href="x">b\|c</a>d</p>` | `unsetLink()` | `true` | `<p>ab\|cd</p>` |
| `<p>a<a href="x">bc\|</a>d</p>` | `unsetLink()` | `false` | `<p>a<a href="x">bc</a>\|d</p>` |
| `<p>a\|b</p>`, `<p>[ab]</p>` | `unsetLink()` | `false` | unchanged |

Also:

- `editor.can().setLink({ href: 'x' })` is `true` on `<p>a[b]c</p>`, `false` on `<p>a|b</p>`; in
  both cases `getHTMLWithSelection` is unchanged afterwards.
- Typing `c` (`typeText`): `<p><a href="x">ab|</a></p>` gives `<p><a href="x">ab</a>c|</p>`;
  `<p><a href="x">a|b</a></p>` gives `<p><a href="x">ac|b</a></p>`.
- `isActive('link')` is `true` on `<p><a href="x">a|b</a></p>` and `<p><a href="x">[ab]</a></p>`,
  `false` on `<p><a href="x">[a</a>b]</p>`. `isActive('link', { href: 'x' })` is `true` and
  `isActive('link', { href: 'y' })` is `false` on `<p><a href="x">a|b</a></p>`.

Security, exactly this test (add the imports `XSS_VECTORS` from
`'../../../tests/fixtures/xss/vectors'` and `isAllowedHref` from `'../../core/html/sanitize'`):

```ts
describe('Link: security', () => {
  it.each(XSS_VECTORS)('writes only safe links for %s', (html) => {
    const container = document.createElement('div');
    container.innerHTML = createTestEditor({ html }).getHTML();
    for (const link of container.querySelectorAll('a')) {
      expect(
        link.getAttributeNames().every((name) => ['href', 'target', 'rel'].includes(name)),
      ).toBe(true);
      expect(isAllowedHref(link.getAttribute('href') ?? '')).toBe(true);
    }
  });
});
```

(`\|` in the tables is a plain `|`.)

## Acceptance criteria

- [ ] `npm run check` passes (typecheck + lint + unit tests), after `npm run format`.
- [ ] Every case listed in Tests is covered and passes.
- [ ] `git status` shows only the files in Scope (plus this task file's `## Questions` /
      `## Report` sections).
- [ ] No `any`, `@ts-ignore`, `biome-ignore`; no `!= null` on command results.
- [ ] One commit on branch `task/T-008-link`: `feat(link): add link extension (T-008)`.

## Notes

- Commands take an object: `editor.commands.setLink({ href: 'x' })`. In an `it.each` table,
  pass a function `(editor) => editor.commands.setLink({ href: 'x' })` instead of a command name.
- If a test fails, compare the expected HTML with the tables above before changing code: the
  results were produced by the editor itself.
- Run one folder while working: `npx vitest run src/extensions/link`.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

## Report

<!-- Implementer: files changed, what you did, points for the reviewer. -->
