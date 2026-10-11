# T-005 — Basic marks: Italic, Underline, Strike, Code

| Field | Value |
|---|---|
| Status | `done` |
| Spec | F-202, F-203, F-204, F-205 |
| Milestone | M1 |
| Depends on | T-004 |
| Branch | `task/T-005-basic-marks` (already created) |

## Goal

Four new mark extensions, each a copy of `src/extensions/bold/` adapted as specified below, with
their unit tests, added to `StarterKit` and to the extensions index.

## Context (read before starting)

- `AGENTS.md` (all of it)
- `src/extensions/bold/index.ts` and `src/extensions/bold/bold.test.ts`: the reference. Copy
  their structure exactly: same imports, same order of `marks`, `commands`, `keymap`,
  `inputRules`, same test layout.
- `src/extensions/starter-kit/index.ts` and `starter-kit.test.ts`
- `docs/ARCHITECTURE.md` §7.2 (marks table and the "Mark exclusion" paragraph) and §10 (test
  helpers)

## Scope

Files to create:

- `src/extensions/italic/index.ts`, `src/extensions/italic/italic.test.ts`
- `src/extensions/underline/index.ts`, `src/extensions/underline/underline.test.ts`
- `src/extensions/strike/index.ts`, `src/extensions/strike/strike.test.ts`
- `src/extensions/code/index.ts`, `src/extensions/code/code.test.ts`

Files to modify:

- `src/extensions/index.ts` — add the four export lines (keep alphabetical order)
- `src/extensions/starter-kit/index.ts` — add the four extensions after `Bold`, in the order
  Italic, Underline, Strike, Code; add `italic?: false; underline?: false; strike?: false;
  code?: false;` to `StarterKitOptions`
- `src/extensions/starter-kit/starter-kit.test.ts` — update **only** the two expected name
  lists to `['doc', 'text', 'paragraph', 'bold', 'italic', 'underline', 'strike', 'code']` and
  the same without `'bold'`. This is the only allowed change to an existing test.

Do not touch: everything else, in particular `src/core/` and `src/extensions/bold/`.

## Contract

Every extension: `name` equal to the mark name; the mark spec has `group: 'formatting'` (like
Bold); commands `set<Name>`, `unset<Name>`, `toggle<Name>` built with `setMark`, `unsetMark`,
`toggleMark` exactly like Bold, declared in a `declare module '../../core/types'` block with the
same JSDoc wording as Bold. No `priority` (the mark order is handled by the core).

| Extension | Mark | `toDOM` | Parse rules (`parseDOM`, in this order) | Keymap | Input rules |
|---|---|---|---|---|---|
| `Italic` | `italic` | `['em', 0]` | `{ tag: 'em' }`, `{ tag: 'i' }`, `{ style: 'font-style', getAttrs: (value) => value === 'italic' && null }` | `'Mod-i'` → `toggleItalic` | `/(?:^\|[^*])\*([^*]+)\*$/` and `/(?:^\|\s)_([^_]+)_$/` |
| `Underline` | `underline` | `['u', 0]` | `{ tag: 'u' }`, `...textDecorationRules('underline')` | `'Mod-u'` → `toggleUnderline` | none (no `inputRules` key) |
| `Strike` | `strike` | `['s', 0]` | `{ tag: 's' }`, `{ tag: 'del' }`, `{ tag: 'strike' }`, `...textDecorationRules('line-through')` | `'Mod-Shift-s'` → `toggleStrike` | `/(?:^\|[^~])~~([^~]+)~~$/` |
| `Code` | `code` | `['code', 0]` | `{ tag: 'code' }` | `'Mod-e'` → `toggleCode` | ``/(?:^\|[^`])`([^`]+)`$/`` |

(`\|` in the table is a plain `|` in the code.)

Extra mark spec properties for `Code` only: `excludes: 'formatting'` and `code: true`.

`textDecorationRules` is imported from `'../../core/helpers/parse-rules'`. The `_` rule of
Italic needs whitespace (or line start) before it, so `snake_case_` stays plain text.

Each extension gets a one-line JSDoc like Bold's (without the "Reference extension" sentence),
e.g. `/** The \`italic\` mark (\`<em>\`), docs/SPEC.md F-202. Also parsed from \`<i>\` and an italic \`font-style\`. */`.

## Tests

Each `<name>.test.ts` copies the layout of `bold.test.ts` (three `describe` blocks: parse and
serialize, commands, shortcut and input rule) and covers **at least** the cases below. Use
`createTestEditor`, `getHTMLWithSelection`, `typeText`, `pressKey` from `tests/helpers`.

Parse (`createTestEditor({ html }).getHTML()`), plus one idempotence test per extension:

| Input | Expected |
|---|---|
| `<p><em>a</em><i>b</i><span style="font-style: italic">c</span></p>` | `<p><em>abc</em></p>` |
| `<p><span style="font-style: oblique">a</span></p>` | `<p>a</p>` |
| `<p><u>a</u><span style="text-decoration: underline">b</span><span style="text-decoration-line: underline">c</span></p>` | `<p><u>abc</u></p>` |
| `<p><s>a</s><del>b</del><strike>c</strike><span style="text-decoration: line-through">d</span></p>` | `<p><s>abcd</s></p>` |
| `<p><span style="text-decoration: underline line-through">a</span></p>` (in underline and strike tests) | `<p><u><s>a</s></u></p>` |
| `<p><code>a</code></p>` | `<p><code>a</code></p>` |
| `<p><s><u><em><strong>a</strong></em></u></s></p>` (in the italic test) | `<p><strong><em><u><s>a</s></u></em></strong></p>` |
| `<p><strong><code>a</code></strong></p>` (code) | `<p><code>a</code></p>` |
| `<p><code><em>a</em></code></p>` (code) | `<p><code>a</code></p>` |

Commands, for each extension (`<x>` = the tag): `set` on `<p>a[b]c</p>` gives
`<p>a<x>[b]</x>c</p>`; `unset` on `<p><x>a[b]c</x></p>` gives `<p><x>a</x>[b]<x>c</x></p>`;
`toggle` on `<p><x>[ab]</x></p>` gives `<p>[ab]</p>`; `unset` where the mark is absent returns
`false`. Code also:

| Case | Expected |
|---|---|
| `toggleCode()` on `<p><strong>[ab]</strong></p>` | `true`, `<p><code>[ab]</code></p>` |
| `can().toggleBold()` and `can().setItalic()` on `<p><code>[ab]</code></p>` | `false` |

Shortcut: on `<p>[ab]</p>`, `pressKey` with the combination of the table returns `true` and
gives `<p><x>[ab]</x></p>`.

Input rules (`typeText` from `<p>|</p>`):

| Typed | Expected |
|---|---|
| `*ab*` | `<p><em>ab</em>\|</p>` |
| `x *ab* c` | `<p>x <em>ab</em> c\|</p>` |
| `**ab**` (in the italic test: Bold wins) | `<p><strong>ab</strong>\|</p>` |
| `_ab_` and `x _ab_` | `<p><em>ab</em>\|</p>`, `<p>x <em>ab</em>\|</p>` |
| `snake_case_` | `<p>snake_case_\|</p>` |
| `~~ab~~` | `<p><s>ab</s>\|</p>` |
| `~ab~` | `<p>~ab~\|</p>` |
| `` `ab` `` | `<p><code>ab</code>\|</p>` |

## Acceptance criteria

- [ ] `npm run check` passes (typecheck + lint + unit tests), after `npm run format`.
- [ ] Every case listed in Tests is covered and passes.
- [ ] `git status` shows only the files in Scope (plus this task file's `## Questions` /
      `## Report` sections).
- [ ] The four extensions have exactly Bold's shape; no `any`, `@ts-ignore`, `biome-ignore`.
- [ ] One commit on branch `task/T-005-basic-marks`:
      `feat(extensions): add italic, underline, strike and code marks (T-005)`.

## Notes

- Copy `bold/index.ts` four times and adapt; do not write the files from scratch.
- `pressKey`: write the combination exactly as in the keymap (`'Mod-Shift-s'`, lowercase).
- In `it.each` tables with command names, add `as const` (see `bold.test.ts`) so
  `editor.commands[command]()` typechecks.
- Run one file while working: `npx vitest run src/extensions/italic`.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

No questions.

## Report

<!-- Implementer: fill in when done. Files changed, summary, points for the reviewer. -->

### Files changed

**Created:**
- `src/extensions/italic/index.ts` — Italic mark extension (`<em>`, parsed from `<i>` and `font-style: italic`)
- `src/extensions/italic/italic.test.ts` — Unit tests for Italic
- `src/extensions/underline/index.ts` — Underline mark extension (`<u>`, parsed from `text-decoration: underline`)
- `src/extensions/underline/underline.test.ts` — Unit tests for Underline
- `src/extensions/strike/index.ts` — Strike mark extension (`<s>`, parsed from `<del>`, `<strike>`, `text-decoration: line-through`)
- `src/extensions/strike/strike.test.ts` — Unit tests for Strike
- `src/extensions/code/index.ts` — Code mark extension (`<code>`, excludes `formatting` group)
- `src/extensions/code/code.test.ts` — Unit tests for Code

**Modified:**
- `src/extensions/index.ts` — Added exports for Italic, Underline, Strike, Code (alphabetical order)
- `src/extensions/starter-kit/index.ts` — Added imports, options, and inclusion of the four extensions
- `src/extensions/starter-kit/starter-kit.test.ts` — Updated expected name lists

### Summary

Implemented four mark extensions (Italic, Underline, Strike, Code) as copies of the Bold reference extension, each with:
- Mark spec with `group: 'formatting'` (Code also has `excludes: 'formatting'` and `code: true`)
- Parse rules per the contract table (HTML tags + CSS style rules via `textDecorationRules`)
- Commands (`set`, `unset`, `toggle`) using core `setMark`/`unsetMark`/`toggleMark` helpers
- Keymap shortcuts (`Mod-i`, `Mod-u`, `Mod-Shift-s`, `Mod-e`)
- Input rules for inline markup (`*...*`, `_..._`, `~~...~~`, `` `...` ``)
- Unit tests covering parse, serialize, idempotence, commands, shortcuts, and input rules

### Points for the reviewer

- The underscore input rule regex uses `/(?:^|\s)_([^_]+)_$/` (line start or whitespace before the underscore) to prevent `snake_case_` from triggering italic, as specified in the task note.
- The `code` mark's `excludes: 'formatting'` property is set before `group: 'formatting'` to match the Bold extension pattern (group after excludes).
- All 424 tests pass including the new 96 tests for the four extensions.
