# T-012 — Clipboard: paste HTML and plain text, canonical copy

| Field | Value |
|---|---|
| Status | `done` |
| Spec | F-701, F-702, F-706 |
| Milestone | M1 |
| Depends on | T-011 |
| Branch | `task/T-012-clipboard` (already created) |

## Goal

Copied HTML becomes canonical like `getHTML()`: one post-processing function in
`src/core/html/serialize.ts` is shared by `serializeHTML` and by a new clipboard serializer that
the editor installs. Paste (HTML and plain text) already works through the core and
ProseMirror's defaults. This task adds the copy change, three test helpers, and the tests that
cover F-701, F-702 and F-706. You design and write the code; this file gives the behavior, the
public contract, the pitfalls and the expected results.

## Context (read before starting)

- `AGENTS.md` (all of it)
- `docs/ARCHITECTURE.md` §8 and §8.1 (input and output pipelines)
- `docs/decisions/0001-tight-list-items.md` (the `compactParagraphs` rule, now also for copy)
- `src/core/html/serialize.ts` and `src/core/html/serialize.test.ts`
- `src/core/editor.ts`: the constructor (the `EditorView` props, where `transformPastedHTML`
  already sanitizes pasted HTML)
- `tests/helpers/index.ts` and `tests/helpers/helpers.test.ts`
- `node_modules/prosemirror-model/dist/index.d.ts`: `class DOMSerializer` (constructor, `nodes`,
  `marks`, `serializeFragment`, `fromSchema`)
- `node_modules/prosemirror-view/dist/index.d.ts`: `EditorView.pasteHTML`, `pasteText`,
  `serializeForClipboard`; the prop `clipboardSerializer`

## Scope

Files to create:

- `src/core/clipboard.test.ts`

Files to modify:

- `src/core/html/serialize.ts`: add `canonicalizeDOM` and `createClipboardSerializer`;
  `serializeHTML` calls `canonicalizeDOM`.
- `src/core/editor.ts`: install the clipboard serializer; update step 4 of the constructor JSDoc.
- `src/core/html/serialize.test.ts`: **add** one `describe('createClipboardSerializer', …)` at
  the end. Do not change the existing tests.
- `tests/helpers/index.ts`: add `pasteHTML`, `pasteText`, `copySelection`.
- `tests/helpers/helpers.test.ts`: **add** one `describe('pasteHTML, pasteText and
  copySelection', …)` at the end. Do not change the existing tests.

Do not touch: everything else, in particular `src/core/html/sanitize.ts` (`data-pm-slice` stays
forbidden, see ARCHITECTURE §8), `src/index.ts` (the new functions are internal, not public
API), the extensions, and `docs/`.

## Contract

### `src/core/html/serialize.ts`

```ts
/**
 * Canonical post-processing of serialized HTML, in place (docs/ARCHITECTURE.md §8.1): styles
 * rewritten with `sanitizeStyle`, and with `compactParagraphs` (default) the single paragraph of
 * list items unwrapped (docs/decisions/0001).
 */
export function canonicalizeDOM(root: Element | DocumentFragment, options?: SerializeOptions): void;

/**
 * A `DOMSerializer` for the clipboard (`clipboardSerializer` prop): same output as
 * `DOMSerializer.fromSchema(schema)`, post-processed with `canonicalizeDOM`.
 */
export function createClipboardSerializer(
  schema: Schema,
  options?: SerializeOptions,
): DOMSerializer;
```

- `serializeHTML` keeps its signature and output. Its two post-processing loops move into
  `canonicalizeDOM`, and `serializeHTML` calls it on its container. Move the explanatory list of
  the `serializeHTML` JSDoc to `canonicalizeDOM` and leave a reference behind.
- `SerializeOptions` and `COMPACT_CONTAINERS` do not change.

### `src/core/editor.ts`

- In the `EditorView` props, next to `transformPastedHTML`:
  `clipboardSerializer` = `createClipboardSerializer(this.schema, { compactParagraphs: this.compactParagraphs })`.
- Constructor JSDoc, step 4: mention `clipboardSerializer` → `createClipboardSerializer`.
- Nothing else changes in the editor, and nothing changes in the public API.

### `tests/helpers/index.ts`

Three exported functions, each with a short JSDoc:

```ts
/** Runs the editor's paste logic on `html` (sanitized by the editor). Returns whether it was handled. */
export function pasteHTML(editor: Editor, html: string): boolean;

/** Runs the editor's paste logic on plain `text`. Returns whether it was handled. */
export function pasteText(editor: Editor, text: string): boolean;

/** What copying the current selection puts on the clipboard: `html` and plain `text`. */
export function copySelection(editor: Editor): { html: string; text: string };
```

- `pasteHTML` / `pasteText` call `editor.view.pasteHTML` / `editor.view.pasteText`, always with a
  second argument, an event: `new Event('paste') as ClipboardEvent`.
- `copySelection` calls `editor.view.serializeForClipboard(editor.state.selection.content())`;
  `html` is the returned `dom`'s `innerHTML`, `text` the returned `text`.

## Behavior

1. **Copy (F-706).** The HTML put on the clipboard follows ARCHITECTURE §7 exactly, like
   `getHTML()`: styles in canonical form, and the single paragraph of a list item unwrapped
   unless the editor has `compactParagraphs: false`. ProseMirror still adds its `data-pm-slice`
   attribute to the first element. The plain text is what ProseMirror already produces: blocks
   separated by `\n\n`, a hard break is `\n` (the same rule as `getText()`).
2. **Paste HTML (F-701).** Already in the core: `transformPastedHTML` sanitizes the HTML
   (DOMPurify), then the schema's parse rules build the slice. `data-pm-slice` is removed by the
   sanitizer on purpose (ARCHITECTURE §8). No code change: only tests.
3. **Paste plain text (F-702).** ProseMirror's default: every line becomes a paragraph, runs of
   empty lines collapse, spaces are kept, the text gets the marks at the cursor, `<` and `&` are
   text. No code change: only tests.

## How to do it (read this, it saves you from the usual traps)

- **Subclass, and post-process the outermost call only.** `createClipboardSerializer` returns an
  instance of a private subclass of `DOMSerializer`, built from the `nodes` and `marks` of
  `DOMSerializer.fromSchema(schema)`. It overrides `serializeFragment` with the same signature
  (`fragment`, `options`, `target`), calls `super.serializeFragment`, and runs
  `canonicalizeDOM` on the result. `DOMSerializer` calls `this.serializeFragment` **recursively**
  for the content of every node, passing a `target`. Post-process only when `target` is
  `undefined` (the outermost call), otherwise every nested list runs the queries again
  (quadratic work, AGENTS.md §4).
- `canonicalizeDOM` receives an `Element` (from `serializeHTML`) or a `DocumentFragment` (from
  the clipboard). Both have `querySelectorAll`, so the existing loops work unchanged.
- Read `this.compactParagraphs` in the constructor: it is already assigned before the
  `EditorView` is created. Do not move it.
- jsdom has no `ClipboardEvent`: `view.pasteHTML(html)` without an event throws
  `ReferenceError: ClipboardEvent is not defined`. That is why the helpers always pass one.
- A paste is a normal transaction: after it, `getHTMLWithSelection` works and the cursor is at
  the end of the pasted content.
- `createTestEditor` has no editor options. For the `compactParagraphs: false` case build the
  editor with `new Editor({ element: document.createElement('div'), extensions: [StarterKit()],
  content, compactParagraphs: false })`, and select everything with
  `editor.view.dispatch(editor.state.tr.setSelection(new AllSelection(editor.state.doc)))`.
- Do not test drag-and-drop or real clipboard events: they need a browser (E2E, later).

## Tests

Cases reasoned from the spec and checked against ProseMirror in jsdom (the paste cases pass on
`main` today; the copy cases are today's output with the `compactParagraphs` rule applied). The
cases contain the selection marker `|`, so they are given as TypeScript arrays: **paste each
array into your test file unchanged** and use it with `it.each`. Every expected return value is
written explicitly: check it. If a case contradicts the behavior above, stop and ask in
`## Questions`.

### `serialize.test.ts`: `describe('createClipboardSerializer', …)`

Write a helper `clip(node, compactParagraphs?)` like the existing `html`: it serializes
`schema.nodes.doc!.create(null, node).content` with
`createClipboardSerializer(schema, { compactParagraphs })`, appends the result to a
`document.createElement('div')`, and returns its `innerHTML`.

```ts
const clipboardCases: Array<[string, PMNode, boolean | undefined, string]> = [
  ['one paragraph per item', list(item(p('a')), item(p('b'))), undefined, '<ul><li>a</li><li>b</li></ul>'],
  ['several blocks', list(item(p('a'), p('b'))), undefined, '<ul><li><p>a</p><p>b</p></li></ul>'],
  ['a nested list', list(item(p('a'), list(item(p('b'))))), undefined, '<ul><li><p>a</p><ul><li>b</li></ul></li></ul>'],
  ['compactParagraphs: false', list(item(p('a'))), false, '<ul><li><p>a</p></li></ul>'],
  ['a style', p('a', 'color: rgb(255, 0, 0)'), undefined, '<p style="color: #ff0000">a</p>'],
  ['a dropped style', list(item(p('a', 'position: absolute'))), undefined, '<ul><li>a</li></ul>'],
];
```

Each case: `clip(node, compactParagraphs)` is the expected string. Paste the arrays as they are
and run `npm run format`: it reflows them; a string literal longer than 100 columns cannot be
split and is accepted by the gate.

### `clipboard.test.ts`

Use `createTestEditor`, `getHTMLWithSelection`, `pasteHTML`, `pasteText`, `copySelection` from
`tests/helpers`.

**Copy.** For each case: `copySelection(createTestEditor({ html }))` equals `{ html: expectedHTML,
text: expectedText }`.

```ts
const copyCases: Array<[string, string, string]> = [
  ['<p>a[bc</p><p>de]f</p>', '<p data-pm-slice="1 1 []">bc</p><p>de</p>', 'bc\n\nde'],
  ['<ul><li>[one</li><li>two]</li></ul>', '<ul data-pm-slice="3 3 []"><li>one</li><li>two</li></ul>', 'one\n\ntwo'],
  ['<ol start="3"><li>[x</li><li>y]</li></ol>', '<ol start="3" data-pm-slice="3 3 []"><li>x</li><li>y</li></ol>', 'x\n\ny'],
  ['<ul><li><p>[a</p><ul><li>b]</li></ul></li></ul>', '<li data-pm-slice="2 4 [&quot;bulletList&quot;,null]"><p>a</p><ul><li>b</li></ul></li>', 'a\n\nb'],
  ['<ul><li><p>[a</p><p>b]</p></li></ul>', '<li data-pm-slice="2 2 [&quot;bulletList&quot;,null]"><p>a</p><p>b</p></li>', 'a\n\nb'],
  ['<p>[a</p><ul><li>b</li></ul><p>c]</p>', '<p data-pm-slice="1 1 []">a</p><ul><li>b</li></ul><p>c</p>', 'a\n\nb\n\nc'],
  ['<ul><li>[one]</li></ul>', '<p data-pm-slice="1 1 [&quot;bulletList&quot;,null,&quot;listItem&quot;,null]">one</p>', 'one'],
  ['<p>a[b<br>c</p><p>d]e</p>', '<p data-pm-slice="1 1 []">b<br>c</p><p>d</p>', 'b\nc\n\nd'],
  ['<p>[a</p><hr><p>b]</p>', '<p data-pm-slice="1 1 []">a</p><hr><p>b</p>', 'a\n\nb'],
];
```

**Paste HTML.** For each case: `pasteHTML(editor, input)` on `createTestEditor({ html: start })`
returns `returns`, then `getHTMLWithSelection(editor)` is the expected string.

```ts
const pasteHTMLCases: Array<[string, string, boolean, string]> = [
  ['<p>x|y</p>', '<b>a</b><i>b</i>', true, '<p>x<strong>a</strong><em>b|</em>y</p>'],
  ['<p>x|y</p>', '<div>a</div><div>b</div>', true, '<p>xa</p><p>b|y</p>'],
  ['<p>x|y</p>', '<span style="color:red">r</span>', true, '<p>xr|y</p>'],
  ['<p>x|y</p>', '<p>a<script>alert(1)</script></p>', true, '<p>xa|y</p>'],
  ['<p>x|y</p>', '<script>alert(1)</script>', true, '<p>x|y</p>'],
  ['<p>x|y</p>', '<img src=x onerror=alert(1)>', true, '<p>x|y</p>'],
  ['<p>x|y</p>', '<a href="javascript:alert(1)">l</a>', true, '<p>xl|y</p>'],
  ['<p>x|y</p>', '', false, '<p>x|y</p>'],
  ['<p>|</p>', '<h1>T</h1><p>p</p>', true, '<h1>T</h1><p>p|</p>'],
  ['<p>|</p>', '<ul><li>a</li><li>b</li></ul>', true, '<ul><li>a</li><li>b|</li></ul>'],
  ['<p>|</p>', '<ul><li><p>a</p></li></ul>', true, '<ul><li>a|</li></ul>'],
  ['<p>|</p>', '<p data-pm-slice="1 1 [&quot;bulletList&quot;,null,&quot;listItem&quot;,null]">one</p>', true, '<p>one|</p>'],
];
```

**Paste plain text.** For each case: `pasteText(editor, input)` on `createTestEditor({ html:
start })` returns `returns`, then `getHTMLWithSelection(editor)` is the expected string.

```ts
const pasteTextCases: Array<[string, string, boolean, string]> = [
  ['<p>x|y</p>', 'a\nb', true, '<p>xa</p><p>b|y</p>'],
  ['<p>x|y</p>', 'a\n\nb', true, '<p>xa</p><p>b|y</p>'],
  ['<p>x|y</p>', 'a\n\n\nb\r\nc', true, '<p>xa</p><p>b</p><p>c|y</p>'],
  ['<p>x|y</p>', 'a\n', true, '<p>xa</p><p>|y</p>'],
  ['<p>x|y</p>', '\na', true, '<p>x</p><p>a|y</p>'],
  ['<p>x|y</p>', '  two  spaces', true, '<p>x  two  spaces|y</p>'],
  ['<p>x|y</p>', 'a<b>&amp;', true, '<p>xa&lt;b&gt;&amp;amp;|y</p>'],
  ['<p>x|y</p>', '', false, '<p>x|y</p>'],
  ['<p><strong>x|y</strong></p>', 'a\nb', true, '<p><strong>xa</strong></p><p><strong>b|y</strong></p>'],
  ['<h2>x|y</h2>', 'a\nb', true, '<h2>xa</h2><p>b|y</p>'],
  ['<p>[xy]</p>', 'a\nb', true, '<p>a</p><p>b|</p>'],
  ['<ul><li>x|y</li></ul>', 'a\nb', true, '<ul><li><p>xa</p><p>b|y</p></li></ul>'],
];
```

**Security.** `it.each(XSS_VECTORS)` (from `tests/fixtures/xss/vectors`): on
`createTestEditor({ html: '<p>x|y</p>' })`, `pasteHTML(editor, vector)`; then in
`editor.view.dom`:

- no element matches `script, style, iframe, object, embed, svg, form, base, meta`;
- no element has an attribute whose name starts with `on`;
- every `a` element satisfies `isAllowedHref(a.getAttribute('href') ?? '')` (from
  `src/core/html/sanitize`).

**Multi-step cases**, one `it` each:

1. Editor `new Editor({ element: document.createElement('div'), extensions: [StarterKit()],
   content: '<h1>T</h1><ul><li>a</li><li>b</li></ul><p>c<br>d</p>' })`, select all
   (`AllSelection`): `copySelection(editor).html` is
   `<h1 data-pm-slice="0 0 []">T</h1><ul><li>a</li><li>b</li></ul><p>c<br>d</p>`;
   `copySelection(editor).text` is `'T\n\na\n\nb\n\nc\nd'` and equals `editor.getText()`.
2. Same as 1 with `compactParagraphs: false`: `copySelection(editor).html` is
   `<h1 data-pm-slice="0 0 []">T</h1><ul><li><p>a</p></li><li><p>b</p></li></ul><p>c<br>d</p>`.
3. Round trip: `copySelection` on `createTestEditor({ html: '<ul><li>[one</li><li>two]</li></ul>' })`;
   `pasteHTML` of its `html` on `createTestEditor({ html: '<p>|</p>' })` returns `true`;
   `getHTMLWithSelection` is `<ul><li>one</li><li>two|</li></ul>`.

### `helpers.test.ts`: `describe('pasteHTML, pasteText and copySelection', …)`

1. `createTestEditor({ html: '<p>x|y</p>' })`: `pasteText(editor, 'a')` returns `true`;
   `getHTMLWithSelection` is `<p>xa|y</p>`.
2. `createTestEditor({ html: '<p>x|y</p>' })`: `pasteHTML(editor, '<strong>a</strong>')` returns
   `true`; `getHTMLWithSelection` is `<p>x<strong>a|</strong>y</p>`.
3. `copySelection(createTestEditor({ html: '<p>[ab]</p>' }))` equals
   `{ html: '<p data-pm-slice="1 1 []">ab</p>', text: 'ab' }`.

## Acceptance criteria

- [ ] `npm run check` passes (typecheck + lint + unit tests), after `npm run format`.
- [ ] Every case listed in Tests is covered and passes; the case arrays are pasted unchanged.
- [ ] The existing tests of `serialize.test.ts` and `helpers.test.ts` are unchanged and pass.
- [ ] `git status` shows only the files in Scope (plus this task file's `## Questions` /
      `## Report` sections).
- [ ] No `any`, `@ts-ignore`, `biome-ignore`; `canonicalizeDOM` runs once per copy, not per
      nested node.
- [ ] One commit on branch `task/T-012-clipboard`:
      `feat(core): canonical clipboard copy and paste tests (T-012)`.

## Notes

- Run one file while working: `npx vitest run src/core/clipboard.test.ts`.
- The copy cases with `data-pm-slice` contain `&quot;`: that is how the attribute value is
  serialized in `innerHTML`. Do not "fix" it.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

## Report

Files changed:
- `src/core/html/serialize.ts`: Added `canonicalizeDOM` (extracted post-processing from `serializeHTML`) and `createClipboardSerializer` (DOMSerializer subclass that overrides `serializeFragment` to post-process only the outermost call). `serializeHTML` now calls `canonicalizeDOM` on its container.
- `src/core/editor.ts`: Installed `clipboardSerializer` in the `EditorView` props, built from `createClipboardSerializer(this.schema, { compactParagraphs: this.compactParagraphs })`. Updated constructor JSDoc step 4.
- `src/core/clipboard.test.ts`: Created with tests for copy (9 `it.each` cases), multi-step copy (compactParagraphs true/false + round trip), paste HTML (12 `it.each` cases), paste plain text (12 `it.each` cases), and security (36 XSS vectors).
- `src/core/html/serialize.test.ts`: Added one `describe('createClipboardSerializer', …)` with 6 `it.each` cases.
- `tests/helpers/index.ts`: Added `pasteHTML`, `pasteText`, `copySelection` helpers.
- `tests/helpers/helpers.test.ts`: Added one `describe('pasteHTML, pasteText and copySelection', …)` with 3 tests.

Reviewer points:
- `createClipboardSerializer` uses a subclass that overrides `serializeFragment`. Post-processing runs only when `target === undefined` (outermost call), avoiding quadratic work on nested lists.
- The subclass constructor calls `super(base.nodes, base.marks)` to inherit the schema's node/mark serializers.
- All paste test cases pass because `transformPastedHTML` (DOMPurify) + parse rules already handle sanitization and parsing.
- The `data-pm-slice` attribute in copy output is preserved (it's not in `ALLOWED_ATTR`, so DOMPurify strips it on paste, which is the expected behavior per ARCHITECTURE §8).

`npm run check` runs before final: 1 (typecheck error on `clipboardSerializer` type, fixed by creating the serializer as a variable before the EditorView options).

## Metrics

| Field | Value |
|---|---|
| Architect tokens (preparation) | ~99K messages (116.9K − 17.5K baseline), including 3 ProseMirror probes and the decision round with the PM (copy compaction, `data-pm-slice`) |
| Architect tokens (review) | unknown (no `/context` taken after the review) |
| Implementer failed `npm run check` runs | 1 per the Report (type of the `clipboardSerializer` prop), not verified |
| Implementer context | ~23% of 128K after reading and initial reasoning, ~63% at the end; no compaction reported |
| Review rounds | 0 |
| Escalation | no |

Filled in by the reviewer. All 39 table cases present and identical (checked by script), scope
respected, `npm run check` green (836 tests). Accepted with nits not sent back: the
`serializeHTML` JSDoc keeps the post-processing list and adds "is now handled by" instead of
moving it; the `serializeFragment` override names a used parameter `_options` and types it
`Record<string, unknown>`; a useless `as boolean | undefined` cast in `serialize.test.ts`; the
`pasteHTML` helper JSDoc is 104 columns (the contract snippet given in this file was already
that long).
