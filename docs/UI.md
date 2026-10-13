# Stilo — Default UI design

Status: **draft v0.1** (2026-10-12). Contract of the default UI (`stilo-editor/ui`,
ARCHITECTURE §9). Like ARCHITECTURE, it is the contract: a change to the UI updates this
document in the same change.

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
│   ├── link-bubble.ts       createLinkBubble (T-016)
│   ├── character-picker.ts  createCharacterPicker (T-024)
│   ├── characters.ts        SYMBOLS, EMOJI: picker data, a separate chunk (T-024)
│   └── color-button.ts      createColorButton: split button and color popover (T-026)
└── toolbar/
    ├── types.ts             ToolbarItem and related types
    ├── items.ts             DEFAULT_ITEMS, DEFAULT_TOOLBAR, headingDropdown (T-014),
    │                        textColorButton, highlightButton (T-026)
    ├── palette.ts           DEFAULT_PALETTE (T-026)
    └── toolbar.ts           createToolbar
src/styles/ui.css            All UI styles
tests/architecture.test.ts   Import rules of ARCHITECTURE §2.2
```

Tests are colocated (`src/ui/**/<name>.test.ts`).

## 3. Public API (`src/ui/index.ts`)

```ts
export { createToolbar, type Toolbar, type ToolbarOptions } from './toolbar/toolbar';
export type { ToolbarButton, ToolbarColor, ToolbarColorButton, ToolbarContext,
  ToolbarDropdown, ToolbarDropdownOption, ToolbarItem } from './toolbar/types';
export { DEFAULT_ITEMS, DEFAULT_TOOLBAR, headingDropdown, highlightButton,
  textColorButton } from './toolbar/items';
export { DEFAULT_PALETTE } from './toolbar/palette';
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
  /**
   * Keeps the toolbar visible at the top of the scrolling area: `container` gets the class
   * `stilo-toolbar-host` (`position: sticky`). Default: `true`.
   */
  sticky?: boolean;
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
  /** Opens or closes the character picker (no-op without the `characters` item). T-024. */
  toggleCharacterPicker(): void;
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

/** A color of a ToolbarColorButton palette (T-026). */
export interface ToolbarColor {
  /** A CSS color, written as the editor stores it (e.g. lowercase `#rrggbb`). */
  color: string;
  /** Key of the color name in `messages`; a missing key is shown as is. */
  labelKey: string;
}

/** A split button that applies a color (T-026, §5.4). */
export interface ToolbarColorButton {
  /** Unique within the toolbar; written as `data-item` on both parts. */
  id: string;
  kind: 'color';
  icon: IconNode;
  labelKey: string;
  palette: readonly ToolbarColor[];
  /** The color the main part applies until one is picked (`null`: the mark without a color). */
  defaultColor: string | null;
  /** Shows "Default" next to "No color": applies the color `null`, label inside a `<mark>`. */
  defaultChoice?: boolean;
  /** Applies `color` to the selection; `false` when the color is refused. */
  setColor(editor: Editor, color: string | null): boolean;
  unsetColor(editor: Editor): void;
  /** Whether the whole selection has `color`. */
  hasColor(editor: Editor, color: string | null): boolean;
  /** The color at the selection, `null` when there is none. */
  getColor(editor: Editor): string | null;
  isEnabled?(editor: Editor): boolean;
  isAvailable?(editor: Editor): boolean;
}

export type ToolbarItem = ToolbarButton | ToolbarDropdown | ToolbarColorButton;
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
| `toolbar.subscript` | Subscript | Pedice |
| `toolbar.superscript` | Superscript | Apice |
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
| `toolbar.characters` | Insert character | Inserisci carattere |
| `characters.search` | Search | Cerca |
| `characters.noResults` | No results | Nessun risultato |
| `characters.symbols` | Symbols | Simboli |
| `characters.emoji` | Emoji | Emoji |
| `characters.punctuation` | Punctuation | Punteggiatura |
| `characters.currency` | Currency | Valute |
| `characters.math` | Math | Matematica |
| `characters.arrows` | Arrows | Frecce |
| `characters.greek` | Greek | Greco |
| `characters.latin` | Accented letters | Lettere accentate |
| `characters.signs` | Signs and shapes | Segni e forme |
| `characters.smileys` | Smileys | Faccine |
| `characters.people` | People and gestures | Persone e gesti |
| `characters.nature` | Animals and nature | Animali e natura |
| `characters.food` | Food and drink | Cibo e bevande |
| `characters.travel` | Travel and places | Viaggi e luoghi |
| `characters.activities` | Activities | Attività |
| `characters.objects` | Objects | Oggetti |
| `characters.emojiSymbols` | Symbols | Simboli |
| `toolbar.textColor` | Text color | Colore testo |
| `toolbar.highlight` | Highlight | Evidenziatore |
| `color.more` | more colors | altri colori |
| `color.none` | No color | Nessun colore |
| `color.default` | Default | Predefinito |
| `color.pick` | Pick a color | Scegli un colore |
| `color.custom` | Custom color | Colore personalizzato |
| `color.apply` | Apply | Applica |
| `color.<name>` | the 32 color names of `DEFAULT_PALETTE` (`color.black`, `color.red`, `color.lightRed`, `color.darkRed`, …) | Nero, Rosso, Rosso chiaro, Rosso scuro, … |

### 3.3 Default items

`DEFAULT_TOOLBAR`:

```ts
[
  ['undo', 'redo'],
  ['heading'],
  ['bold', 'italic', 'underline', 'strike', 'code', 'subscript', 'superscript', 'link',
    'clearFormatting'],
  ['textColor', 'highlight'],
  ['bulletList', 'orderedList', 'blockquote', 'horizontalRule', 'characters'],
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
| `subscript` | `Subscript` | `toolbar.subscript` | `Mod-,` | `toggleSubscript` | `isActive('subscript')` |
| `superscript` | `Superscript` | `toolbar.superscript` | `Mod-.` | `toggleSuperscript` | `isActive('superscript')` |
| `clearFormatting` | `RemoveFormatting` | `toolbar.clearFormatting` | `Mod-\` | `clearFormatting` | — |
| `bulletList` | `List` | `toolbar.bulletList` | `Mod-Shift-8` | `toggleBulletList` | `isActive('bulletList')` |
| `orderedList` | `ListOrdered` | `toolbar.orderedList` | `Mod-Shift-7` | `toggleOrderedList` | `isActive('orderedList')` |
| `blockquote` | `TextQuote` | `toolbar.blockquote` | `Mod-Shift-b` | `toggleBlockquote` | `isActive('blockquote')` |
| `horizontalRule` | `Minus` | `toolbar.horizontalRule` | — | `setHorizontalRule` | — |

`link` (T-016) differs: `icon` `Link`, `labelKey` `toolbar.link`, shortcut `Mod-k`, `run` calls
`context.openLinkPopover()`, `isActive` is `isActive('link')`, `isEnabled` is
`canEditLink(editor)` (§5.1), `isAvailable` is `'setLink' in editor.commands`.

`heading` (T-014) is `headingDropdown()`, see §6.

`textColor` and `highlight` (T-026) are color split buttons (§5.4), created by
`textColorButton(palette = DEFAULT_PALETTE)` and `highlightButton(palette = DEFAULT_PALETTE)`;
pass them with another palette as custom items to replace the colors
(`textColorButton([{ color: '#0b5394', labelKey: 'Brand blue' }])`).

| ID | Icon | `labelKey` | `defaultColor` | `setColor` / `unsetColor` | `hasColor` / `getColor` | `isAvailable` |
|---|---|---|---|---|---|---|
| `textColor` | `Type` | `toolbar.textColor` | `#000000` (black), no `defaultChoice` | `setColor(color)` / `unsetColor()` | `isActive('textStyle', { color })` / `getAttributes('textStyle').color` | `'setColor' in editor.commands` |
| `highlight` | `Highlighter` | `toolbar.highlight` | `null` (plain `<mark>`), `defaultChoice: true` | `setHighlight({ color })` / `unsetHighlight()` | `isActive('highlight', { color })` / `getAttributes('highlight').color` | `'setHighlight' in editor.commands` |

`isEnabled`: `can().setColor('#000000')` and `can().setHighlight()` (false inside code).

`DEFAULT_PALETTE`: 8 columns; grays from black to white, then 8 hues (red, orange, yellow, green,
cyan, blue, purple, pink) in a vivid, a light and a dark row (Tailwind shades 500, 200, 800).

`characters` (T-024): `icon` `FaceSlightlySmilingPlus`, `labelKey` `toolbar.characters`, no shortcut, `run` calls
`context.toggleCharacterPicker()` (§5.3), always enabled, `isAvailable` is
`'insertText' in editor.commands` (the `Text` extension).

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
`--stilo-*` custom properties must be overridden on a common ancestor of the toolbar and the
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
  <a class="stilo-link-bubble__button" href="https://x.com" target="_blank"
    rel="noopener noreferrer" aria-label="Open link in a new tab"
    title="Open link in a new tab: https://x.com">…ExternalLink…</a>
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

### 5.3 Character picker (T-024)

`createCharacterPicker(editor, { anchor, container, messages })` (internal), created by the
toolbar when it has the `characters` item: anchored to that button, `container` the toolbar
(it scrolls with it). Special characters and emoji (SPEC F-904, F-905).

```html
<div class="stilo-popover stilo-char-picker" role="dialog" aria-label="Insert character" hidden>
  <input type="search" class="stilo-char-picker__search" placeholder="Search" aria-label="Search">
  <div class="stilo-char-picker__tabs" role="tablist">
    <button type="button" class="stilo-char-picker__tab" role="tab" aria-selected="true">Symbols</button>
    <button type="button" class="stilo-char-picker__tab" role="tab" aria-selected="false">Emoji</button>
  </div>
  <div class="stilo-char-picker__panel" role="tabpanel">
    <div class="stilo-char-picker__heading">Currency</div>
    <div class="stilo-char-picker__grid" role="group" aria-label="Currency">
      <button type="button" class="stilo-char-picker__char" title="Euro sign" aria-label="Euro sign"
        data-character="€" tabindex="-1">€</button>
      …
    </div>
    …
  </div>
</div>
```

- **Data**: `characters.ts` (`SYMBOLS`, `EMOJI`: categories of `[character, English name]`) is
  loaded with a dynamic `import()` on the first opening, so it is a separate chunk that an app
  downloads only when the picker is used. 254 symbols in 7 categories and 519 emoji in 8 categories,
  chosen by hand; no flags (Windows does not draw them). Names follow Unicode /
  CLDR and serve the tooltip, the accessible name and the search.
- **Opening**: the button gets `aria-haspopup="dialog"` and `aria-expanded`. Opening shows the
  last tab, clears the search and focuses the search field (`preventScroll`, as in §5.1).
  The button toggles it.
- **Inserting**: a click (or `Enter` / `Space` on a focused character) runs
  `insertText(character)` at the editor selection, with the marks active there; the picker
  **stays open** and keeps the focus on the character, so several characters go in a row.
- **Search**: filters both tabs by name (case-insensitive substring) or by the character
  itself; the tabs are hidden while searching; no match shows `characters.noResults`. Names are
  English only.
- **Keyboard**: `Tab` goes search → selected tab → grid (roving tabindex, one character
  tabbable). `ArrowDown` in the search field goes to the first character. On the tabs,
  `ArrowLeft` / `ArrowRight` switch tab. In the grids (10 columns, `COLUMNS` in the code and in
  `ui.css`), `ArrowLeft` / `ArrowRight` move in reading order across categories,
  `ArrowUp` / `ArrowDown` move by row, also into the previous / next category, keeping the
  column where possible.
- **Closing**: `Escape` and the button give the focus back to the editor; pointer down outside
  closes without moving the focus.
- The toolbar does not prevent `mousedown` inside the picker (its fields take the focus).

### 5.4 Color split button (T-026)

`createColorButton(editor, item, { container, messages })` (internal), created by the toolbar for
every `kind: 'color'` item; the popover is mounted in the toolbar (it scrolls with it). Text color
and highlight (SPEC F-208, F-209, F-804).

```html
<span class="stilo-split">
  <button type="button" class="stilo-toolbar__button stilo-split__main" data-item="textColor"
    aria-label="Text color" title="Text color" aria-pressed="false" tabindex="-1">
    <svg class="stilo-icon" aria-hidden="true">…Type…</svg>
    <span class="stilo-split__color" style="background-color: #000000"></span>
  </button>
  <button type="button" class="stilo-toolbar__button stilo-split__arrow" data-item="textColor"
    aria-label="Text color: more colors" title="Text color: more colors" aria-haspopup="dialog"
    aria-expanded="false" tabindex="-1">
    <svg class="stilo-icon" aria-hidden="true">…ChevronDown…</svg>
  </button>
</span>
<!-- appended to the toolbar element by createPopover -->
<div class="stilo-popover stilo-color-picker" role="dialog" aria-label="Text color" hidden>
  <div class="stilo-color-picker__actions">
    <button type="button" class="stilo-color-picker__none">No color</button>
    <!-- with defaultChoice only -->
    <span class="stilo-color-picker__separator" aria-hidden="true"></span>
    <button type="button" class="stilo-color-picker__default" aria-pressed="false">
      <mark>Default</mark></button>
  </div>
  <div class="stilo-color-picker__grid" role="group" aria-label="Text color">
    <button type="button" class="stilo-color-picker__swatch" aria-label="Black" title="Black"
      data-color="#000000" aria-pressed="false" tabindex="-1"
      style="background-color: #000000"></button>
    …
  </div>
  <form class="stilo-color-picker__custom">
    <input type="color" class="stilo-color-picker__native" aria-label="Pick a color">
    <input type="text" class="stilo-color-picker__value" aria-label="Custom color"
      placeholder="#000000" autocomplete="off" spellcheck="false">
    <button type="submit" class="stilo-color-picker__apply">Apply</button>
  </form>
</div>
```

- **Two items for the keyboard**: both parts are toolbar items (roving tabindex, §4.3) with the
  same `data-item`; they share `aria-disabled` (`isEnabled`).
- **Last used color**: starts as `defaultColor`, goes back to it with *No color*, and changes
  when a swatch, *Default* or a custom color is applied (read back with `getColor`, so it is the normalized value). It is shown by the bar
  under the icon (`Mark`, the browser's `<mark>` color, for `null`) and lives in the toolbar
  only (not saved).
- **Main part**: `hasColor(last)` → `unsetColor`, otherwise `setColor(last)`; `aria-pressed`
  and `--active` follow `hasColor(last)`. It closes the popover if open. No shortcut in the
  tooltip: `Mod-Shift-h` toggles a plain `<mark>`, not the last color.
- **Arrow**: toggles the popover. Opening marks the swatch of `getColor` with
  `aria-pressed="true"`, prefills the custom field with it (and the native picker when it is a
  `#rrggbb`), and focuses that swatch or the first one (`preventScroll`, as in §5.1).
- **Swatch** (click, `Enter`, `Space`): `setColor(color)`, close, `editor.focus()`. Arrow keys
  move in the grid (8 columns, `COLUMNS` in the code and in `ui.css`): left/right by one,
  up/down by a row, no wrapping.
- ***No color***: `unsetColor`, the last used color goes back to `defaultColor` (black text, plain
  `<mark>`), close, `editor.focus()`.
- ***Default*** (`defaultChoice`, the highlight only): `setColor(null)` (a plain `<mark>`, whose
  yellow is the browser's own style, so it differs slightly between browsers), remembered as the
  last color, close, `editor.focus()`. Its label is inside a real `<mark>`, so it shows that
  color. On opening it has `aria-pressed` = `hasColor(null)`, and the focus when it is pressed
  and no swatch is.
- **Custom color**: the native picker copies its value into the text field; *Apply* (or `Enter`)
  runs `setColor` with the trimmed text. When it returns `false` the field gets
  `aria-invalid="true"` and the focus; editing it removes the attribute. On success: close,
  `editor.focus()`.
- **Closing**: `Escape` closes and gives the focus to the editor; pointer down outside closes
  without moving the focus. The toolbar does not prevent `mousedown` inside the popover (its
  fields take the focus).

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
- Custom properties have their defaults in **one block at the top of `ui.css`**,
  `:where(:root) { … }` (T-027), and are read without fallbacks (`var(--stilo-color-border)`).
  `:where()` has no specificity: a host rule that sets a property, on `:root` or on any ancestor
  of the toolbar and the editor, wins whatever the order of the stylesheets. Components never
  declare them, which would block those overrides. `content.css` keeps its own fallbacks
  (`var(--stilo-color-border, #d1d9e0)`), because it is also used without `ui.css`.
- Visible focus: `:focus-visible` outline in `--stilo-color-focus`.

| Property | Default | Use |
|---|---|---|
| `--stilo-font-family` | `system-ui, sans-serif` | UI text |
| `--stilo-font-size` | `14px` | UI text |
| `--stilo-color-text` | `#1f2328` | Text and icons |
| `--stilo-color-muted` | `#59636e` | Shortcuts in menus |
| `--stilo-color-bg` | `#ffffff` | Popover and sticky container background |
| `--stilo-color-toolbar-bg` | `#f9fbfd` | Toolbar background: barely darker than the content, lighter than the hover, so that the eye sees where the toolbar ends |
| `--stilo-color-border` | `#d1d9e0` | Popover border, field borders |
| `--stilo-color-separator` | `#e4e8ec` | Group separators (lighter than the borders) |
| `--stilo-color-hover` | `#eef1f4` | Button / option hover |
| `--stilo-color-hover-group` | `#f5f7f9` | The part of a color split button that is not hovered (lighter than the hovered one) |
| `--stilo-color-active` | `#dde4ee` | Pressed button, checked option |
| `--stilo-color-focus` | `#0969da` | Focus ring, primary button |
| `--stilo-color-error` | `#d1242f` | Border of an invalid field |
| `--stilo-radius` | `6px` | Buttons, popover |
| `--stilo-toolbar-padding-y` | `4px` | Toolbar padding, top and bottom |
| `--stilo-toolbar-padding-x` | `2px` | Toolbar padding, left and right |
| `--stilo-toolbar-gap` | `2px` | Space between the items of a group |
| `--stilo-toolbar-group-gap` | `4px` | Space on each side of a group separator |
| `--stilo-toolbar-separator-height` | `18px` | Height of a group separator |
| `--stilo-toolbar-sticky-top` | `0` | Distance of the sticky toolbar from the top (e.g. a fixed page header) |
| `--stilo-z-toolbar` | `1001` | Sticky toolbar `z-index`: above the content and the popovers anchored to it |
| `--stilo-button-size` | `30px` | Button height and min width |
| `--stilo-icon-size` | `18px` | Icons |
| `--stilo-popover-shadow` | `0 8px 24px rgb(0 0 0 / 0.12)` | Popover |
| `--stilo-z-popover` | `1000` | Popover `z-index` |
| `--stilo-menu-h1-size` … `--stilo-menu-h6-size` | `1.5em`, `1.3em`, `1.15em`, `1em`, `1em`, `1em` | Heading preview |

Layout:

- Toolbar: flex row, wraps, `padding` `--stilo-toolbar-padding-y` `--stilo-toolbar-padding-x`,
  `gap` `--stilo-toolbar-group-gap`, background `--stilo-color-toolbar-bg`, no border (T-027:
  the editor's outer border is enough). The toolbar and the sticky container inherit their top
  corner radii (`border-top-*-radius: inherit`), so that a rounded editor box keeps its corners
  without `overflow` (which would cut the popovers). With `sticky: false` the container has no
  Stilo class: round it on the host side if needed.
  Groups: flex row with `gap` `--stilo-toolbar-gap`; every group after the first has
  `padding-left` `--stilo-toolbar-group-gap` and, as separator, a `::before` line 1px wide,
  `--stilo-toolbar-separator-height` high, vertically centered, in `--stilo-color-separator`.
- Sticky toolbar (option `sticky`, T-021): the class `stilo-toolbar-host` goes on `container`,
  not on the toolbar, because a sticky element only moves inside its parent. It has
  `position: sticky`, `top: --stilo-toolbar-sticky-top`, `z-index: --stilo-z-toolbar` and the
  `--stilo-color-bg` background. Pure CSS, no scroll listener: the browser sticks it to the
  nearest scrolling ancestor, so the toolbar follows the page when the editor flows in it and
  stays in place when only the editor content scrolls (the toolbar outside the scrolling
  element). An ancestor with `overflow: hidden` or `auto` between the container and the
  scrolling area stops it from sticking (a CSS limit). In the demo, `/demo/?fixed` shows the
  fixed-height layout.
  - The toolbar sets the view prop `scrollMargin` (top: container height + 5, other sides: 5,
    ProseMirror's default), updated by a `ResizeObserver` and removed on `destroy()`: the
    selection scrolled into view stays below the toolbar, and at the first line the scrolling
    area reaches its top (beyond the content padding).
  - Popovers anchored to the content (link popover, link bubble) pass under the stuck toolbar,
    as they do when the content scrolls in its own container; the toolbar's own menus stay
    above the content.
- Button: transparent background, no border, `--stilo-radius`, size `--stilo-button-size`,
  icon centered; hover → `--stilo-color-hover`; `--active` → `--stilo-color-active`;
  `[aria-disabled="true"]` → opacity 0.4, `cursor: default`, no hover color.
- Dropdown trigger: auto width, `min-width: 120px`, text left, chevron right.
- Popover host: `position: relative`. Popover: `position: absolute`, `top: 0`, `left: 0`,
  `width: max-content`, background, border, radius, shadow, `z-index`, `padding: 4px`.
  `.stilo-popover[hidden]` is `display: none`, so that a component class setting `display`
  (the link bubble is `flex`) never shows a closed popover.
- Option: flex row, label left, shortcut right in `--stilo-color-muted` at `0.85em`;
  hover/focus → `--stilo-color-hover`; checked → `--stilo-color-active`; disabled → opacity 0.4.
- Heading preview: `.stilo-dropdown__option--h<n> .stilo-dropdown__label` uses
  `--stilo-menu-h<n>-size` and `font-weight: 600`; the shortcut keeps the normal size.
- Link popover: 320px wide form; URL on its own row with border and radius, focus ring,
  `--stilo-color-error` border when invalid; checkbox label and actions on the second row;
  buttons with border and radius, the primary one filled with `--stilo-color-focus`.
- Character picker: column with search field (border, radius), tabs (selected one underlined in
  `--stilo-color-focus`), a panel up to 280px high that scrolls, muted category headings at
  `0.85em`, grids of 10 columns of 32px buttons with an 18px character, hover color as
  buttons.
- Color split button: the two parts touch (inner corners square); the main part stacks a 16px
  icon over a 16×4px color bar, the arrow is 20px wide with a 12px chevron. Hovering one part
  gives both `--stilo-color-hover-group`, and the hovered one `--stilo-color-hover` (a pressed or
  disabled part keeps its own look). Color popover:
  a row with *No color* and, for the highlight, *Default* (half the width each, centered text,
  a 1px separator in `--stilo-color-separator`, *Default* `--stilo-color-active`
  when pressed), a grid of 8 columns of 22px swatches (thin inner border so that
  white shows, slight zoom on hover, the pressed one outlined in `--stilo-color-text`), and a
  row with the native picker, the text field (`--stilo-color-error` border when invalid) and a
  primary *Apply* button.
- Link bubble: small and unobtrusive, icons only (no URL text; the URL is in the tooltip of the
  open button): `padding: 2px`, 24px buttons with 16px icons, toolbar button colors.

## 8. Later

- Tooltips: native `title` in M1; a Floating UI tooltip with an arrow and a light animation
  replaces it later (ADR 0002).
- `setEditable` emits no event: the toolbar does not reflect read-only mode yet (call
  `toolbar.update()` and handle it when the core gets an event).
- Link popover: inserting a new linked text at a cursor outside a link (today the button is
  disabled there); exporting `createLinkPopover` for custom toolbars.
