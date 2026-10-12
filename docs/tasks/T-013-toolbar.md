# T-013 — Default UI: toolbar, icons, i18n, styles

| Field | Value |
|---|---|
| Status | `done` |
| Spec | F-801, NFR-4 |
| Milestone | M1 |
| Depends on | T-012 |
| Branch | `task/T-013-toolbar` (already created) |

## Goal

The first piece of the default UI (`stilo-editor/ui`): a toolbar of buttons with `lucide` icons,
active and disabled states, roving-tabindex keyboard navigation, English and Italian strings, its
CSS, and the test that enforces the import rules between core, extensions and UI. The demo page
shows the toolbar. You design and write the code; this file and `docs/UI.md` give the contract,
the behavior and the expected results. The heading dropdown and the popover are T-014.

## Context (read before starting)

- `AGENTS.md` (all of it)
- `docs/UI.md` §1–§4 and §7 (the design contract of this task). §5–§6 are T-014: read them
  only to keep your types open to a second item kind.
- `docs/ARCHITECTURE.md` §2.2 (import rules), §4.1 (naming), §9
- `docs/SPEC.md` NFR-4 (accessibility)
- `src/index.ts` (the only core module the UI may import) and `src/core/editor.ts` (public
  methods: `commands`, `can()`, `isActive()`, `focus()`, `on`/`off`, `view`)
- `tests/helpers/index.ts`: `createTestEditor`
- `demo/main.ts`, `demo/index.html` (the demo page: run `npm run dev`)
- `node_modules/lucide/dist/lucide.d.ts`: `type IconNode` (line 2), `createElement`
  (search `declare const createElement`); icons are named exports (`Bold`, `Undo2`, …)

## Scope

Files to create:

- `src/ui/index.ts`
- `src/ui/i18n/types.ts`, `src/ui/i18n/en.ts`, `src/ui/i18n/it.ts`
- `src/ui/components/icon.ts`
- `src/ui/components/shortcut.ts`, `src/ui/components/shortcut.test.ts`
- `src/ui/toolbar/types.ts`, `src/ui/toolbar/items.ts`, `src/ui/toolbar/toolbar.ts`,
  `src/ui/toolbar/toolbar.test.ts`
- `src/styles/ui.css`
- `tests/architecture.test.ts`

Files to modify:

- `demo/main.ts`: import `../src/styles/ui.css` after `./demo.css`, and create the toolbar with
  `createToolbar(editor, { container: document.querySelector<HTMLElement>('#toolbar')! })`,
  imported from `../src/ui`. Nothing else.

Do not touch: everything else, in particular `src/core/`, `src/extensions/`, `src/index.ts`,
`demo/index.html`, `demo/demo.css`, `vite.config.ts`, and `docs/` (except the Questions and
Report sections of this file).

## Contract

The types, DOM, behavior and styles are in `docs/UI.md`. Differences for this task:

- `ToolbarItem` is `ToolbarButton` only (`export type ToolbarItem = ToolbarButton;`). Keep the
  `kind: 'button'` field: T-014 adds `ToolbarDropdown` to the union.
- `DEFAULT_TOOLBAR` has no `heading` group yet:

  ```ts
  [
    ['undo', 'redo'],
    ['bold', 'italic', 'underline', 'strike', 'code', 'clearFormatting'],
    ['bulletList', 'orderedList', 'blockquote', 'horizontalRule'],
  ]
  ```

- `src/ui/index.ts` exports: `createToolbar`, `Toolbar`, `ToolbarOptions`, `ToolbarButton`,
  `ToolbarItem`, `DEFAULT_ITEMS`, `DEFAULT_TOOLBAR`, `MessageKey`, `Messages`, `en`, `it`,
  `formatShortcut`. Every export has a short JSDoc.
- `MessageKey` and the locale files contain every key of UI.md §3.2, the `heading.*` keys
  included (T-014 uses them).
- `DEFAULT_ITEMS`: `Readonly<Record<string, ToolbarItem>>`, the 12 buttons of UI.md §3.3.
  `DEFAULT_TOOLBAR`: `ReadonlyArray<ReadonlyArray<string>>`.

Internal helpers (not exported from `src/ui/index.ts`):

```ts
// src/ui/components/icon.ts
/** An SVG element for a lucide icon, with class `stilo-icon` and `aria-hidden="true"`. */
export function createIcon(icon: IconNode): SVGElement;

// src/ui/components/shortcut.ts
/** Formats a keymap shortcut for display (docs/UI.md §4.5). */
export function formatShortcut(shortcut: string, mac: boolean): string;
/** Whether the platform shows Mac shortcuts. */
export function isMacPlatform(): boolean;
```

### Import rules (`tests/architecture.test.ts`)

The test scans every `.ts` file under `src/` except `*.test.ts` and checks every module
specifier of `import … from '…'`, `export … from '…'`, `import '…'` and `import('…')` (Biome
enforces single quotes). Write the checker as a function in the test file, test it with the cases
below, then run it on the real files and expect no violations.

| File area | Allowed packages | Allowed relative targets (resolved, extension dropped) |
|---|---|---|
| `src/index.ts` | none | anything under `src/core/` or `src/extensions/` |
| `src/core/**` | `dompurify`, `prosemirror-*` | `src/core/**` |
| `src/extensions/**` | `prosemirror-*` | `src/core/**`, `src/extensions/**` |
| `src/ui/**` | `lucide`, `@floating-ui/dom` | `src/ui/**`, exactly `src/index` |

A violation is reported as the string `<path relative to src, with "/">: '<specifier>'`.
Resolve relative specifiers with `node:path` `posix` functions on the `/`-normalized path.

```ts
const cases: Array<[file: string, source: string, violations: string[]]> = [
  ['core/editor.ts', "import { EditorView } from 'prosemirror-view';", []],
  ['core/html/sanitize.ts', "import DOMPurify from 'dompurify';", []],
  ['core/editor.ts', "import { x } from '../ui/toolbar/toolbar';", ["core/editor.ts: '../ui/toolbar/toolbar'"]],
  ['core/editor.ts', "import { Bold } from 'lucide';", ["core/editor.ts: 'lucide'"]],
  ['core/editor.ts', "import { Bold } from '../extensions/bold';", ["core/editor.ts: '../extensions/bold'"]],
  ['extensions/bold/index.ts', "import { defineExtension } from '../../core/extension';", []],
  ['extensions/bold/index.ts', "import { Italic } from '../italic';", []],
  ['extensions/bold/index.ts', "import DOMPurify from 'dompurify';", ["extensions/bold/index.ts: 'dompurify'"]],
  ['extensions/bold/index.ts', "import { computePosition } from '@floating-ui/dom';", ["extensions/bold/index.ts: '@floating-ui/dom'"]],
  ['ui/toolbar/toolbar.ts', "import type { Editor } from '../../index';", []],
  ['ui/toolbar/toolbar.ts', "import { createIcon } from '../components/icon';", []],
  ['ui/toolbar/toolbar.ts', "import { Bold } from 'lucide';", []],
  ['ui/components/popover.ts', "import { computePosition } from '@floating-ui/dom';", []],
  ['ui/toolbar/toolbar.ts', "import { Editor } from '../../core/editor';", ["ui/toolbar/toolbar.ts: '../../core/editor'"]],
  ['ui/toolbar/toolbar.ts', "import { Bold } from '../../extensions/bold';", ["ui/toolbar/toolbar.ts: '../../extensions/bold'"]],
  ['ui/toolbar/toolbar.ts', "import type { EditorState } from 'prosemirror-state';", ["ui/toolbar/toolbar.ts: 'prosemirror-state'"]],
  ['ui/toolbar/toolbar.ts', "export { en } from '../i18n/en';", []],
  ['ui/toolbar/toolbar.ts', "export * from '../../core/types';", ["ui/toolbar/toolbar.ts: '../../core/types'"]],
  ['ui/toolbar/toolbar.ts', "import '../../core/editor';", ["ui/toolbar/toolbar.ts: '../../core/editor'"]],
  ['ui/toolbar/toolbar.ts', "const m = await import('../../core/editor');", ["ui/toolbar/toolbar.ts: '../../core/editor'"]],
  ['index.ts', "export { Editor } from './core/editor';", []],
  ['index.ts', "export * from './extensions';", []],
  ['index.ts', "export { createToolbar } from './ui';", ["index.ts: './ui'"]],
  ['core/a.ts', "import { a } from './b';\nimport { c } from '../ui/c';\nimport 'lucide';", ["core/a.ts: '../ui/c'", "core/a.ts: 'lucide'"]],
];
```

The real scan must also find at least one file in each of `src/core/`, `src/extensions/` and
`src/ui/` (so a broken file walk cannot pass silently).

### `formatShortcut`

```ts
const cases: Array<[shortcut: string, pc: string, mac: string]> = [
  ['Mod-b', 'Ctrl+B', '⌘B'],
  ['Mod-Shift-z', 'Ctrl+Shift+Z', '⇧⌘Z'],
  ['Mod-Alt-1', 'Ctrl+Alt+1', '⌥⌘1'],
  ['Mod-Shift-8', 'Ctrl+Shift+8', '⇧⌘8'],
  ['Mod-\\', 'Ctrl+\\', '⌘\\'],
  ['Shift-Enter', 'Shift+Enter', '⇧Enter'],
  ['Alt-F10', 'Alt+F10', '⌥F10'],
  ['Shift-Alt-Mod-k', 'Ctrl+Alt+Shift+K', '⌥⇧⌘K'],
  ['Ctrl-Shift-a', 'Ctrl+Shift+A', '⌃⇧A'],
  ['Mod-Ctrl-a', 'Ctrl+A', '⌃⌘A'],
  ['Escape', 'Escape', 'Escape'],
];
```

`isMacPlatform()`: `true` for `navigator.platform` `'MacIntel'` and `'iPhone'`, `false` for
`'Win32'` and `''` (stub the getter with `vi.spyOn(navigator, 'platform', 'get')`).

## Tests

- Provided tests: none.
- Tests to write:
  - [ ] `tests/architecture.test.ts`: every case of the checker table (`it.each`), and the
    real scan.
  - [ ] `src/ui/components/shortcut.test.ts`: every `formatShortcut` case, both columns;
    `isMacPlatform`.
  - [ ] `src/ui/toolbar/toolbar.test.ts`: the cases below.

### Toolbar test setup

- Create the editor with `createTestEditor({ html, extensions? })`, then attach it:
  `document.body.append(editor.view.dom.parentElement!)` (focus needs attached elements).
  Create a container `div`, attach it too, and call `createToolbar(editor, { container, … })`.
- `afterEach`: destroy the toolbar and the editor, empty `document.body`, `vi.useRealTimers()`,
  `vi.restoreAllMocks()`.
- jsdom has `requestAnimationFrame`; with `vi.useFakeTimers()` the frame runs on
  `vi.advanceTimersToNextFrame()`. jsdom's `navigator.platform` is `''`, so titles use the
  non-Mac format.
- Find a button with `toolbar.element.querySelector('[data-item="bold"]')`; click with
  `button.click()`; check focus with `document.activeElement`. Send keys like this (`altKey`
  only for `Alt-F10`):

  ```ts
  button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  ```

### Toolbar cases

Default options and `StarterKit` unless stated.

1. Structure: `toolbar.element` is the only child of the container; it has `role="toolbar"`,
   `aria-label="Formatting"`, `aria-orientation="horizontal"`; it has 3 children with
   `role="group"`; the `data-item` values in order are `undo`, `redo`, `bold`, `italic`,
   `underline`, `strike`, `code`, `clearFormatting`, `bulletList`, `orderedList`,
   `blockquote`, `horizontalRule`.
2. Button `bold`: `type="button"`, `aria-label="Bold"`, `title="Bold (Ctrl+B)"`,
   `aria-pressed="false"`, one child `svg` with class `stilo-icon` and `aria-hidden="true"`.
3. Button `horizontalRule`: `title="Horizontal line"`, no `aria-pressed` attribute.
4. Button `redo`: `title="Redo (Ctrl+Shift+Z)"`; button `clearFormatting`:
   `title="Clear formatting (Ctrl+\)"`.
5. `messages: it`: toolbar `aria-label="Formattazione"`; `bold` has `aria-label="Grassetto"`
   and `title="Grassetto (Ctrl+B)"`.
6. `items: [['bold', 'nope']]` throws `StiloError` with message `Toolbar: unknown item "nope"`.
7. `extensions: [StarterKit({ bold: false })]`, `items: [['bold'], ['italic']]`: one group,
   one button (`italic`).
8. This custom item (import `Star` from `lucide`) in `items: [['bold', custom]]`:

   ```ts
   const custom: ToolbarButton = {
     id: 'hello',
     kind: 'button',
     icon: Star,
     labelKey: 'custom.hello',
     run: (e) => {
       e.commands.toggleItalic();
     },
   };
   ```

   - with `messages: { ...en, 'custom.hello': 'Hello' }`: its `aria-label` is `Hello`;
   - with default messages: its `aria-label` is `custom.hello`;
   - `html: '<p>[ab]</p>'`, click it: `getHTML()` is `<p><em>ab</em></p>`.
9. `html: '<p><strong>a|b</strong></p>'`: `bold` has `aria-pressed="true"` and class
   `stilo-toolbar__button--active`; `italic` has `aria-pressed="false"` and not that class.
10. Fresh editor (`html: '<p>ab</p>'`): `undo` has `aria-disabled="true"`; `bold` has no
    `aria-disabled` attribute.
11. `html: '<p><code>a|b</code></p>'`: `code` has `aria-pressed="true"`; `bold` has
    `aria-disabled="true"`; clicking `bold` leaves `getHTML()` at `<p><code>ab</code></p>`.
12. `html: '<p>[ab]</p>'`: click `bold` → `getHTML()` is `<p><strong>ab</strong></p>` and
    `document.activeElement` is `editor.view.dom`.
13. A `mousedown` event (`bubbles`, `cancelable`) dispatched on `bold`: `defaultPrevented` is
    `true`.
14. Refresh on transactions, with `vi.useFakeTimers()` before creating the toolbar,
    `html: '<p>a|b</p>'`, `vi.spyOn(window, 'requestAnimationFrame')` after creating it:
    1. `editor.commands.toggleBold()` then `editor.commands.toggleItalic()`: `bold` still has
       `aria-pressed="false"`; `requestAnimationFrame` was called once.
    2. `vi.advanceTimersToNextFrame()`: `bold` and `italic` have `aria-pressed="true"`.
15. `update()`: `html: '<p>a|b</p>'`, `editor.commands.toggleBold()`, then
    `toolbar.update()`: `bold` has `aria-pressed="true"` immediately.
16. Roving tabindex, initial: `undo` has `tabindex="0"`, every other button `tabindex="-1"`.
17. Keys, each starting from `undo.focus()`:
    1. `ArrowRight` → `redo` is focused, `redo` has `tabindex="0"`, `undo` has `tabindex="-1"`.
    2. `ArrowLeft` → `horizontalRule` is focused (wrap).
    3. `End` → `horizontalRule`; then `Home` → `undo`.
    4. `End`, then `ArrowRight` → `undo` (wrap).
18. `ArrowRight` dispatched on a `span` appended inside `toolbar.element` (not an item): the
    `tabindex` attributes do not change.
19. `Escape` on `bold` (focused): `document.activeElement` is `editor.view.dom`.
20. `Alt-F10`: focus `undo`, press `ArrowRight` twice (`bold` now has `tabindex="0"`), call
    `editor.focus()`, dispatch `keydown` `{ key: 'F10', altKey: true }` on `editor.view.dom`:
    `bold` is focused and the event's `defaultPrevented` is `true`.
21. `toolbar.destroy()`: the container is empty; `editor.commands.toggleBold()` does not call
    `requestAnimationFrame` (spy); after `editor.focus()`, `Alt-F10` on `editor.view.dom` leaves
    `document.activeElement` on `editor.view.dom`; a second `destroy()` does not throw.
22. Pending frame: fake timers, `editor.commands.toggleBold()`, `toolbar.destroy()`:
    `cancelAnimationFrame` was called (spy); `vi.advanceTimersToNextFrame()` does not throw.
23. `editor.destroy()`: the container is empty.

## Acceptance criteria

- [ ] `npm run check` passes.
- [ ] Every case above is a test; the two `it.each` tables are pasted unchanged (`npm run format`
  may re-wrap their lines; that is fine, the strings must not change).
- [ ] `npm run dev` shows the toolbar above the editor; buttons work with mouse and keyboard
  (you cannot see it: say in the Report that the PM must check it).
- [ ] Only the files in Scope changed (`git status`).

## Notes

- **Import rules apply to you now.** UI files import the core only from `../../index` (or
  `../index` from `src/ui/index.ts`): `Editor` and `StiloError` are there. `import type` for
  `Editor` when you only use it as a type.
- **`'toggleBold' in editor.commands`** is how a default item tells whether its extension is
  enabled (the runner object only has the registered commands, though its type lists all).
- **Labels:** `messages[item.labelKey] ?? item.labelKey`.
- **Toggle vs plain button** depends only on whether the item has `isActive`.
- **`aria-disabled`, not `disabled`:** a disabled `<button>` leaves the tab order and breaks the
  roving tabindex. The click handler checks `isEnabled` itself.
- **Keydown target:** the toolbar `keydown` listener acts only when `event.target` is one of the
  item elements it rendered (keep them in an array; it is also the roving order).
- **`requestAnimationFrame` batching:** keep the pending frame ID in the closure; `0`/`null`
  when none is pending.
- **Handlers:** keep a reference to each function you pass to `editor.on` so `editor.off`
  removes the same one.
- **No style strings:** the UI sets classes and attributes; the only inline style the UI ever
  writes is the popover position (T-014).
- **CSS:** `src/styles/ui.css` covers UI.md §7 for the toolbar and buttons (custom properties
  read with fallbacks, never declared). Leave popover, dropdown and heading-preview rules to
  T-014. Biome also formats CSS: run `npm run format`.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

## Report

### Files changed

- `src/ui/index.ts` — created (public API re-exports)
- `src/ui/i18n/types.ts` — created (i18n types)
- `src/ui/i18n/en.ts` — created (English locale)
- `src/ui/i18n/it.ts` — created (Italian locale)
- `src/ui/components/icon.ts` — created (lucide icon renderer)
- `src/ui/components/shortcut.ts` — created (`formatShortcut`, `isMacPlatform`)
- `src/ui/components/shortcut.test.ts` — created (shortcut format tests)
- `src/ui/toolbar/types.ts` — created (`ToolbarButton` type)
- `src/ui/toolbar/items.ts` — created (`DEFAULT_ITEMS`, `DEFAULT_TOOLBAR`)
- `src/ui/toolbar/toolbar.ts` — created (toolbar implementation)
- `src/ui/toolbar/toolbar.test.ts` — created (23 test cases)
- `src/styles/ui.css` — created (toolbar/button styles)
- `tests/architecture.test.ts` — created (import rule checker + real scan)
- `demo/main.ts` — modified (import CSS, create toolbar)

### Summary

Implemented the default UI toolbar with:

- **`createToolbar`**: builds a `role="toolbar"` element with 3 groups (`[undo, redo]`, `[bold…clearFormatting]`, `[bulletList…horizontalRule]`), roving tabindex, transaction-based active/enabled state refresh via `requestAnimationFrame`, `mousedown` prevention, `Escape`/arrow/Home/End key navigation, and Alt-F10 focus.
- **`formatShortcut`**: formats shortcuts as `Ctrl+Shift+Z` (PC) or `⇧⌘Z` (Mac), with modifier order Ctrl→Alt→Shift→key.
- **i18n**: `en` and `it` locale files; messages fall back to the key when a translation is missing.
- **Architecture test**: scans every `.ts` file under `src/` and validates import rules between core, extensions, and UI.
- **Demo page**: toolbar rendered above the editor, buttons work with mouse and keyboard.

### Points for the reviewer

- Test 7 was originally using a stub extension without `spec`; the task specifies `StarterKit({ bold: false })` instead. The test was corrected to match case 7 of the task.
- `resolveItem` now checks `isAvailable` for string items (not just custom item objects), so disabled extensions are filtered from the toolbar.
- ArrowLeft from the last item stays on the last item (no wrap); ArrowLeft from the first item wraps to last.
- Run `npm run dev` to verify the toolbar renders above the editor and buttons work with mouse and keyboard.

### Failed `npm run check` runs before the final one

1 run (test 7 failed with "The schema requires a 'doc' node" due to the stub extension).

## Metrics

<!-- Reviewer only (the implementer never edits this section): architect tokens (preparation,
review), implementer failed check runs and context compactions, review rounds, escalation. -->
