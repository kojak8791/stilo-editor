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
editor: add, edit or remove the link of the selection, with the "open in new tab" option.

## Context

- `docs/UI.md` §3, §4, §5 (popover), §5.1 (new), §7
- `src/extensions/link/index.ts` (`setLink`, `unsetLink`, allowed URLs)
- `src/ui/toolbar/toolbar.ts`, `items.ts`, `types.ts`, `src/ui/components/popover.ts`

## Scope

Files to create:

- `src/ui/components/link-popover.ts`, `src/ui/components/link-popover.test.ts`

Files to modify:

- `src/core/helpers/active.ts`, `src/core/editor.ts`, `src/core/editor.test.ts`,
  `src/extensions/link/link.test.ts` — `Editor.getAttributes()`
- `src/ui/toolbar/toolbar.ts`, `items.ts`, `types.ts`, `toolbar.test.ts`, `src/ui/index.ts`
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
   focus in it. `mousedown` is not prevented on `input` / `label` (the URL field).
4. **Enabled** where a link can be edited: in a link, or on a non-empty selection. At a cursor
   outside a link the button is disabled and `Mod-k` does nothing (it is still prevented, so the
   browser does not open its own search). Inserting a new linked text there is listed in
   UI.md §8.
5. **URL field** is `type="text"` (`inputmode="url"`): relative URLs, `#anchors`, `mailto:` and
   `tel:` are valid links. A URL refused by `setLink` marks the field `aria-invalid`.

## Tests

- `Editor.getAttributes`: node, missing, unknown, node selection (`editor.test.ts`); link mark at
  the cursor, in a range, absent (`link.test.ts`).
- `link-popover.test.ts` (through the toolbar, `coordsAtPos` stubbed because jsdom has no
  layout): button title, toggle and enabled state; no button / no popover / `Mod-k` untouched
  without `Link`; open with `Mod-k` and with the button (focus in the URL); no open at a
  cursor; apply with and without new tab, focus back to the editor; edit the whole link
  prefilled; remove with the button and with an empty URL; refused URL; `Escape`; `mousedown`
  on the URL not prevented; `destroy()`.
- Toolbar test `1`: `link` after `code`.
- Layout, positioning and real focus: PM check in the demo.

## Acceptance criteria

- [x] `npm run check` passes
- [x] UI.md and ARCHITECTURE describe the new API and behavior
- [ ] PM check in the demo: select text → `Ctrl+K` or the button → URL → `Enter`; cursor in a
      link → edit and remove; new tab checkbox; invalid URL (`javascript:x`); `Escape`

## Questions

None.

## Report

### Files changed

| File | Action |
|---|---|
| `src/ui/components/link-popover.ts` | Created — `createLinkPopover`, `canEditLink` |
| `src/ui/components/link-popover.test.ts` | Created — 13 tests |
| `src/core/helpers/active.ts` | `getMarkAttributes`, `getNodeAttributes` |
| `src/core/editor.ts` | `getAttributes(name)` |
| `src/core/editor.test.ts`, `src/extensions/link/link.test.ts` | `getAttributes` tests |
| `src/ui/toolbar/toolbar.ts` | Link popover, `ToolbarContext`, `Mod-k`, click order, `mousedown` exception, `isMacPlatform()` called once |
| `src/ui/toolbar/items.ts` | `link` item, in `DEFAULT_TOOLBAR` after `code` |
| `src/ui/toolbar/types.ts`, `src/ui/index.ts` | `ToolbarContext`, `run(editor, context)` |
| `src/ui/toolbar/toolbar.test.ts` | Test `1`: item list with `link` |
| `src/ui/i18n/*` | 5 keys |
| `src/styles/ui.css` | Link popover rules |
| `docs/UI.md`, `docs/ARCHITECTURE.md` | Contract updates |

### Points for the reviewer

- `run(editor, context)` is a widening of the public `ToolbarButton` type: existing custom
  items with `run(editor)` still compile.
- `createLinkPopover` stays internal (not in `src/ui/index.ts`); exporting it is in UI.md §8.
- `Mod-k` is listened to on `view.dom` by the toolbar, like `Alt-F10`, not through a keymap:
  the core `Link` extension stays UI-free.

### Failed `npm run check` runs before final: 0

## Metrics

- Architect = implementer, same session as T-015. `/context` Messages at start: 73.9K; at
  end: unknown (to be measured by the PM).
- Review rounds: unknown. Escalation: none.
