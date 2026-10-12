import type { Editor } from '../../index';
import { StiloError } from '../../index';
import { createIcon } from '../components/icon';
import { formatShortcut, isMacPlatform } from '../components/shortcut';
import { en } from '../i18n/en';
import type { Messages } from '../i18n/types';
import { DEFAULT_ITEMS, DEFAULT_TOOLBAR } from './items';
import type { ToolbarButton, ToolbarItem } from './types';

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

/** Resolves an item from a string ID or a custom item object. */
function resolveItem(item: string | ToolbarItem, editor: Editor): ToolbarButton | undefined {
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

/** Creates the toolbar element and buttons, and registers event handlers. */
export function createToolbar(editor: Editor, options: ToolbarOptions): Toolbar {
  const { container, items = DEFAULT_TOOLBAR, messages = en } = options;

  // Resolve all items
  const resolvedItems: Array<{ group: ToolbarButton[] }> = [];
  for (const group of items) {
    const resolved: ToolbarButton[] = [];
    for (const item of group) {
      const button = resolveItem(item, editor);
      if (button) resolved.push(button);
    }
    if (resolved.length > 0) resolvedItems.push({ group: resolved });
  }

  // Build the DOM
  const element = document.createElement('div');
  element.className = 'stilo-toolbar';
  element.setAttribute('role', 'toolbar');
  element.setAttribute('aria-label', messages?.['toolbar.label'] ?? 'Formatting');
  element.setAttribute('aria-orientation', 'horizontal');

  const buttonElements: HTMLButtonElement[] = [];
  const allButtons: ToolbarButton[] = [];

  const groupsContainer = document.createElement('div');
  groupsContainer.className = 'stilo-toolbar__groups';

  for (const { group } of resolvedItems) {
    const groupEl = document.createElement('div');
    groupEl.className = 'stilo-toolbar__group';
    groupEl.setAttribute('role', 'group');

    for (const item of group) {
      const label = messages[item.labelKey] ?? item.labelKey;
      const hasShortcut = item.shortcut !== undefined;
      const mac = isMacPlatform();
      const title = hasShortcut ? `${label} (${formatShortcut(item.shortcut!, mac)})` : label;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stilo-toolbar__button';
      button.setAttribute('data-item', item.id);
      button.setAttribute('aria-label', label);
      button.setAttribute('title', title);
      button.setAttribute('tabindex', '-1');

      // Toggle button: aria-pressed
      if (item.isActive) {
        button.setAttribute('aria-pressed', 'false');
      }

      const icon = createIcon(item.icon);
      button.appendChild(icon);

      groupEl.appendChild(button);
      buttonElements.push(button);
      allButtons.push(item);
    }

    groupsContainer.appendChild(groupEl);
  }

  element.appendChild(groupsContainer);

  container.appendChild(element);

  // State tracking
  let pendingFrame = 0;
  let isDestroyed = false;

  // Roving tabindex state
  let focusedIndex = 0;

  function setRovingFocus(index: number): void {
    buttonElements.forEach((btn, i) => {
      btn.setAttribute('tabindex', i === index ? '0' : '-1');
    });
    focusedIndex = index;
  }

  setRovingFocus(0);

  // Update function: refresh active/enabled states
  function update(): void {
    for (let i = 0; i < allButtons.length; i++) {
      const item = allButtons[i]!;
      const btn = buttonElements[i]!;

      // isActive
      if (item.isActive) {
        const active = item.isActive(editor);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (active) {
          btn.classList.add('stilo-toolbar__button--active');
        } else {
          btn.classList.remove('stilo-toolbar__button--active');
        }
      } else {
        // Non-toggle buttons: no aria-pressed
        btn.removeAttribute('aria-pressed');
        btn.classList.remove('stilo-toolbar__button--active');
      }

      // isEnabled
      if (item.isEnabled) {
        const enabled = item.isEnabled(editor);
        if (enabled) {
          btn.removeAttribute('aria-disabled');
        } else {
          btn.setAttribute('aria-disabled', 'true');
        }
      } else {
        btn.removeAttribute('aria-disabled');
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

  // mousedown on toolbar: preventDefault to keep editor focus
  const onToolbarMousedown = (e: MouseEvent): void => {
    if (isDestroyed) return;
    e.preventDefault();
  };
  element.addEventListener('mousedown', onToolbarMousedown);

  // click on buttons: run the command and focus editor
  const onButtonClick = (e: Event): void => {
    if (isDestroyed) return;
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>('[data-item]');
    if (!btn) return;
    const index = buttonElements.indexOf(btn);
    if (index === -1) return;
    const item = allButtons[index]!;
    if (item.isEnabled === undefined || item.isEnabled(editor)) {
      item.run(editor);
      editor.focus();
    }
  };
  element.addEventListener('click', onButtonClick);

  // keydown on toolbar: roving tabindex + Escape
  const onToolbarKeydown = (e: KeyboardEvent): void => {
    if (isDestroyed) return;
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>('[data-item]');
    if (!btn) return;

    const index = buttonElements.indexOf(btn);
    if (index === -1) return;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const next = (index + 1) % buttonElements.length;
        setRovingFocus(next);
        buttonElements[next]!.focus();
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (index === 0) {
          // Wrap from first to last
          setRovingFocus(buttonElements.length - 1);
          buttonElements[buttonElements.length - 1]!.focus();
        } else if (index < buttonElements.length - 1) {
          const prev = index - 1;
          setRovingFocus(prev);
          buttonElements[prev]!.focus();
        }
        break;
      }
      case 'Home': {
        e.preventDefault();
        setRovingFocus(0);
        buttonElements[0]!.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        const last = buttonElements.length - 1;
        setRovingFocus(last);
        buttonElements[last]!.focus();
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

  // Alt-F10 on editor view.dom: focus toolbar
  const onEditorKeydown = (e: KeyboardEvent): void => {
    if (isDestroyed) return;
    if (e.key === 'F10' && e.altKey) {
      e.preventDefault();
      editor.focus();
      if (focusedIndex >= 0 && focusedIndex < buttonElements.length) {
        buttonElements[focusedIndex]!.focus();
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

    if (container.contains(element)) {
      container.removeChild(element);
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
