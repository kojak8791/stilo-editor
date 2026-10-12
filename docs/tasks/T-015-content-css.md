# T-015 — `content.css` and the `insertBlock` fix

| Field | Value |
|---|---|
| Status | `review` |
| Spec | NFR-5 |
| Milestone | M1 |
| Depends on | T-011, T-014 |
| Branch | `task/T-015-content-css` |

## Goal

Ship `stilo-editor/content.css` (ARCHITECTURE §2) so that a page needs no ProseMirror CSS import
of its own, and fix the core bug hidden by the toolbar `try/catch` around `isEnabled`.

## Context

- `docs/ARCHITECTURE.md` §2 (package outputs), `vite.config.ts` (`stiloStyles` emits
  `src/styles/*.css` as is)
- `src/core/helpers/nodes.ts`, `src/ui/toolbar/toolbar.ts`
- T-014 Metrics: "the `try/catch` around `isEnabled` hides a real core bug"

## Scope

Files to create:

- `src/styles/content.css`

Files to modify:

- `src/core/helpers/nodes.ts`, `src/core/helpers/nodes.test.ts`
- `src/ui/toolbar/toolbar.ts`, `src/ui/toolbar/toolbar.test.ts`
- `demo/main.ts`, `demo/demo.css`

## Contract

**`content.css`** is plain CSS, emitted as is (no `@import`: the file must work from `dist/`):

1. The ProseMirror base CSS (`prosemirror-view/style/prosemirror.css`) and the gap cursor CSS
   (`prosemirror-gapcursor/style/gapcursor.css`), with their MIT notice. The tables CSS is
   added by the tables task.
2. Content defaults scoped to `.stilo-content`: lists (paragraphs inside items add no margins),
   blockquote, horizontal rule, inline code. Colors reuse the UI custom properties with the
   same fallbacks (`--stilo-color-border`, `--stilo-color-muted`, `--stilo-color-hover`).
3. Placeholder: `.stilo-placeholder::before` shows `attr(data-placeholder)`, only under
   `.stilo-content[contenteditable="true"]` (hidden when not editable).

**`insertBlock(type, attrs)`**: the container checked with `canReplaceWith` is the parent of the
selected textblock, or the parent of the selection when it is not inside a textblock (a selected
block node, `AllSelection`). Before, `$from.node(-1)` was `undefined` at the document level, so
`can().setHorizontalRule()` threw with a selected `<hr>`.

**Toolbar**: no `try/catch` around `isEnabled` (buttons and dropdown options).

## Tests

- `insertBlock`: replaces a selected `<hr>` at the document level; replaces an `AllSelection`.
- Toolbar `3b`: with a selected `<hr>`, refresh does not throw and the horizontal rule button
  is enabled.
- CSS: checked by the PM in the demo (lists, blockquote, `<hr>` selection, gap cursor, placeholder
  on an empty document, placeholder hidden with `setEditable(false)`).

## Acceptance criteria

- [x] `npm run check` passes
- [x] `npm run build` emits `dist/content.css`, `dist/ui.css`, `dist/style.css`
- [x] The demo imports `src/styles/content.css` instead of the ProseMirror CSS; `demo.css` has
      no content rules left
- [ ] PM check in the demo

## Questions

None.

## Report

### Files changed

| File | Action |
|---|---|
| `src/styles/content.css` | Created |
| `src/core/helpers/nodes.ts` | `insertBlock` picks the container depth from the selection |
| `src/core/helpers/nodes.test.ts` | Two tests (selected `<hr>`, `AllSelection`) |
| `src/ui/toolbar/toolbar.ts` | `try/catch` around `isEnabled` removed |
| `src/ui/toolbar/toolbar.test.ts` | Test `3b` |
| `demo/main.ts` | Imports `content.css` instead of the two ProseMirror CSS files |
| `demo/demo.css` | Placeholder rule removed (now in `content.css`) |

### Points for the reviewer

- The ProseMirror CSS is not verbatim: Biome rejects the duplicate `white-space` (`pre-wrap`
  fallback before `break-spaces`) and `!important` on the separator image, and `biome-ignore`
  is forbidden. The fallback is dropped (every target browser supports `break-spaces`); the
  separator rule is `.ProseMirror img.ProseMirror-separator` without `!important`, which still
  beats generic `img` rules but not a host rule with higher specificity. Biome also reformats
  the one-line rules and the quotes.
- Content defaults are deliberately few (lists, blockquote, `<hr>`, inline code): headings,
  paragraphs and fonts stay with the host page.

### Failed `npm run check` runs before final: 1

Biome lint on the verbatim ProseMirror CSS (see above).

## Metrics

- Architect = implementer, one fresh session. `/context` Messages: 130 tokens at start, 60.7K
  at the end (includes the PM demo check discussion), so about 60.6K for the task.
- Failed `npm run check` runs: 1 (Biome lint on the ProseMirror CSS). Context compactions: 0.
- Review rounds: 1 (PM demo check, no code change: the horizontal rule button has no active
  state by design; the gap cursor needs a position between non-text blocks, which the demo
  content does not have). Escalation: none.
