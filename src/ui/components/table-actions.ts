import type { Editor } from '../../index';
import { getTableHeaders } from '../../index';
import type { MessageKey, Messages } from '../i18n/types';

/** A table operation: the command of the same name, `toggleHeader*` for the header toggles. */
export type TableAction =
  | 'addRowBefore'
  | 'addRowAfter'
  | 'deleteRow'
  | 'addColumnBefore'
  | 'addColumnAfter'
  | 'deleteColumn'
  | 'mergeCells'
  | 'splitCell'
  | 'toggleHeaderRow'
  | 'toggleHeaderColumn'
  | 'deleteTable';

const LABELS: Record<TableAction, MessageKey> = {
  addRowBefore: 'table.addRowBefore',
  addRowAfter: 'table.addRowAfter',
  deleteRow: 'table.deleteRow',
  addColumnBefore: 'table.addColumnBefore',
  addColumnAfter: 'table.addColumnAfter',
  deleteColumn: 'table.deleteColumn',
  mergeCells: 'table.mergeCells',
  splitCell: 'table.splitCell',
  toggleHeaderRow: 'table.headerRow',
  toggleHeaderColumn: 'table.headerColumn',
  deleteTable: 'table.deleteTable',
};

/** Options of {@link createTableActions}. */
export interface TableActionsOptions {
  /** The operations, in groups divided by a separator. */
  groups: ReadonlyArray<ReadonlyArray<TableAction>>;
  /** The accessible name of the menu. */
  label: string;
  messages: Messages;
  /** Closes the popover holding the menu (`Tab`, and before an operation runs). */
  close(): void;
}

/** A `role="menu"` of table operations, for a popover. */
export interface TableActions {
  readonly element: HTMLElement;
  /** Enables the items whose command can run and checks the header toggles. */
  refresh(): void;
  /** Focuses the first enabled item. */
  focusFirst(): void;
  destroy(): void;
}

/** Creates a menu of table operations; an item runs its command on the selection. */
export function createTableActions(editor: Editor, options: TableActionsOptions): TableActions {
  const { groups, label, messages, close } = options;

  const element = document.createElement('div');
  element.className = 'stilo-table-menu__actions';
  element.setAttribute('role', 'menu');
  element.setAttribute('aria-label', label);
  const items = new Map<HTMLElement, TableAction>();
  groups.forEach((group, index) => {
    if (index > 0) {
      const separator = document.createElement('div');
      separator.className = 'stilo-table-menu__separator';
      separator.setAttribute('role', 'separator');
      element.append(separator);
    }
    for (const action of group) {
      const item = document.createElement('div');
      item.className = `stilo-dropdown__option stilo-table-menu__item--${action}`;
      item.tabIndex = -1;
      const isToggle = action === 'toggleHeaderRow' || action === 'toggleHeaderColumn';
      item.setAttribute('role', isToggle ? 'menuitemcheckbox' : 'menuitem');
      item.textContent = messages[LABELS[action]];
      items.set(item, action);
      element.append(item);
    }
  });

  const enabledItems = (): HTMLElement[] =>
    [...items.keys()].filter((item) => item.getAttribute('aria-disabled') !== 'true');

  function refresh(): void {
    const headers = getTableHeaders(editor);
    for (const [item, action] of items) {
      const enabled = editor.commands[action].can();
      if (enabled) item.removeAttribute('aria-disabled');
      else item.setAttribute('aria-disabled', 'true');
      if (action === 'toggleHeaderRow') item.setAttribute('aria-checked', String(!!headers?.row));
      if (action === 'toggleHeaderColumn')
        item.setAttribute('aria-checked', String(!!headers?.column));
    }
  }

  function run(item: HTMLElement): void {
    const action = items.get(item);
    if (!action || item.getAttribute('aria-disabled') === 'true') return;
    close();
    editor.focus();
    editor.commands[action]();
  }

  const onClick = (event: MouseEvent): void => {
    const item = (event.target as Element).closest<HTMLElement>('[role^="menuitem"]');
    if (item) run(item);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    const enabled = enabledItems();
    const index = enabled.indexOf(event.target as HTMLElement);
    let next: HTMLElement | undefined;
    switch (event.key) {
      case 'ArrowDown':
        next = enabled[(index + 1) % enabled.length];
        break;
      case 'ArrowUp':
        next = enabled[(index - 1 + enabled.length) % enabled.length];
        break;
      case 'Home':
        next = enabled[0];
        break;
      case 'End':
        next = enabled.at(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        run(event.target as HTMLElement);
        return;
      case 'Tab':
        close();
        return;
      default:
        return;
    }
    event.preventDefault();
    next?.focus();
  };

  element.addEventListener('click', onClick);
  element.addEventListener('keydown', onKeydown);

  return {
    element,
    refresh,
    // The position of a popover arrives asynchronously: a scrolling focus would jump.
    focusFirst: () => enabledItems()[0]?.focus({ preventScroll: true }),
    destroy() {
      element.removeEventListener('click', onClick);
      element.removeEventListener('keydown', onKeydown);
    },
  };
}
