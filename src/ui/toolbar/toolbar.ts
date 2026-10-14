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
import { createLinkBubble } from '../components/link-bubble';
import { createLinkPopover } from '../components/link-popover';
import { formatShortcut, isMacPlatform } from '../components/shortcut';
import { createTableMenu } from '../components/table-menu';
import { en } from '../i18n/en';
import type { Messages } from '../i18n/types';
import { DEFAULT_ITEMS, DEFAULT_TOOLBAR } from './items';
import type { ToolbarButton, ToolbarContext, ToolbarItem } from './types';

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
  const { container, items = DEFAULT_TOOLBAR, messages = en, sticky = true } = options;
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

  for (const group of resolvedGroups) {
    const groupEl = document.createElement('div');
    groupEl.className = 'stilo-toolbar__group';
    groupEl.setAttribute('role', 'group');

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

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'stilo-toolbar__button';
        button.setAttribute('data-item', btnItem.id);
        button.setAttribute('aria-label', label);
        button.setAttribute('title', title);
        button.setAttribute('tabindex', '-1');

        // Toggle button: aria-pressed
        if (btnItem.isActive) {
          button.setAttribute('aria-pressed', 'false');
        }

        const icon = createIcon(btnItem.icon);
        button.appendChild(icon);

        groupEl.appendChild(button);
        itemElements.push(button);
        itemMap.set(button, btnItem);
      }
    }

    element.appendChild(groupEl);
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
  };

  container.appendChild(element);
  // The find bar floats under the toolbar, in the same (sticky) container.
  const findButton = element.querySelector<HTMLElement>('[data-item="find"]');
  const findBar =
    'setSearch' in editor.commands
      ? createFindBar(editor, { container, messages, button: findButton })
      : null;
  // Sticky on the container: a sticky element only moves inside its parent. ProseMirror scrolls
  // the selection into view without knowing that the toolbar covers the top: the scroll margin
  // keeps it below the toolbar (5 is ProseMirror's default margin).
  let resizeObserver: ResizeObserver | null = null;
  if (sticky) {
    container.classList.add('stilo-toolbar-host');
    const setScrollMargin = (): void => {
      const top = container.offsetHeight + 5;
      editor.view.setProps({ scrollMargin: { top, right: 5, bottom: 5, left: 5 } });
    };
    setScrollMargin();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(setScrollMargin);
      resizeObserver.observe(container);
    }
  }

  // State tracking
  let pendingFrame = 0;
  let isDestroyed = false;

  // Roving tabindex state
  let focusedIndex = 0;

  function setRovingFocus(index: number): void {
    itemElements.forEach((el, i) => {
      el.setAttribute('tabindex', i === index ? '0' : '-1');
    });
    focusedIndex = index;
  }

  setRovingFocus(0);

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
          const active = btnItem.isActive(editor);
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
  }

  // Initial update
  update();

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
    const btn = target.closest<HTMLElement>('[data-item]');
    if (!btn) return;

    const index = itemElements.indexOf(btn);
    if (index === -1 || (btn instanceof HTMLInputElement && movesCaret(e, btn))) return;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const next = (index + 1) % itemElements.length;
        setRovingFocus(next);
        itemElements[next]!.focus();
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prev = (index - 1 + itemElements.length) % itemElements.length;
        setRovingFocus(prev);
        itemElements[prev]!.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        setRovingFocus(0);
        itemElements[0]!.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        const last = itemElements.length - 1;
        setRovingFocus(last);
        itemElements[last]!.focus();
        break;
      }
      case 'Escape': {
        e.preventDefault();
        editor.focus();
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
      if (focusedIndex >= 0 && focusedIndex < itemElements.length) {
        itemElements[focusedIndex]!.focus();
      }
    }
  };
  editor.view.dom.addEventListener('keydown', onEditorKeydown);

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

    for (const ddInstance of dropdownMap.values()) {
      ddInstance.destroy();
    }
    for (const colorButton of colorButtons) colorButton.destroy();
    for (const fontSizeInput of fontSizeInputs) fontSizeInput.destroy();
    for (const iconMenu of iconMenus) iconMenu.destroy();
    linkPopover?.destroy();
    linkBubble?.destroy();
    characterPicker?.destroy();
    tableMenu?.destroy();
    findBar?.destroy();

    if (container.contains(element)) {
      container.removeChild(element);
    }
    if (sticky) {
      resizeObserver?.disconnect();
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
