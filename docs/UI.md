# Stilo — Default UI design

Status: **draft v0.1** (2026-10-12). Contract of the default UI (`stilo-editor/ui`,
ARCHITECTURE §9). Like ARCHITECTURE, the implementer does not deviate from it; changes go
through the architect.

---

## 1. Principles

- The UI is optional and uses only the public core API (`src/index.ts`): `editor.commands`,
  `editor.can()`, `editor.isActive()`, `editor.getAttributes()`, `editor.on/off`,
  `editor.focus()`, and `editor.view`
  for two things only: anchoring popovers to the selection (`view.coordsAtPos`,
  `view.domAtPos`, `view.hasFocus()`, and mounting next to `view.dom`) and listening to DOM
  events on `view.dom`.
- Plain DOM, no framework, no global mutable state: every piece of state lives in the closure of
  the object that owns it (`createToolbar`, `createPopover`, `createDropdown`).
- Everything the UI creates is removed by its `destroy()`: elements, editor handlers, DOM
  listeners, pending animation frames, Floating UI `autoUpdate`.
- Accessibility follows the WAI-ARIA Authoring Practices patterns *Toolbar* and *Menu Button*
  (SPEC NFR-4).
- Floating elements go through one component, `createPopover` (ADR 0002).

## 2. Modules

```
src/ui/
├── index.ts                 Public API of the UI (re-exports only)
├── i18n/
│   ├── types.ts             MessageKey, Messages
│   ├── en.ts                export const en: Messages
│   └── it.ts                export const it: Messages
├── components/
│   ├── icon.ts              createIcon
│   ├── shortcut.ts          formatShortcut, isMacPlatform
│   ├── popover.ts           createPopover (T-014)
│   ├── dropdown.ts          createDropdown (T-014)
│   ├── link-popover.ts      createLinkPopover, canEditLink (T-016)
│   └── link-bubble.ts       createLinkBubble (T-016)
└── toolbar/
    ├── types.ts             ToolbarItem and related types
    ├── items.ts             DEFAULT_ITEMS, DEFAULT_TOOLBAR, headingDropdown (T-014)
    └── toolbar.ts           createToolbar
src/styles/ui.css            All UI styles
tests/architecture.test.ts   Import rules of ARCHITECTURE §2.2
```

Tests are colocated (`src/ui/**/<name>.test.ts`).

## 3. Public API (`src/ui/index.ts`)

```ts
export { createToolbar, type Toolbar, type ToolbarOptions } from './toolbar/toolbar';
export type { ToolbarButton, ToolbarContext, ToolbarDropdown, ToolbarDropdownOption,
  ToolbarItem } from './toolbar/types';
export { DEFAULT_ITEMS, DEFAULT_TOOLBAR, headingDropdown } from './toolbar/items';
export type { MessageKey, Messages } from './i18n/types';
export { en } from './i18n/en';
export { it } from './i18n/it';
export { formatShortcut } from './components/shortcut';
```

`headingDropdown` and the dropdown types arrive with T-014.

### 3.1 Toolbar

```ts
/** Options of {@link createToolbar}. */
export interface ToolbarOptions {
  /** The toolbar element is appended inside it. */
  container: HTMLElement;
  /** Groups of items: an ID of DEFAULT_ITEMS or a custom item. Default: DEFAULT_TOOLBAR. */
  items?: ReadonlyArray<ReadonlyArray<string | ToolbarItem>>;
  /** UI strings. Default: `en`. */
  messages?: Messages;
}

/** A toolbar created by {@link createToolbar}. */
export interface Toolbar {
  /** The `role="toolbar"` element. */
  readonly element: HTMLElement;
  /** Refreshes active/enabled states now (they also refresh on every transaction). */
  update(): void;
  /** Removes the toolbar and every listener. Calling it twice is a no-op. */
  destroy(): void;
}

export function createToolbar(editor: Editor, options: ToolbarOptions): Toolbar;
```

```ts
/** A toolbar button. */
export interface ToolbarButton {
  /** Unique within the toolbar; written as `data-item`. */
  id: string;
  kind: 'button';
  icon: IconNode;                         // from 'lucide'
  /** Key of the label in `messages`; a missing key is shown as is. */
  labelKey: string;
  /** Keymap notation shown in the tooltip, e.g. 'Mod-b'. */
  shortcut?: string;
  /** Runs on click, after the editor got the focus back. */
  run(editor: Editor, context: ToolbarContext): void;
  /** Present = toggle button (`aria-pressed`). */
  isActive?(editor: Editor): boolean;
  /** Default: always enabled. */
  isEnabled?(editor: Editor): boolean;
  /** False = not rendered (e.g. its extension is disabled). Default: available. */
  isAvailable?(editor: Editor): boolean;
}

/** UI services the toolbar offers to `run` (T-016). */
export interface ToolbarContext {
  /** Opens the link popover under the selection (no-op without the `Link` extension). */
  openLinkPopover(): void;
}

/** A dropdown of mutually exclusive options (T-014). */
export interface ToolbarDropdown {
  id: string;
  kind: 'dropdown';
  /** Key of the accessible name of the trigger and of the menu. */
  labelKey: string;
  options: ToolbarDropdownOption[];
  isAvailable?(editor: Editor): boolean;
}

/** An option of a {@link ToolbarDropdown}. */
export interface ToolbarDropdownOption {
  /** Unique within the dropdown; used in the class `stilo-dropdown__option--<id>`. */
  id: string;
  labelKey: string;
  shortcut?: string;
  run(editor: Editor): void;
  isActive(editor: Editor): boolean;
  /** Default: always enabled. */
  isEnabled?(editor: Editor): boolean;
}

export type ToolbarItem = ToolbarButton | ToolbarDropdown;   // T-013: ToolbarButton only
```

### 3.2 i18n

```ts
/** Keys of the built-in UI strings (dot.case, ARCHITECTURE §4.1). */
export type MessageKey = 'toolbar.label' | 'toolbar.undo' | … ; // every key of the table below
/** UI strings: every MessageKey, plus the label keys of custom toolbar items. */
export type Messages = Readonly<Record<MessageKey, string>> & Readonly<Record<string, string>>;
```

A custom locale is a full `Messages` object; spread `en` to override a few strings or to add the
labels of custom items (`{ ...en, 'myPlugin.hello': 'Hello' }`). Locale files are plain objects,
no functions.

| Key | `en` | `it` |
|---|---|---|
| `toolbar.label` | Formatting | Formattazione |
| `toolbar.undo` | Undo | Annulla |
| `toolbar.redo` | Redo | Ripeti |
| `toolbar.bold` | Bold | Grassetto |
| `toolbar.italic` | Italic | Corsivo |
| `toolbar.underline` | Underline | Sottolineato |
| `toolbar.strike` | Strikethrough | Barrato |
| `toolbar.code` | Code | Codice |
| `toolbar.clearFormatting` | Clear formatting | Cancella formattazione |
| `toolbar.bulletList` | Bulleted list | Elenco puntato |
| `toolbar.orderedList` | Numbered list | Elenco numerato |
| `toolbar.blockquote` | Quote | Citazione |
| `toolbar.horizontalRule` | Horizontal line | Linea orizzontale |
| `toolbar.heading` | Text style | Stile testo |
| `toolbar.link` | Link | Collegamento |
| `heading.paragraph` | Paragraph | Paragrafo |
| `heading.h1` | Heading 1 | Titolo 1 |
| `heading.h2` | Heading 2 | Titolo 2 |
| `heading.h3` | Heading 3 | Titolo 3 |
| `heading.h4` | Heading 4 | Titolo 4 |
| `heading.h5` | Heading 5 | Titolo 5 |
| `heading.h6` | Heading 6 | Titolo 6 |
| `link.url` | URL | URL |
| `link.newTab` | Open in new tab | Apri in una nuova scheda |
| `link.apply` | Apply | Applica |
| `link.remove` | Remove link | Rimuovi collegamento |
| `link.edit` | Edit link | Modifica collegamento |
| `link.open` | Open link in a new tab | Apri il collegamento in una nuova scheda |

### 3.3 Default items

`DEFAULT_TOOLBAR`:

```ts
[
  ['undo', 'redo'],
  ['heading'],
  ['bold', 'italic', 'underline', 'strike', 'code', 'link', 'clearFormatting'],
  ['bulletList', 'orderedList', 'blockquote', 'horizontalRule'],
]
```

Every default button: `run` calls `editor.commands.<command>()`, `isEnabled` calls
`editor.can().<command>()`, `isAvailable` is `'<command>' in editor.commands`.

| ID | Icon (`lucide`) | `labelKey` | Shortcut | Command | `isActive` |
|---|---|---|---|---|---|
| `undo` | `Undo2` | `toolbar.undo` | `Mod-z` | `undo` | — |
| `redo` | `Redo2` | `toolbar.redo` | `Mod-Shift-z` | `redo` | — |
| `bold` | `Bold` | `toolbar.bold` | `Mod-b` | `toggleBold` | `isActive('bold')` |
| `italic` | `Italic` | `toolbar.italic` | `Mod-i` | `toggleItalic` | `isActive('italic')` |
| `underline` | `Underline` | `toolbar.underline` | `Mod-u` | `toggleUnderline` | `isActive('underline')` |
| `strike` | `Strikethrough` | `toolbar.strike` | `Mod-Shift-s` | `toggleStrike` | `isActive('strike')` |
| `code` | `Code` | `toolbar.code` | `Mod-e` | `toggleCode` | `isActive('code')` |
| `clearFormatting` | `RemoveFormatting` | `toolbar.clearFormatting` | `Mod-\` | `clearFormatting` | — |
| `bulletList` | `List` | `toolbar.bulletList` | `Mod-Shift-8` | `toggleBulletList` | `isActive('bulletList')` |
| `orderedList` | `ListOrdered` | `toolbar.orderedList` | `Mod-Shift-7` | `toggleOrderedList` | `isActive('orderedList')` |
| `blockquote` | `TextQuote` | `toolbar.blockquote` | `Mod-Shift-b` | `toggleBlockquote` | `isActive('blockquote')` |
| `horizontalRule` | `Minus` | `toolbar.horizontalRule` | — | `setHorizontalRule` | — |

`link` (T-016) differs: `icon` `Link`, `labelKey` `toolbar.link`, shortcut `Mod-k`, `run` calls
`context.openLinkPopover()`, `isActive` is `isActive('link')`, `isEnabled` is
`canEditLink(editor)` (§5.1), `isAvailable` is `'setLink' in editor.commands`.

`heading` (T-014) is `headingDropdown()`, see §6.

## 4. Toolbar behavior

### 4.1 DOM

```html
<div class="stilo-toolbar" role="toolbar" aria-label="Formatting" aria-orientation="horizontal">
  <div class="stilo-toolbar__group" role="group">
    <button type="button" class="stilo-toolbar__button" data-item="bold" tabindex="0"
      aria-label="Bold" title="Bold (Ctrl+B)" aria-pressed="false">
      <svg class="stilo-icon" aria-hidden="true">…</svg>
    </button>
    …
  </div>
  …
</div>
```

- Groups are rendered in order; an item whose `isAvailable` returns `false` is skipped; a group
  left empty is not rendered.
- An unknown item ID throws `StiloError('Toolbar: unknown item "<id>"')`.
- `title`: the label, plus ` (<formatShortcut(shortcut)>)` when the item has a shortcut.
- Toggle buttons (with `isActive`) have `aria-pressed="true|false"` and, when pressed, the class
  `stilo-toolbar__button--active`. Other buttons have neither.
- Disabled buttons have `aria-disabled="true"` (removed when enabled) and stay focusable (APG
  toolbar). Activating a disabled button does nothing.

### 4.2 Mouse

- `mousedown` on the toolbar calls `preventDefault()`: the editor keeps focus and its DOM
  selection, so clicking a button never blurs the editor.
- `click` on an enabled button: `editor.focus()`, then `item.run(editor, context)` (a `run`
  that opens a popover moves the focus into it).

### 4.3 Keyboard (roving tabindex)

- The toolbar handles a `keydown` only when its target is one of the item elements (buttons,
  dropdown triggers), never one coming from inside an open dropdown menu.
- Exactly one item has `tabindex="0"` (initially the first rendered item), all others `-1`.
- `ArrowRight` / `ArrowLeft`: focus the next / previous item, wrapping around; `Home` / `End`:
  first / last item. The newly focused item gets `tabindex="0"`, the previous one `-1`.
- `Enter` / `Space`: native button activation (→ `click`).
- `Escape` in the toolbar: `editor.focus()`.
- `Alt-F10` in the editor (`keydown` on `editor.view.dom`, `altKey` and `key === 'F10'`):
  `preventDefault()`, then focus the item with `tabindex="0"`.
- `Mod-k` in the editor (`metaKey` on Mac, `ctrlKey` elsewhere, no `Alt`/`Shift`, key `k`),
  when the `Link` extension is present: `preventDefault()`, then open the link popover (§5.1).
  The toolbar owns the link popover and the link bubble (§5.2) even when the `link` button is
  not in its items. Both are mounted in the parent of `view.dom` (the element given to the
  `Editor`), so that they scroll with the content.

### 4.4 State refresh

- `update()` recomputes, for every rendered item, `isActive` and `isEnabled`, and writes the
  attributes of §4.1. It runs once synchronously in `createToolbar`.
- On every `transaction` event the toolbar schedules `update()` with `requestAnimationFrame`;
  at most one frame is pending at a time.
- On the editor `destroy` event the toolbar destroys itself.
- `destroy()`: cancels the pending frame, removes the editor handlers (`off`) and the
  `keydown` listener on `view.dom`, removes the element. Idempotent.

### 4.5 Shortcuts in tooltips

`formatShortcut(shortcut, mac)` converts keymap notation:

- The last `-`-separated part is the key; the others are modifiers among `Mod`, `Ctrl`, `Alt`,
  `Shift`. A single-character key is uppercased; longer keys (`Enter`, `F10`) stay as written.
- Off Mac: `Mod` means `Ctrl`; modifiers in the order `Ctrl`, `Alt`, `Shift` (each at most
  once), then the key, joined with `+`: `Mod-Shift-z` → `Ctrl+Shift+Z`.
- On Mac: `Ctrl` → `⌃`, `Alt` → `⌥`, `Shift` → `⇧`, `Mod` → `⌘`, in the order `⌃⌥⇧⌘`, then
  the key, no separator: `Mod-Shift-z` → `⇧⌘Z`, `Mod-Alt-1` → `⌥⌘1`.

`isMacPlatform()` returns `/Mac|iPhone|iPad/.test(navigator.platform)`; `createToolbar` calls it
once (never at module top level).

## 5. Popover (T-014)

```ts
import type { Placement, VirtualElement } from '@floating-ui/dom';

/** Why a popover closed. `api` = `close()` or `destroy()` was called. */
export type PopoverCloseReason = 'escape' | 'outside' | 'api';

export interface PopoverOptions {
  /** What the popover is anchored to: an element, or a rectangle (e.g. the selection). */
  anchor: Element | VirtualElement;
  /** The floating element; the popover appends it to `container`. */
  content: HTMLElement;
  /** The element the popover scrolls with (it gets the class `stilo-popover-host`). */
  container: HTMLElement;
  /** Default: 'bottom-start'. */
  placement?: Placement;
  /** Distance from the anchor in px. Default: 4. */
  offset?: number;
  /** Called on every open → closed transition. */
  onClose?(reason: PopoverCloseReason): void;
}

export interface Popover {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  destroy(): void;
}

export function createPopover(options: PopoverOptions): Popover;
```

- Created closed: `content` gets the class `stilo-popover` and the `hidden` attribute and is
  appended to `container`, which gets the class `stilo-popover-host` (`position: relative`).
  `destroy()` removes that class when no other popover is left in `container`.
- `open()`: removes `hidden`, starts `autoUpdate(anchor, content, position)`; `position` calls
  `computePosition` with `strategy: 'absolute'`, the placement and the middleware
  `[offset(n), flip(), shift({ padding: 8 })]`, and writes `left` / `top` in px on
  `content.style`. A result that arrives after the popover closed is ignored. Opening an open
  popover does nothing.
- While open: `pointerdown` (capture) on the document outside `content` and outside the anchor
  (when it is an element) closes with `outside`; `keydown` (capture) `Escape` on the document
  closes with `escape`.
- `close()`: closes with `api`. Closing sets `hidden`, stops `autoUpdate`, removes the document
  listeners, calls `onClose(reason)`. Closing a closed popover does nothing.
- `destroy()`: closes if open, removes `content`. Idempotent.

`strategy: 'absolute'` inside a positioned `container` that scrolls with the anchor (the toolbar
for its menus, the editor element for popovers anchored to the content): the browser moves the
popover on scroll in the same frame as the anchor. With `fixed`, every scroll waited for an
asynchronous `computePosition` and the popover visibly lagged and trembled (T-016). Trade-off: an
ancestor with `overflow: hidden` can clip a popover; `flip()` limits the cases. The
`--stilo-*` custom properties must be declared on a common ancestor of the toolbar and the
editor (or on `:root`).

### 5.1 Link popover (T-016)

`createLinkPopover(editor, { container, messages })` (internal, created by the toolbar with its
element as container) and `canEditLink(editor)`: `isActive('link') ||
can().setLink({ href: 'https://example.com' })`, i.e. false only at a cursor outside a link.

```html
<div class="stilo-popover stilo-link-popover" role="dialog" aria-label="Link" hidden>
  <form class="stilo-link-popover__form">
    <input class="stilo-link-popover__url" type="text" inputmode="url" aria-label="URL"
      placeholder="https://" autocomplete="off" spellcheck="false">
    <label class="stilo-link-popover__new-tab"><input type="checkbox"> Open in new tab</label>
    <div class="stilo-link-popover__actions">
      <button type="submit" class="stilo-link-popover__button
        stilo-link-popover__button--primary">Apply</button>
      <button type="button" class="stilo-link-popover__button">Remove link</button>
    </div>
  </form>
</div>
```

- Anchor: a virtual element (`contextElement: view.dom`) spanning `view.coordsAtPos(from)` and
  `view.coordsAtPos(to)` of the selection, placement `bottom-start`.
- Mounted in the editor element (§4.3).
- `open()`: nothing when already open or `canEditLink` is false. Prefills the URL and the
  checkbox from `getAttributes('link')` (`href`, `target === '_blank'`), shows *Remove link*
  only when `isActive('link')`, opens, focuses and selects the URL.
- Submit (`Enter` in the URL or *Apply*): trimmed URL not empty → `setLink({ href, target })`;
  empty → `unsetLink()` when a link is active, otherwise nothing. When the command returns
  `false` (URL refused by the `Link` extension) the URL gets `aria-invalid="true"` and keeps
  the focus; editing it removes the attribute. On success: close, `editor.focus()`.
- *Remove link*: `unsetLink()`, close, `editor.focus()`.
- `Escape`: close, `editor.focus()`. Pointer down outside: close, focus does not move.

### 5.2 Link bubble (T-016)

`createLinkBubble(editor, { container, messages, onEdit })` (internal): a small popover under
the link at the cursor, like the link preview of webmail editors.

```html
<div class="stilo-popover stilo-link-bubble" role="group" aria-label="Link" hidden>
  <a class="stilo-link-bubble__url" href="https://x.com" target="_blank"
    rel="noopener noreferrer" title="Open link in a new tab">https://x.com</a>
  <button type="button" class="stilo-link-bubble__button" aria-label="Edit link"
    title="Edit link">…Pencil…</button>
  <button type="button" class="stilo-link-bubble__button" aria-label="Remove link"
    title="Remove link">…Unlink…</button>
</div>
```

- Shown while the selection is empty, `isActive('link')` and the editor has the focus
  (`view.hasFocus()`); refreshed on the `transaction`, `focus` and `blur` events. Anchor: the
  `<a>` of the cursor (`view.domAtPos(from)`). Moving to another link closes and reopens it,
  so that it is positioned again.
- `mousedown` on the bubble is prevented: the editor keeps the focus while its buttons are
  clicked. The URL opens in a new tab; *Edit link* closes the bubble and opens the link popover
  (focus to the URL field, so the bubble stays hidden); *Remove link* runs `unsetLink()`.
- Keyboard users reach the same actions with `Mod-k`; the bubble is not focusable on purpose.
- Pointer down outside or `Escape` hide it until the next transaction.

## 6. Dropdown and heading dropdown (T-014)

### 6.1 DOM

```html
<button type="button" class="stilo-toolbar__button stilo-dropdown__trigger" data-item="heading"
  aria-haspopup="menu" aria-expanded="false" aria-label="Text style: Paragraph"
  title="Text style">
  <span class="stilo-dropdown__value">Paragraph</span>
  <svg class="stilo-icon" aria-hidden="true">…ChevronDown…</svg>
</button>
<!-- appended to the toolbar element by createPopover -->
<div class="stilo-popover stilo-dropdown__menu" role="menu" aria-label="Text style" hidden>
  <div class="stilo-dropdown__option stilo-dropdown__option--paragraph" role="menuitemradio"
    aria-checked="true" tabindex="-1" data-option="paragraph">
    <span class="stilo-dropdown__label">Paragraph</span>
    <span class="stilo-dropdown__shortcut">Ctrl+Alt+0</span>
  </div>
  …
</div>
```

- The trigger shows the label of the active option (the first whose `isActive` is true), or the
  dropdown label when none is active; `aria-label` is `<dropdown label>: <shown text>`.
- `aria-checked` is `true` on the active option only. A disabled option has
  `aria-disabled="true"`. When every option is disabled the trigger has `aria-disabled="true"`
  and does not open.

### 6.2 Behavior (APG Menu Button)

- Opening (`click`, `Enter`, `Space`, `ArrowDown` on the trigger): open the popover, set
  `aria-expanded="true"`, focus the checked option, or the first enabled one when none is
  checked. `ArrowUp` on the trigger opens and focuses the last enabled option.
- `click` on the trigger of an open dropdown closes it.
- In the menu: `ArrowDown` / `ArrowUp` focus the next / previous enabled option, wrapping;
  `Home` / `End` the first / last enabled option; disabled options are skipped.
- Selecting (`Enter`, `Space`, `click` on an enabled option): close, run the option, then
  `editor.focus()`.
- `Escape`: close and focus the trigger. `Tab`: close (default Tab behavior continues). Pointer
  down outside: close, focus does not move.
- Closing for any reason sets `aria-expanded="false"`.

### 6.3 Heading dropdown

`headingDropdown(levels: HeadingLevel[] = [1, 2, 3, 4, 5, 6]): ToolbarDropdown`, item ID
`heading`, `labelKey` `toolbar.heading`, `isAvailable`: `'setHeading' in editor.commands`.
Pass `headingDropdown([1, 2, 3])` as a custom item when the `Heading` extension is configured
with fewer levels.

| Option ID | `labelKey` | Shortcut | `run` | `isActive` |
|---|---|---|---|---|
| `paragraph` | `heading.paragraph` | `Mod-Alt-0` | `setParagraph()` | `isActive('paragraph')` |
| `h<n>` | `heading.h<n>` | `Mod-Alt-<n>` | `setHeading({ level: n })` | `isActive('heading', { level: n })` |

`isEnabled` of each option: `isActive(editor) || editor.can().<run command>`. `setBlockType`
refuses a block that already has the type, and the active option must stay selectable.

## 7. Styles (`src/styles/ui.css`)

- Classes: `stilo-` prefix, BEM (ARCHITECTURE §4.1). Only classes, never IDs or element
  selectors outside a class scope.
- Custom properties are **read with fallbacks and never declared by the UI**:
  `var(--stilo-color-border, #d1d9e0)`. Declaring them on a component would block overrides
  set on an ancestor or on `:root`.
- Visible focus: `:focus-visible` outline in `--stilo-color-focus`.

| Property | Default | Use |
|---|---|---|
| `--stilo-font-family` | `system-ui, sans-serif` | UI text |
| `--stilo-font-size` | `14px` | UI text |
| `--stilo-color-text` | `#1f2328` | Text and icons |
| `--stilo-color-muted` | `#59636e` | Shortcuts in menus |
| `--stilo-color-bg` | `#ffffff` | Toolbar and popover background |
| `--stilo-color-border` | `#d1d9e0` | Toolbar bottom border, group separators, popover border |
| `--stilo-color-hover` | `#eef1f4` | Button / option hover |
| `--stilo-color-active` | `#dde4ee` | Pressed button, checked option |
| `--stilo-color-focus` | `#0969da` | Focus ring, primary button |
| `--stilo-color-error` | `#d1242f` | Border of an invalid field |
| `--stilo-radius` | `6px` | Buttons, popover |
| `--stilo-toolbar-padding` | `4px` | Toolbar padding and gap |
| `--stilo-button-size` | `32px` | Button height and min width |
| `--stilo-icon-size` | `18px` | Icons |
| `--stilo-popover-shadow` | `0 8px 24px rgb(0 0 0 / 0.12)` | Popover |
| `--stilo-z-popover` | `1000` | Popover `z-index` |
| `--stilo-menu-h1-size` … `--stilo-menu-h6-size` | `1.5em`, `1.3em`, `1.15em`, `1em`, `1em`, `1em` | Heading preview |

Layout:

- Toolbar: flex row, wraps, `gap` and `padding` `--stilo-toolbar-padding`, bottom border.
  Groups: flex row; every group after the first has a left border as separator.
- Button: transparent background, no border, `--stilo-radius`, size `--stilo-button-size`,
  icon centered; hover → `--stilo-color-hover`; `--active` → `--stilo-color-active`;
  `[aria-disabled="true"]` → opacity 0.4, `cursor: default`, no hover color.
- Dropdown trigger: auto width, `min-width: 120px`, text left, chevron right.
- Popover host: `position: relative`. Popover: `position: absolute`, `top: 0`, `left: 0`,
  `width: max-content`, background, border, radius, shadow, `z-index`, `padding: 4px`.
- Option: flex row, label left, shortcut right in `--stilo-color-muted` at `0.85em`;
  hover/focus → `--stilo-color-hover`; checked → `--stilo-color-active`; disabled → opacity 0.4.
- Heading preview: `.stilo-dropdown__option--h<n> .stilo-dropdown__label` uses
  `--stilo-menu-h<n>-size` and `font-weight: 600`; the shortcut keeps the normal size.
- Link popover: 320px wide form; URL on its own row with border and radius, focus ring,
  `--stilo-color-error` border when invalid; checkbox label and actions on the second row;
  buttons with border and radius, the primary one filled with `--stilo-color-focus`.
- Link bubble: flex row; URL in `--stilo-color-focus`, at most 240px with ellipsis; icon buttons
  like the toolbar buttons.

## 8. Later

- Tooltips: native `title` in M1; a Floating UI tooltip with an arrow and a light animation
  replaces it later (ADR 0002).
- `setEditable` emits no event: the toolbar does not reflect read-only mode yet (call
  `toolbar.update()` and handle it when the core gets an event).
- Link popover: inserting a new linked text at a cursor outside a link (today the button is
  disabled there); exporting `createLinkPopover` for custom toolbars.
