# T-016 — Default UI: link popover and `Mod-k`

| Field | Value |
|---|---|
| Status | `review` |
| Spec | F-206, F-803 |
| Milestone | M1 |
| Depends on | T-008, T-014 |
| Branch | `task/T-016-link-popover` |

## Goal

A link popover in the default UI, opened by a new `link` toolbar button and by `Mod-k` in the
editor: add, edit or remove the link of the selection, with the "open in new tab" option. After
the first PM check: a link bubble under the link at the cursor (open, edit, remove), and every
popover positioned with `absolute` so that it no longer trembles on scroll.

## Context

- `docs/UI.md` §3, §4, §5 (popover), §5.1 (new), §7
- `src/extensions/link/index.ts` (`setLink`, `unsetLink`, allowed URLs)
- `src/ui/toolbar/toolbar.ts`, `items.ts`, `types.ts`, `src/ui/components/popover.ts`

## Scope

Files to create:

- `src/ui/components/link-popover.ts`, `src/ui/components/link-bubble.ts`,
  `src/ui/components/link-popover.test.ts`

Files to modify:

- `src/core/helpers/active.ts`, `src/core/editor.ts`, `src/core/editor.test.ts`,
  `src/extensions/link/link.test.ts` — `Editor.getAttributes()`
- `src/ui/toolbar/toolbar.ts`, `items.ts`, `types.ts`, `toolbar.test.ts`, `src/ui/index.ts`
- `src/ui/components/popover.ts` (strategy), `docs/decisions/0002-floating-ui.md`
- `src/ui/i18n/types.ts`, `en.ts`, `it.ts`, `src/styles/ui.css`
- `docs/UI.md`, `docs/ARCHITECTURE.md` §5 and §9

## Contract

Decisions (details in `docs/UI.md` §3, §4.2, §4.3, §5.1, §7 and ARCHITECTURE §5):

1. **Core: `editor.getAttributes(name)`.** The popover must prefill the `href` of the link at
   the cursor, and ARCHITECTURE §2.2 says the UI never takes a shortcut around the public API.
   Mark: the mark at the cursor (stored marks first) or the first one in the range; node: the
   selected node or the deepest ancestor; `{}` when absent (Tiptap has the same method).
2. **`ToolbarContext`**: `ToolbarButton.run(editor, context)` gets UI services owned by the
   toolbar; today only `openLinkPopover()`. One link popover per toolbar (no global state),
   created when the `Link` extension is present, so `Mod-k` works even without the button.
3. **Click order**: `editor.focus()` then `run`, so that a `run` opening a popover keeps the
   focus in it.
4. **Enabled** where a link can be edited: in a link, or on a non-empty selection. At a cursor
   outside a link the button is disabled and `Mod-k` does nothing (it is still prevented, so the
   browser does not open its own search). Inserting a new linked text there is listed in
   UI.md §8.
5. **URL field** is `type="text"` (`inputmode="url"`): relative URLs, `#anchors`, `mailto:` and
   `tel:` are valid links. A URL refused by `setLink` marks the field `aria-invalid`.
6. **Link bubble** (PM idea): shown while the cursor is in a link and the editor has the focus,
   not on mouse hover (too noisy, unreachable by keyboard). UI.md §5.2.
7. **Popover positioning** (PM report: the popover trembled on scroll): `absolute` inside a
   positioned container that scrolls with the anchor; the link popover and bubble are mounted
   next to `view.dom`, never inside it. ADR 0002 revised, UI.md §5.

## Tests

- `Editor.getAttributes`: node, missing, unknown, node selection (`editor.test.ts`); link mark at
  the cursor, in a range, absent (`link.test.ts`).
- `link-popover.test.ts` (through the toolbar, `coordsAtPos` stubbed because jsdom has no
  layout): button title, toggle and enabled state; no button / no popover / `Mod-k` untouched
  without `Link`; open with `Mod-k` and with the button (focus in the URL); no open at a
  cursor; apply with and without new tab, focus back to the editor; edit the whole link
  prefilled; remove with the button and with an empty URL; refused URL; `Escape`; `mousedown`
  mounting next to `view.dom` and host class; `destroy()`.
- Link bubble: shown at a link with the focus; hidden outside a link, on a range and on blur;
  remove (mousedown prevented); edit opens the popover prefilled.
- Toolbar test `1`: `link` after `code`.
- Layout, positioning and real focus: PM check in the demo.

## Acceptance criteria

- [x] `npm run check` passes
- [x] UI.md and ARCHITECTURE describe the new API and behavior
- [ ] PM check in the demo: select text → `Ctrl+K` or the button → URL → `Enter`; cursor in a
      link → edit and remove; new tab checkbox; invalid URL (`javascript:x`); `Escape`;
      bubble on a link; no trembling on scroll (popover and heading menu)

## Questions

None.

## Report

### Files changed

| File | Action |
|---|---|
| `src/ui/components/link-popover.ts` | Created — `createLinkPopover`, `canEditLink` |
| `src/ui/components/link-bubble.ts` | Created — `createLinkBubble` |
| `src/ui/components/link-popover.test.ts` | Created — 18 tests (popover and bubble) |
| `src/ui/components/popover.ts` | `strategy: 'absolute'`, host class |
| `docs/decisions/0002-floating-ui.md` | Positioning strategy revised |
| `src/core/helpers/active.ts` | `getMarkAttributes`, `getNodeAttributes` |
| `src/core/editor.ts` | `getAttributes(name)` |
| `src/core/editor.test.ts`, `src/extensions/link/link.test.ts` | `getAttributes` tests |
| `src/ui/toolbar/toolbar.ts` | Link popover and bubble, `ToolbarContext`, `Mod-k`, click order, `isMacPlatform()` called once |
| `src/ui/toolbar/items.ts` | `link` item, in `DEFAULT_TOOLBAR` after `code` |
| `src/ui/toolbar/types.ts`, `src/ui/index.ts` | `ToolbarContext`, `run(editor, context)` |
| `src/ui/toolbar/toolbar.test.ts` | Test `1`: item list with `link` |
| `src/ui/i18n/*` | 7 keys |
| `src/styles/ui.css` | Popover host and `absolute`, link popover and bubble rules |
| `docs/UI.md`, `docs/ARCHITECTURE.md` | Contract updates |

### Points for the reviewer

- `run(editor, context)` is a widening of the public `ToolbarButton` type: existing custom
  items with `run(editor)` still compile.
- The link UI is mounted in the element given to the `Editor` (the parent of `view.dom`),
  which gets `position: relative` through `stilo-popover-host`: a visible change for hosts.
- `createLinkPopover` stays internal (not in `src/ui/index.ts`); exporting it is in UI.md §8.
- `Mod-k` is listened to on `view.dom` by the toolbar, like `Alt-F10`, not through a keymap:
  the core `Link` extension stays UI-free.

### Failed `npm run check` runs before final: 0

## Metrics

- Architect = implementer, same session as T-015. `/context` Messages at start: 73.9K; at
  end: unknown (to be measured by the PM).
- Review rounds: unknown. Escalation: none.
