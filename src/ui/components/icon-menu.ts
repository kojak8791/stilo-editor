import { ChevronDown } from 'lucide';
import type { Editor } from '../../index';
import type { Messages } from '../i18n/types';
import type { ToolbarIconMenu } from '../toolbar/types';
import { createIcon } from './icon';
import { createPopover } from './popover';
import { formatShortcut } from './shortcut';

/** Options of {@link createIconMenu}. */
export interface IconMenuOptions {
  /** The element the menu scrolls with: the toolbar. */
  container: HTMLElement;
  messages: Messages;
  /** Whether shortcuts are shown with Mac symbols. */
  mac: boolean;
}

/** A button that shows the icon of the active option and opens the options in a row (T-039). */
export interface IconMenu {
  readonly trigger: HTMLButtonElement;
  /** Shows the active option and refreshes the enabled states. */
  update(): void;
  destroy(): void;
}

/** Creates the trigger of `item` and its menu (closed), mounted in `container`. */
export function createIconMenu(
  editor: Editor,
  item: ToolbarIconMenu,
  options: IconMenuOptions,
): IconMenu {
  const { container, messages, mac } = options;
  const label = messages[item.labelKey] ?? item.labelKey;
  const optionLabel = (labelKey: string, shortcut?: string): string => {
    const text = messages[labelKey] ?? labelKey;
    return shortcut ? `${text} (${formatShortcut(shortcut, mac)})` : text;
  };

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'stilo-toolbar__button stilo-icon-menu__trigger';
  trigger.dataset.item = item.id;
  trigger.tabIndex = -1;
  trigger.title = label;
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  const icons = item.options.map((option) => createIcon(option.icon));
  let shownIcon = icons[0]!;
  trigger.append(shownIcon, createIcon(ChevronDown));

  const menu = document.createElement('div');
  menu.className = 'stilo-icon-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', label);
  menu.setAttribute('aria-orientation', 'horizontal');
  const buttons = item.options.map((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `stilo-toolbar__button stilo-icon-menu__option stilo-icon-menu__option--${option.id}`;
    button.dataset.option = option.id;
    button.tabIndex = -1;
    button.setAttribute('role', 'menuitemradio');
    button.setAttribute('aria-checked', 'false');
    const text = optionLabel(option.labelKey, option.shortcut);
    button.setAttribute('aria-label', messages[option.labelKey] ?? option.labelKey);
    button.title = text;
    button.append(createIcon(option.icon));
    return button;
  });
  menu.append(...buttons);

  const popover = createPopover({
    anchor: trigger,
    content: menu,
    container,
    onClose: (reason) => {
      trigger.setAttribute('aria-expanded', 'false');
      if (reason === 'escape') trigger.focus();
    },
  });

  const enabled = (index: number): boolean => item.options[index]!.isEnabled?.(editor) ?? true;

  function update(): void {
    const active = item.options.findIndex((option) => option.isActive(editor));
    const shown = Math.max(active, 0);
    shownIcon.replaceWith(icons[shown]!);
    shownIcon = icons[shown]!;
    const activeLabel = messages[item.options[shown]!.labelKey] ?? item.options[shown]!.labelKey;
    trigger.setAttribute('aria-label', `${label}: ${activeLabel}`);
    buttons.forEach((button, i) => {
      button.setAttribute('aria-checked', String(i === active));
      button.classList.toggle('stilo-toolbar__button--active', i === active);
      if (enabled(i)) button.removeAttribute('aria-disabled');
      else button.setAttribute('aria-disabled', 'true');
    });
    if (item.options.some((_, i) => enabled(i))) trigger.removeAttribute('aria-disabled');
    else trigger.setAttribute('aria-disabled', 'true');
  }

  function focusOption(index: number): void {
    buttons[index]?.focus({ preventScroll: true });
  }

  function open(): void {
    if (popover.isOpen || trigger.getAttribute('aria-disabled') === 'true') return;
    popover.open();
    trigger.setAttribute('aria-expanded', 'true');
    const checked = buttons.findIndex((button) => button.getAttribute('aria-checked') === 'true');
    focusOption(Math.max(checked, 0));
  }

  function select(index: number): void {
    if (!enabled(index)) return;
    popover.close();
    editor.focus();
    item.options[index]!.run(editor);
  }

  const onTriggerClick = (): void => {
    if (popover.isOpen) popover.close();
    else open();
  };

  const onTriggerKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    open();
  };

  const onMenuClick = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>('.stilo-icon-menu__option');
    if (button) select(buttons.indexOf(button));
  };

  const onMenuKeydown = (event: KeyboardEvent): void => {
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index === -1) return;
    const last = buttons.length - 1;
    const targets: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const target = targets[event.key];
    if (target !== undefined) {
      event.preventDefault();
      focusOption(target);
    } else if (event.key === 'Tab') {
      popover.close();
    }
  };

  trigger.addEventListener('click', onTriggerClick);
  trigger.addEventListener('keydown', onTriggerKeydown);
  menu.addEventListener('click', onMenuClick);
  menu.addEventListener('keydown', onMenuKeydown);

  let isDestroyed = false;

  function destroy(): void {
    if (isDestroyed) return;
    isDestroyed = true;
    trigger.removeEventListener('click', onTriggerClick);
    trigger.removeEventListener('keydown', onTriggerKeydown);
    menu.removeEventListener('click', onMenuClick);
    menu.removeEventListener('keydown', onMenuKeydown);
    popover.destroy();
  }

  update();

  return { trigger, update, destroy };
}
