import type { IconNode } from 'lucide';
import { ChevronLeft, Ellipsis } from 'lucide';
import type { Editor } from '../../index';
import { StiloError } from '../../index';
import { createCharacterPicker } from '../components/character-picker';
import { type ColorButton, createColorButton } from '../components/color-button';
import type { Dropdown as DropdownInstance, DropdownOptionView } from '../components/dropdown';
import { createDropdown } from '../components/dropdown';
import { createFindBar } from '../components/find-bar';
import { createFontSizeInput, type FontSizeInput } from '../components/font-size-input';
import { createIcon } from '../components/icon';
import { createIconMenu, type IconMenu } from '../components/icon-menu';
import { createImageButton } from '../components/image-button';
import { createImageDialog } from '../components/image-dialog';
import { createLinkBubble } from '../components/link-bubble';
import { createLinkPopover } from '../components/link-popover';
import { formatShortcut, isMacPlatform } from '../components/shortcut';
import { createTableHandles } from '../components/table-handles';
import { createTableMenu } from '../components/table-menu';
import { en } from '../i18n/en';
import type { Messages } from '../i18n/types';
import { DEFAULT_COMPACT_TOOLBAR, DEFAULT_ITEMS, DEFAULT_TOOLBAR } from './items';
import type {
  CompactToolbar,
  CompactToolbarGroup,
  ToolbarButton,
  ToolbarContext,
  ToolbarItem,
} from './types';

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
  /**
   * `'full'`: every group, in rows that wrap; `'compact'`: the two levels of `compact`; `'auto'`:
   * compact while `container` is narrower than `compactBelow`. Default: `'full'`. T-072.
   */
  layout?: 'full' | 'compact' | 'auto';
  /**
   * The compact layout. Default: DEFAULT_COMPACT_TOOLBAR with the default `items`; with other
   * `items`, the groups of up to two buttons on the first row and a button for every other group.
   */
  compact?: CompactToolbar;
  /** Width of `container` in px under which the `'auto'` layout is compact. Default: 600. */
  compactBelow?: number;
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

/** Resolves an item from a string ID or a custom item object. */
function resolveItem(item: string | ToolbarItem, editor: Editor): ToolbarItem | undefined {
  if (typeof item === 'string') {
    const resolved = DEFAULT_ITEMS[item];
    if (!resolved) {
      throw new StiloError(`Toolbar: unknown item "${item}"`);
    }
    if (resolved.isAvailable && !resolved.isAvailable(editor)) {
      return undefined;
    }
    return resolved;
  }
  if (item.isAvailable && !item.isAvailable(editor)) {
    return undefined;
  }
  return item;
}

/** The nearest element that holds both `container` and the editor: it goes to full screen. */
function fullscreenBox(container: HTMLElement, editor: Editor): HTMLElement {
  let box: HTMLElement | null = container;
  while (box && !box.contains(editor.view.dom)) box = box.parentElement;
  return box ?? container;
}

/**
 * Puts `box` in the browser's top layer, over everything of the page whatever its z-index, or
 * takes it out. Browsers without the Popover API keep it in the page: `--stilo-z-fullscreen`.
 */
function setTopLayer(box: HTMLElement, on: boolean): void {
  if (!('showPopover' in box)) return;
  if (on) {
    box.setAttribute('popover', 'manual');
    box.showPopover();
  } else {
    box.hidePopover();
    box.removeAttribute('popover');
  }
}

/** The scroll position of an element. */
interface ScrollPosition {
  element: Element;
  top: number;
  left: number;
}

/** The ancestors of `element` that are scrolled, with their positions. */
function scrollPositions(element: HTMLElement): ScrollPosition[] {
  const positions: ScrollPosition[] = [];
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (node.scrollTop || node.scrollLeft) {
      positions.push({ element: node, top: node.scrollTop, left: node.scrollLeft });
    }
  }
  return positions;
}

/** The compact layout of custom `items`: short groups of buttons stay, the others get a button. */
function deriveCompact(groups: ReadonlyArray<ReadonlyArray<ToolbarItem>>): CompactToolbar {
  const layout: Array<Array<string | CompactToolbarGroup>> = [];
  let buttons: CompactToolbarGroup[] | null = null;
  groups.forEach((group, index) => {
    const ids = group.map((item) => item.id);
    if (group.length <= 2 && group.every((item) => item.kind === 'button')) {
      layout.push(ids);
      buttons = null;
      return;
    }
    const first = group[0]!;
    const icon = ('icon' in first && first.icon) || Ellipsis;
    if (!buttons) {
      buttons = [];
      layout.push(buttons);
    }
    buttons.push({ id: `group${index}`, icon, labelKey: first.labelKey, items: [ids] });
  });
  return layout;
}

/** A toolbar button with an icon, its label as accessible name and `title`. */
function createButton(icon: IconNode, label: string, title = label): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'stilo-toolbar__button';
  button.setAttribute('aria-label', label);
  button.setAttribute('title', title);
  button.setAttribute('tabindex', '-1');
  button.appendChild(createIcon(icon));
  return button;
}

/** A `role="group"` element of the toolbar. */
function createGroup(): HTMLElement {
  const group = document.createElement('div');
  group.className = 'stilo-toolbar__group';
  group.setAttribute('role', 'group');
  return group;
}

/** A row of the compact toolbar. */
function createRow(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'stilo-toolbar__row';
  return row;
}

/** A group element and the elements it holds in one layout. */
interface Slot {
  element: HTMLElement;
  children: HTMLElement[];
}

/** A group button of the compact toolbar and the row it opens. */
interface GroupView {
  button: HTMLButtonElement;
  back: HTMLButtonElement;
  row: HTMLElement;
}

/** Whether `event` moves the caret in `input`: arrows leave the field only at its ends. */
function movesCaret(event: KeyboardEvent, input: HTMLInputElement): boolean {
  const { selectionStart, selectionEnd, value } = input;
  switch (event.key) {
    case 'Home':
    case 'End':
      return true;
    case 'ArrowLeft':
      return selectionStart !== 0 || selectionEnd !== 0;
    case 'ArrowRight':
      return selectionStart !== value.length || selectionEnd !== value.length;
    default:
      return false;
  }
}

/** Creates the toolbar element and buttons, and registers event handlers. */
export function createToolbar(editor: Editor, options: ToolbarOptions): Toolbar {
  const {
    container,
    items = DEFAULT_TOOLBAR,
    messages = en,
    sticky = true,
    layout = 'full',
    compactBelow = 600,
  } = options;
  const mac = isMacPlatform();

  // Resolve all items, keeping one group per original group
  const resolvedGroups: Array<Array<ToolbarItem>> = [];
  for (const group of items) {
    const resolved: ToolbarItem[] = [];
    for (const item of group) {
      const resolvedItem = resolveItem(item, editor);
      if (resolvedItem) resolved.push(resolvedItem);
    }
    if (resolved.length > 0) resolvedGroups.push(resolved);
  }

  // Build the DOM
  const element = document.createElement('div');
  element.className = 'stilo-toolbar';
  element.setAttribute('role', 'toolbar');
  element.setAttribute('aria-label', messages?.['toolbar.label'] ?? 'Formatting');
  element.setAttribute('aria-orientation', 'horizontal');

  // Collect all item elements for roving tabindex
  const itemElements: HTMLElement[] = [];
  const itemMap = new Map<HTMLElement, ToolbarItem>();
  const dropdownMap = new Map<string, DropdownInstance>();
  const colorButtons: ColorButton[] = [];
  const fontSizeInputs: FontSizeInput[] = [];
  const iconMenus: IconMenu[] = [];

  // The element of every item by ID, and the groups of the full layout
  const roots = new Map<string, HTMLElement>();
  const fullSlots: Slot[] = [];

  for (const group of resolvedGroups) {
    const groupEl = createGroup();

    for (const item of group) {
      if (item.kind === 'dropdown') {
        const dd = item;
        const optionViews: DropdownOptionView[] = dd.options.map((opt) => {
          const label = messages[opt.labelKey] ?? opt.labelKey;
          const shortcut = opt.shortcut ? formatShortcut(opt.shortcut, mac) : undefined;
          return { id: opt.id, label, shortcut, fontFamily: opt.fontFamily, action: !opt.isActive };
        });

        const ddInstance = createDropdown({
          label: messages[dd.labelKey] ?? dd.labelKey,
          options: optionViews,
          icon: dd.icon,
          container: element,
          onSelect: (id: string) => {
            const option = dd.options.find((o) => o.id === id);
            if (option) {
              option.run(editor);
              editor.focus();
            }
          },
        });

        // Set data-item on the trigger (the spec says this comes from the toolbar)
        ddInstance.trigger.setAttribute('data-item', dd.id);

        groupEl.appendChild(ddInstance.trigger);

        // Store the trigger in itemElements for roving tabindex
        itemElements.push(ddInstance.trigger);
        itemMap.set(ddInstance.trigger, dd);
        dropdownMap.set(dd.id, ddInstance);
      } else if (item.kind === 'iconMenu') {
        const iconMenu = createIconMenu(editor, item, { container: element, messages, mac });
        groupEl.appendChild(iconMenu.trigger);
        itemElements.push(iconMenu.trigger);
        itemMap.set(iconMenu.trigger, item);
        iconMenus.push(iconMenu);
      } else if (item.kind === 'fontSize') {
        const fontSizeInput = createFontSizeInput(editor, item, { container: element, messages });
        groupEl.appendChild(fontSizeInput.element);
        for (const part of fontSizeInput.parts) {
          itemElements.push(part);
          itemMap.set(part, item);
        }
        fontSizeInputs.push(fontSizeInput);
      } else if (item.kind === 'color') {
        // The split button handles its own clicks; its popover scrolls with the toolbar.
        const colorButton = createColorButton(editor, item, { container: element, messages });
        groupEl.appendChild(colorButton.element);
        for (const part of [colorButton.main, colorButton.arrow]) {
          itemElements.push(part);
          itemMap.set(part, item);
        }
        colorButtons.push(colorButton);
      } else {
        const btnItem = item;
        const label = messages[btnItem.labelKey] ?? btnItem.labelKey;
        const hasShortcut = btnItem.shortcut !== undefined;
        const title = hasShortcut ? `${label} (${formatShortcut(btnItem.shortcut!, mac)})` : label;

        const button = createButton(btnItem.icon, label, title);
        button.setAttribute('data-item', btnItem.id);

        // Toggle button: aria-pressed
        if (btnItem.isActive) {
          button.setAttribute('aria-pressed', 'false');
        }

        groupEl.appendChild(button);
        itemElements.push(button);
        itemMap.set(button, btnItem);
      }
    }

    element.appendChild(groupEl);
    const children = [...groupEl.children] as HTMLElement[];
    for (const [index, item] of group.entries()) roots.set(item.id, children[index]!);
    fullSlots.push({ element: groupEl, children });
  }

  // The compact layout: a first row, and a row per group button that opens in its place
  const fullTops = fullSlots.map((slot) => slot.element);
  const compactSlots: Slot[] = [];
  const views: GroupView[] = [];
  const mainRow = createRow();
  const compactTops = [mainRow];
  const known = new Set(items.flat().map((item) => (typeof item === 'string' ? item : item.id)));
  function fillRow(
    row: HTMLElement,
    groups: ReadonlyArray<ReadonlyArray<string | CompactToolbarGroup | HTMLElement>>,
  ): void {
    for (const group of groups) {
      const children: HTMLElement[] = [];
      for (const entry of group) {
        if (entry instanceof HTMLElement) {
          children.push(entry);
        } else if (typeof entry !== 'string') {
          const view = createGroupView(entry);
          if (view) children.push(view.button);
        } else if (!known.has(entry)) {
          throw new StiloError(`Toolbar: compact item "${entry}" is not in items`);
        } else {
          const root = roots.get(entry);
          if (root) children.push(root);
        }
      }
      if (children.length === 0) continue;
      const slot = { element: createGroup(), children };
      compactSlots.push(slot);
      row.appendChild(slot.element);
    }
  }
  // A group whose items are all unavailable is not shown.
  function createGroupView(group: CompactToolbarGroup): GroupView | null {
    const row = createRow();
    const back = createButton(ChevronLeft, messages['toolbar.back'] ?? 'Back');
    back.setAttribute('data-back', '');
    fillRow(row, [[back], ...group.items]);
    if (row.childElementCount < 2) return null;
    const button = createButton(group.icon, messages[group.labelKey] ?? group.labelKey);
    button.setAttribute('data-group', group.id);
    row.hidden = true;
    const view = { button, back, row };
    views.push(view);
    compactTops.push(row);
    return view;
  }
  if (layout !== 'full') {
    const defaultCompact = items === DEFAULT_TOOLBAR ? DEFAULT_COMPACT_TOOLBAR : null;
    fillRow(mainRow, options.compact ?? defaultCompact ?? deriveCompact(resolvedGroups));
  }
  const navigable = new Set<HTMLElement>(itemElements);
  for (const view of views) {
    navigable.add(view.button);
    navigable.add(view.back);
  }

  // One link popover and link bubble per toolbar, mounted next to the editable element so that
  // they scroll with the content. The popover opens with the link button, Mod-k in the editor
  // and the edit button of the bubble.
  const editorHost = editor.view.dom.parentElement ?? element;
  const linkPopover =
    'setLink' in editor.commands
      ? createLinkPopover(editor, { container: editorHost, messages })
      : null;
  const linkBubble = linkPopover
    ? createLinkBubble(editor, {
        container: editorHost,
        messages,
        onEdit: () => linkPopover.open(),
      })
    : null;
  // The table handles float over the editor too: tables clip what overflows them.
  const tableHandles =
    'selectRow' in editor.commands
      ? createTableHandles(editor, { container: editorHost, messages })
      : null;
  // The image dialog and the edit button of images float over the editor too.
  const imageDialog =
    'insertFigure' in editor.commands
      ? createImageDialog(editor, { container: editorHost, messages })
      : null;
  const imageButton = imageDialog
    ? createImageButton(editor, {
        container: editorHost,
        messages,
        onEdit: () => imageDialog.open(),
      })
    : null;
  // The character picker hangs from its button and scrolls with the toolbar.
  const charactersButton = element.querySelector<HTMLElement>('[data-item="characters"]');
  const characterPicker = charactersButton
    ? createCharacterPicker(editor, { anchor: charactersButton, container: element, messages })
    : null;
  // The table menu hangs from its button too.
  const tableButton = element.querySelector<HTMLElement>('[data-item="table"]');
  const tableMenu = tableButton
    ? createTableMenu(editor, { anchor: tableButton, container: element, messages })
    : null;
  const context: ToolbarContext = {
    openLinkPopover: () => linkPopover?.open(),
    toggleCharacterPicker: () => characterPicker?.toggle(),
    toggleFindBar: () => findBar?.toggle(),
    toggleTableMenu: () => tableMenu?.toggle(),
    openImageDialog: () => imageDialog?.open(),
    toggleFullscreen: () => setFullscreen(fullscreen === null),
    isFullscreen: () => fullscreen !== null,
  };
  // The element in full screen (`null` outside full screen) and the scroll positions of its
  // ancestors: out of the flow, it shortens the page, which scrolls back to the top.
  let fullscreen: HTMLElement | null = null;
  let scrolled: ScrollPosition[] = [];
  function setFullscreen(on: boolean): void {
    if (on === (fullscreen !== null)) return;
    if (on) {
      fullscreen = fullscreenBox(container, editor);
      scrolled = scrollPositions(fullscreen);
    }
    fullscreen?.classList.toggle('stilo-fullscreen', on);
    editorHost.classList.toggle('stilo-fullscreen__editor', on);
    // The page under it does not scroll and shows no scrollbar.
    editorHost.ownerDocument.documentElement.classList.toggle('stilo-fullscreen-page', on);
    if (fullscreen) setTopLayer(fullscreen, on);
    if (!on) {
      fullscreen = null;
      for (const { element, top, left } of scrolled) {
        element.scrollTop = top;
        element.scrollLeft = left;
      }
    }
    if (sticky) setScrollMargin();
    update();
  }

  container.appendChild(element);
  // The find bar floats under the toolbar, in the same (sticky) container.
  const findButton = element.querySelector<HTMLElement>('[data-item="find"]');
  const findBar =
    'setSearch' in editor.commands
      ? createFindBar(editor, { container, messages, button: findButton })
      : null;
  // Sticky on the container: a sticky element only moves inside its parent. ProseMirror scrolls
  // the selection into view without knowing that the toolbar covers the top: the scroll margin
  // keeps it below the toolbar (5 is ProseMirror's default margin). In full screen the editor's
  // element scrolls under the toolbar, which covers nothing.
  let resizeObserver: ResizeObserver | null = null;
  function setScrollMargin(): void {
    const top = (fullscreen ? 0 : container.offsetHeight) + 5;
    editor.view.setProps({ scrollMargin: { top, right: 5, bottom: 5, left: 5 } });
  }
  // The 'auto' layout follows the width of the container; 0 = not laid out.
  function onResize(): void {
    if (sticky) setScrollMargin();
    const width = container.clientWidth;
    if (layout === 'auto' && width > 0) setCompact(width < compactBelow);
  }
  if (sticky) {
    container.classList.add('stilo-toolbar-host');
    setScrollMargin();
  }
  if ((sticky || layout === 'auto') && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
  }

  // State tracking
  let pendingFrame = 0;
  let isDestroyed = false;

  // Roving tabindex state: `nav` holds the items of the shown layout or row, in order
  let focusedIndex = 0;
  let nav: HTMLElement[] = itemElements;

  function setRovingFocus(index: number): void {
    for (const el of navigable) el.setAttribute('tabindex', '-1');
    nav[index]?.setAttribute('tabindex', '0');
    focusedIndex = index;
  }

  setRovingFocus(0);

  // Compact layout state: the group open in place of the first row (`null`: the first row)
  let compact = false;
  let openView: GroupView | null = null;

  // Shows a row of the compact layout; the focus follows when it is in the toolbar.
  function showRow(view: GroupView | null): void {
    const previous = openView;
    const focused = element.contains(element.ownerDocument.activeElement);
    openView = view;
    mainRow.hidden = view !== null;
    for (const other of views) other.row.hidden = other !== view;
    const row = view?.row ?? mainRow;
    const selector = '[data-item], [data-group], [data-back]';
    nav = [...row.querySelectorAll<HTMLElement>(selector)].filter((el) => navigable.has(el));
    // An open group focuses its first item, the back button focuses the group button.
    const target = view ? (nav[1] ?? nav[0]) : previous?.button;
    setRovingFocus(Math.max(0, target ? nav.indexOf(target) : 0));
    if (focused) nav[focusedIndex]?.focus();
  }

  // Moves the item elements between the full and the compact layout.
  function setCompact(on: boolean): void {
    if (on === compact) return;
    compact = on;
    for (const top of on ? fullTops : compactTops) top.remove();
    for (const slot of on ? compactSlots : fullSlots) slot.element.append(...slot.children);
    element.prepend(...(on ? compactTops : fullTops));
    element.classList.toggle('stilo-toolbar--compact', on);
    if (on) {
      showRow(null);
    } else {
      openView = null;
      nav = itemElements;
      setRovingFocus(0);
    }
    update();
  }

  // Update function: refresh active/enabled states
  function update(): void {
    for (const colorButton of colorButtons) colorButton.update();
    for (const fontSizeInput of fontSizeInputs) fontSizeInput.update();
    for (const iconMenu of iconMenus) iconMenu.update();
    for (const el of itemElements) {
      const item = itemMap.get(el);
      if (!item || item.kind === 'color' || item.kind === 'fontSize' || item.kind === 'iconMenu') {
        continue;
      }

      if (item.kind === 'dropdown') {
        // Update dropdown
        const dd = item;
        let activeId: string | null = null;
        const disabledIds = new Set<string>();

        for (const opt of dd.options) {
          const isActive = opt.isActive?.(editor) ?? false;
          if (opt.isEnabled !== undefined && !opt.isEnabled(editor)) {
            disabledIds.add(opt.id);
          }
          if (isActive && activeId === null) {
            activeId = opt.id;
          }
        }

        const ddInstance = dropdownMap.get(dd.id);
        const valueLabel = activeId === null ? (dd.getValueLabel?.(editor) ?? null) : null;
        ddInstance?.update({ activeId, disabledIds, valueLabel });
      } else {
        // Update button
        const btn = el as HTMLButtonElement;
        const btnItem = item as ToolbarButton;

        if (btnItem.isActive) {
          const active = btnItem.isActive(editor, context);
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
          if (active) {
            btn.classList.add('stilo-toolbar__button--active');
          } else {
            btn.classList.remove('stilo-toolbar__button--active');
          }
        } else {
          btn.removeAttribute('aria-pressed');
          btn.classList.remove('stilo-toolbar__button--active');
        }

        if (btnItem.isEnabled) {
          if (btnItem.isEnabled(editor)) {
            btn.removeAttribute('aria-disabled');
          } else {
            btn.setAttribute('aria-disabled', 'true');
          }
        } else {
          btn.removeAttribute('aria-disabled');
        }
      }
    }
    // A group button is marked while one of its items is pressed.
    if (!compact) return;
    for (const view of views) {
      const pressed = view.row.querySelector('[aria-pressed="true"]') !== null;
      view.button.classList.toggle('stilo-toolbar__button--marked', pressed);
    }
  }

  // Initial update
  update();
  if (layout === 'compact') setCompact(true);
  if (layout === 'auto') onResize();

  // Transaction handler: schedule update with rAF
  const onTransaction = (): void => {
    if (isDestroyed) return;
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      if (isDestroyed) return;
      pendingFrame = 0;
      update();
    });
  };

  editor.on('transaction', onTransaction);

  // mousedown on toolbar: preventDefault to keep editor focus, except in the character and color
  // pickers, whose fields and buttons take the focus.
  const onToolbarMousedown = (e: MouseEvent): void => {
    const fields = '.stilo-char-picker, .stilo-color-picker, .stilo-font-size__input';
    if (isDestroyed || (e.target as Element).closest(fields)) {
      return;
    }
    e.preventDefault();
  };
  element.addEventListener('mousedown', onToolbarMousedown);

  // click on buttons: run the command and focus editor
  const onButtonClick = (e: Event): void => {
    if (isDestroyed) return;
    const target = e.target as HTMLElement;
    const opener = target.closest<HTMLElement>('[data-group], [data-back]');
    if (opener) {
      showRow(views.find((view) => view.button === opener) ?? null);
      return;
    }
    const btn = target.closest<HTMLElement>('[data-item]');
    if (!btn) return;

    // Find the corresponding resolved item
    const item = itemMap.get(btn);
    if (!item) return;
    if (item.kind !== 'button') return;
    if (item.isEnabled && !item.isEnabled(editor)) return;
    editor.focus();
    item.run(editor, context);
  };
  element.addEventListener('click', onButtonClick);

  // keydown on toolbar: roving tabindex + Escape
  const onToolbarKeydown = (e: KeyboardEvent): void => {
    if (isDestroyed) return;
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLElement>('[data-item], [data-group], [data-back]');
    if (!btn) return;

    const index = nav.indexOf(btn);
    if (index === -1 || (btn instanceof HTMLInputElement && movesCaret(e, btn))) return;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const next = (index + 1) % nav.length;
        setRovingFocus(next);
        nav[next]!.focus();
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prev = (index - 1 + nav.length) % nav.length;
        setRovingFocus(prev);
        nav[prev]!.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        setRovingFocus(0);
        nav[0]!.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        const last = nav.length - 1;
        setRovingFocus(last);
        nav[last]!.focus();
        break;
      }
      case 'Escape': {
        // An open group goes back to the first row first.
        e.preventDefault();
        if (openView) showRow(null);
        else editor.focus();
        break;
      }
    }
  };
  element.addEventListener('keydown', onToolbarKeydown);

  // Alt-F10 on editor view.dom: focus toolbar; Mod-k: open the link popover; Mod-f: the find bar
  const onEditorKeydown = (e: KeyboardEvent): void => {
    if (isDestroyed) return;
    const mod = mac ? e.metaKey : e.ctrlKey;
    if (linkPopover && mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      linkPopover.open();
      return;
    }
    if (findBar && mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      findBar.open();
      return;
    }
    if (e.key === 'F10' && e.altKey) {
      e.preventDefault();
      editor.focus();
      if (focusedIndex >= 0 && focusedIndex < nav.length) {
        nav[focusedIndex]!.focus();
      }
    }
  };
  editor.view.dom.addEventListener('keydown', onEditorKeydown);

  // Escape in the editor leaves full screen, unless an open popover took it first (capture on
  // the document) and prevented its default. Capture here too: ProseMirror prevents the default
  // of every Escape.
  const onEditorEscape = (e: KeyboardEvent): void => {
    if (isDestroyed || fullscreen === null || e.key !== 'Escape' || e.defaultPrevented) return;
    e.preventDefault();
    setFullscreen(false);
  };
  editor.view.dom.addEventListener('keydown', onEditorEscape, true);

  // Editor destroy: destroy toolbar
  const onEditorDestroy = (): void => {
    destroy();
  };
  editor.on('destroy', onEditorDestroy);

  // Destroy function
  function destroy(): void {
    if (isDestroyed) return;
    isDestroyed = true;

    if (pendingFrame) {
      cancelAnimationFrame(pendingFrame);
      pendingFrame = 0;
    }

    editor.off('transaction', onTransaction);
    editor.off('destroy', onEditorDestroy);
    element.removeEventListener('mousedown', onToolbarMousedown);
    element.removeEventListener('click', onButtonClick);
    element.removeEventListener('keydown', onToolbarKeydown);
    editor.view.dom.removeEventListener('keydown', onEditorKeydown);
    editor.view.dom.removeEventListener('keydown', onEditorEscape, true);
    setFullscreen(false);

    for (const ddInstance of dropdownMap.values()) {
      ddInstance.destroy();
    }
    for (const colorButton of colorButtons) colorButton.destroy();
    for (const fontSizeInput of fontSizeInputs) fontSizeInput.destroy();
    for (const iconMenu of iconMenus) iconMenu.destroy();
    linkPopover?.destroy();
    linkBubble?.destroy();
    tableHandles?.destroy();
    imageDialog?.destroy();
    imageButton?.destroy();
    characterPicker?.destroy();
    tableMenu?.destroy();
    findBar?.destroy();

    if (container.contains(element)) {
      container.removeChild(element);
    }
    resizeObserver?.disconnect();
    if (sticky) {
      container.classList.remove('stilo-toolbar-host');
      editor.view.setProps({ scrollMargin: undefined });
    }
  }

  return {
    get element() {
      return element;
    },
    update,
    destroy,
  };
}
