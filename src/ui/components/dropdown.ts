import { ChevronDown } from 'lucide';
import { createIcon } from './icon';
import { createPopover, type Popover } from './popover';

/** One option as displayed: label and shortcut already resolved and formatted. */
export interface DropdownOptionView {
  id: string;
  label: string;
  shortcut?: string;
}

export interface DropdownOptions {
  /** Accessible name of the trigger and of the menu; shown when no option is active. */
  label: string;
  options: DropdownOptionView[];
  /** The popover container (the toolbar element). */
  container: HTMLElement;
  onSelect(id: string): void;
}

export interface DropdownState {
  activeId: string | null;
  disabledIds: ReadonlySet<string>;
}

export interface Dropdown {
  /** The trigger button; the toolbar inserts it in its group. */
  readonly trigger: HTMLButtonElement;
  update(state: DropdownState): void;
  destroy(): void;
}

export function createDropdown(options: DropdownOptions): Dropdown {
  const { label, options: menuOptions, container, onSelect } = options;

  // Create the trigger button
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'stilo-toolbar__button stilo-dropdown__trigger';
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('title', label);
  trigger.setAttribute('tabindex', '-1');

  // Value span
  const valueSpan = document.createElement('span');
  valueSpan.className = 'stilo-dropdown__value';
  trigger.appendChild(valueSpan);

  // Chevron icon
  const chevron = createIcon(ChevronDown);
  trigger.appendChild(chevron);

  // Create the menu element
  const menu = document.createElement('div');
  menu.className = 'stilo-dropdown__menu stilo-popover';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', label);
  menu.setAttribute('hidden', '');

  // Create option elements
  const optionElements: HTMLElement[] = [];
  for (const opt of menuOptions) {
    const el = document.createElement('div');
    el.className = `stilo-dropdown__option stilo-dropdown__option--${opt.id}`;
    el.setAttribute('role', 'menuitemradio');
    el.setAttribute('tabindex', '-1');
    el.setAttribute('data-option', opt.id);
    el.setAttribute('aria-checked', 'false');

    const labelSpan = document.createElement('span');
    labelSpan.className = 'stilo-dropdown__label';
    labelSpan.textContent = opt.label;
    el.appendChild(labelSpan);

    if (opt.shortcut) {
      const shortcutSpan = document.createElement('span');
      shortcutSpan.className = 'stilo-dropdown__shortcut';
      shortcutSpan.textContent = opt.shortcut;
      el.appendChild(shortcutSpan);
    }

    optionElements.push(el);
    menu.appendChild(el);
  }

  // Popover
  let popover: Popover | undefined;

  // Append menu to container immediately so it exists in the DOM from creation
  container.appendChild(menu);

  function open(): void {
    if (popover) return;
    popover = createPopover({
      anchor: trigger,
      content: menu,
      container,
      onClose(reason) {
        if (reason === 'escape') {
          trigger.focus();
        }
        trigger.setAttribute('aria-expanded', 'false');
        popover = undefined;
      },
    });
    trigger.setAttribute('aria-expanded', 'true');
    popover.open();

    // Focus the checked option or the first enabled one
    const checkedIndex = optionElements.findIndex(
      (el) => el.getAttribute('aria-checked') === 'true',
    );
    if (checkedIndex >= 0) {
      optionElements[checkedIndex]!.focus();
    } else {
      const firstEnabled = optionElements.findIndex(
        (el) => el.getAttribute('aria-disabled') !== 'true',
      );
      if (firstEnabled >= 0) {
        optionElements[firstEnabled]!.focus();
      }
    }
  }

  function close(): void {
    if (!popover) return;
    popover.close();
    trigger.setAttribute('aria-expanded', 'false');
  }

  // Trigger click handler
  function onTriggerClick(): void {
    if (trigger.getAttribute('aria-disabled') === 'true') return;
    if (popover) {
      close();
      return;
    }
    open();
  }
  trigger.addEventListener('click', onTriggerClick);

  // Trigger keydown handler
  function onTriggerKeydown(e: KeyboardEvent): void {
    if (trigger.getAttribute('aria-disabled') === 'true') return;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        open();
        // Focus first enabled option
        const firstEnabled = optionElements.findIndex(
          (el) => el.getAttribute('aria-disabled') !== 'true',
        );
        if (firstEnabled >= 0) {
          optionElements[firstEnabled]!.focus();
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        open();
        // Focus last enabled option
        for (let i = optionElements.length - 1; i >= 0; i--) {
          if (optionElements[i]!.getAttribute('aria-disabled') !== 'true') {
            optionElements[i]!.focus();
            break;
          }
        }
        break;
      }
    }
  }
  trigger.addEventListener('keydown', onTriggerKeydown);

  // Menu keydown handler
  function onMenuKeydown(e: KeyboardEvent): void {
    const currentTarget = document.activeElement;
    if (!currentTarget || !menu.contains(currentTarget)) return;

    const enabledOptions = optionElements.filter(
      (el) => el.getAttribute('aria-disabled') !== 'true',
    );
    const currentIndex = enabledOptions.indexOf(currentTarget as HTMLElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % enabledOptions.length;
        enabledOptions[nextIndex]!.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + enabledOptions.length) % enabledOptions.length;
        enabledOptions[prevIndex]!.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        enabledOptions[0]!.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        enabledOptions[enabledOptions.length - 1]!.focus();
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (currentTarget === document.activeElement && currentTarget !== trigger) {
          const optionId = currentTarget.getAttribute('data-option');
          if (optionId && currentTarget.getAttribute('aria-disabled') !== 'true') {
            onSelect(optionId);
            close();
          }
        }
        break;
      }
      case ' ': {
        e.preventDefault();
        if (currentTarget === document.activeElement && currentTarget !== trigger) {
          const optionId = currentTarget.getAttribute('data-option');
          if (optionId && currentTarget.getAttribute('aria-disabled') !== 'true') {
            onSelect(optionId);
          }
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        close();
        trigger.focus();
        break;
      }
      case 'Tab': {
        close();
        break;
      }
    }
  }
  menu.addEventListener('keydown', onMenuKeydown);

  // Option click handlers
  for (const el of optionElements) {
    const onClick = (): void => {
      const optionId = el.getAttribute('data-option');
      if (optionId && el.getAttribute('aria-disabled') !== 'true') {
        onSelect(optionId);
        close();
      }
    };
    el.addEventListener('click', onClick);
  }

  let isDestroyed = false;

  function update(state: DropdownState): void {
    const { activeId, disabledIds } = state;

    // Update trigger
    const activeOption = menuOptions.find((opt) => opt.id === activeId);
    const displayedLabel = activeOption?.label ?? label;
    valueSpan.textContent = displayedLabel;
    trigger.setAttribute('aria-label', `${label}: ${displayedLabel}`);

    const allDisabled = disabledIds.size === menuOptions.length;
    if (allDisabled) {
      trigger.setAttribute('aria-disabled', 'true');
    } else {
      trigger.removeAttribute('aria-disabled');
    }

    // Update options
    for (const el of optionElements) {
      const id = el.getAttribute('data-option')!;
      const disabled = disabledIds.has(id);
      if (disabled) {
        el.setAttribute('aria-disabled', 'true');
      } else {
        el.removeAttribute('aria-disabled');
      }
      el.setAttribute('aria-checked', id === activeId ? 'true' : 'false');
    }
  }

  function destroy(): void {
    if (isDestroyed) return;
    isDestroyed = true;
    popover?.destroy();
    popover = undefined;
    trigger.removeEventListener('click', onTriggerClick);
    trigger.removeEventListener('keydown', onTriggerKeydown);
    menu.removeEventListener('keydown', onMenuKeydown);
  }

  return {
    get trigger() {
      return trigger;
    },
    update,
    destroy,
  };
}
