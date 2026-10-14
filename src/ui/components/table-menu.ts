import type { Editor } from '../../index';
import type { Messages } from '../i18n/types';
import { createPopover } from './popover';
import { createTableActions, type TableAction } from './table-actions';

/** Options of {@link createTableMenu}. */
export interface TableMenuOptions {
  /** The toolbar button that opens the menu. */
  anchor: HTMLElement;
  /** The element the menu scrolls with: the toolbar. */
  container: HTMLElement;
  messages: Messages;
}

/** The table menu: the insert grid outside a table, the table operations inside one. */
export interface TableMenu {
  readonly isOpen: boolean;
  open(): void;
  /** Closes the menu and gives the focus back to the editor. */
  close(): void;
  toggle(): void;
  destroy(): void;
}

/** Rows and columns of the insert grid: also `grid-template-columns` in ui.css. */
const GRID_ROWS = 8;
const GRID_COLUMNS = 10;

/** The operations of the toolbar menu, in groups. */
const ACTIONS: ReadonlyArray<ReadonlyArray<TableAction>> = [
  ['addRowBefore', 'addRowAfter', 'deleteRow'],
  ['addColumnBefore', 'addColumnAfter', 'deleteColumn'],
  ['mergeCells', 'splitCell'],
  ['toggleHeaderRow', 'toggleHeaderColumn'],
  ['deleteTable'],
];

/** Creates the table menu (closed), anchored to the toolbar button. */
export function createTableMenu(editor: Editor, options: TableMenuOptions): TableMenu {
  const { anchor, container, messages } = options;

  const content = document.createElement('div');
  content.className = 'stilo-table-menu';
  content.setAttribute('role', 'dialog');

  // Insert grid
  const picker = document.createElement('div');
  picker.className = 'stilo-table-menu__picker';
  const grid = document.createElement('div');
  grid.className = 'stilo-table-menu__grid';
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', messages['table.insert']);
  const cells: HTMLButtonElement[] = [];
  for (let row = 1; row <= GRID_ROWS; row++) {
    for (let column = 1; column <= GRID_COLUMNS; column++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'stilo-table-menu__cell';
      cell.tabIndex = -1;
      cell.dataset.rows = String(row);
      cell.dataset.columns = String(column);
      cell.setAttribute('aria-label', sizeLabel(row, column));
      cells.push(cell);
    }
  }
  grid.append(...cells);
  const size = document.createElement('div');
  size.className = 'stilo-table-menu__size';
  size.setAttribute('aria-hidden', 'true');
  const headerLabel = document.createElement('label');
  headerLabel.className = 'stilo-table-menu__header';
  const headerCheckbox = document.createElement('input');
  headerCheckbox.type = 'checkbox';
  headerCheckbox.checked = true;
  headerLabel.append(headerCheckbox, ` ${messages['table.headerRow']}`);
  picker.append(grid, size, headerLabel);

  // Operations
  const actions = createTableActions(editor, {
    groups: ACTIONS,
    label: messages['toolbar.table'],
    messages,
    close: () => popover.close(),
  });
  const menu = actions.element;

  content.append(picker, menu);

  anchor.setAttribute('aria-haspopup', 'dialog');
  anchor.setAttribute('aria-expanded', 'false');

  const popover = createPopover({
    anchor,
    content,
    container,
    onClose: (reason) => {
      anchor.setAttribute('aria-expanded', 'false');
      if (reason === 'escape') editor.focus();
    },
  });

  function sizeLabel(rows: number, columns: number): string {
    return messages['table.size']
      .replace('{rows}', String(rows))
      .replace('{columns}', String(columns));
  }

  /** Highlights the cells of a `rows` × `columns` table and focuses its last cell. */
  function highlight(rows: number, columns: number, focus: boolean): void {
    for (const cell of cells) {
      const inside = Number(cell.dataset.rows) <= rows && Number(cell.dataset.columns) <= columns;
      cell.classList.toggle('stilo-table-menu__cell--active', inside);
      cell.tabIndex = -1;
    }
    const target = cells[(rows - 1) * GRID_COLUMNS + columns - 1]!;
    target.tabIndex = 0;
    if (focus) target.focus({ preventScroll: true });
    size.textContent = sizeLabel(rows, columns);
  }

  function insert(cell: HTMLElement): void {
    const rows = Number(cell.dataset.rows);
    const cols = Number(cell.dataset.columns);
    popover.close();
    editor.focus();
    editor.commands.insertTable({ rows, cols, withHeaderRow: headerCheckbox.checked });
  }

  const cellOf = (target: EventTarget | null) =>
    (target as Element).closest<HTMLButtonElement>('.stilo-table-menu__cell');

  const onGridOver = (event: MouseEvent): void => {
    const cell = cellOf(event.target);
    if (cell) highlight(Number(cell.dataset.rows), Number(cell.dataset.columns), false);
  };

  const onGridClick = (event: MouseEvent): void => {
    const cell = cellOf(event.target);
    if (cell) insert(cell);
  };

  const onGridKeydown = (event: KeyboardEvent): void => {
    const cell = cellOf(event.target);
    if (!cell) return;
    let rows = Number(cell.dataset.rows);
    let columns = Number(cell.dataset.columns);
    if (event.key === 'ArrowDown') rows = Math.min(rows + 1, GRID_ROWS);
    else if (event.key === 'ArrowUp') rows = Math.max(rows - 1, 1);
    else if (event.key === 'ArrowRight') columns = Math.min(columns + 1, GRID_COLUMNS);
    else if (event.key === 'ArrowLeft') columns = Math.max(columns - 1, 1);
    else return;
    event.preventDefault();
    highlight(rows, columns, true);
  };

  grid.addEventListener('mouseover', onGridOver);
  grid.addEventListener('click', onGridClick);
  grid.addEventListener('keydown', onGridKeydown);

  function open(): void {
    if (popover.isOpen) return;
    const inTable = editor.isActive('table');
    picker.hidden = inTable;
    menu.hidden = !inTable;
    content.setAttribute(
      'aria-label',
      inTable ? messages['toolbar.table'] : messages['table.insert'],
    );
    popover.open();
    anchor.setAttribute('aria-expanded', 'true');
    if (inTable) {
      actions.refresh();
      actions.focusFirst();
    } else {
      highlight(1, 1, true);
    }
  }

  function close(): void {
    if (!popover.isOpen) return;
    popover.close();
    editor.focus();
  }

  function destroy(): void {
    grid.removeEventListener('mouseover', onGridOver);
    grid.removeEventListener('click', onGridClick);
    grid.removeEventListener('keydown', onGridKeydown);
    actions.destroy();
    popover.destroy();
    anchor.removeAttribute('aria-haspopup');
    anchor.removeAttribute('aria-expanded');
  }

  return {
    get isOpen() {
      return popover.isOpen;
    },
    open,
    close,
    toggle: () => (popover.isOpen ? close() : open()),
    destroy,
  };
}
