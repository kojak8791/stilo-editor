import type { Placement, VirtualElement } from '@floating-ui/dom';
import { autoUpdate, computePosition, hide, offset } from '@floating-ui/dom';
import type { IconNode } from 'lucide';
import { Grip, GripHorizontal, GripVertical } from 'lucide';
import type { Editor } from '../../index';
import type { MessageKey, Messages } from '../i18n/types';
import { createIcon } from './icon';
import { createPopover, type Popover } from './popover';
import { createTableActions, type TableAction, type TableActions } from './table-actions';

/** Options of {@link createTableHandles}. */
export interface TableHandlesOptions {
  /** The element the handles scroll with: the parent of the editable element. */
  container: HTMLElement;
  messages: Messages;
}

/** The handles of the row, the column and the table of the cell under the mouse or the cursor. */
export interface TableHandles {
  /** Shows, moves or hides the handles after the selection, the focus or the mouse changed. */
  update(): void;
  destroy(): void;
}

/** Distance in px between a handle and the table. */
const GAP = 4;
/** Distance in px from the table within which the mouse keeps the handles of the last cell. */
const NEAR = 32;

type HandleKind = 'row' | 'column' | 'table';

interface Handle {
  kind: HandleKind;
  button: HTMLButtonElement;
  anchor: VirtualElement;
  placement: Placement;
  actions: TableActions;
  popover: Popover;
  stopAutoUpdate?: () => void;
  generation: number;
}

const SPECS: ReadonlyArray<{
  kind: HandleKind;
  labelKey: MessageKey;
  icon: IconNode;
  placement: Placement;
  groups: ReadonlyArray<ReadonlyArray<TableAction>>;
}> = [
  {
    kind: 'row',
    labelKey: 'table.row',
    icon: GripVertical,
    placement: 'left',
    groups: [['addRowBefore', 'addRowAfter'], ['deleteRow']],
  },
  {
    kind: 'column',
    labelKey: 'table.column',
    icon: GripHorizontal,
    placement: 'top',
    groups: [['addColumnBefore', 'addColumnAfter'], ['deleteColumn']],
  },
  {
    kind: 'table',
    labelKey: 'toolbar.table',
    icon: Grip,
    placement: 'top-end',
    groups: [['mergeCells', 'splitCell'], ['deleteTable']],
  },
];

/** A rectangle for Floating UI. */
function rect(x: number, y: number, width: number, height: number) {
  return { x, y, width, height, left: x, top: y, right: x + width, bottom: y + height };
}

/** Creates the table handles, which follow the editor on their own. */
export function createTableHandles(editor: Editor, options: TableHandlesOptions): TableHandles {
  const { container, messages } = options;
  const { view } = editor;
  /** The cell whose handles show. */
  let cell: HTMLElement | null = null;
  /** The cell under the mouse (or the last one, while the mouse stays near its table). */
  let hovered: HTMLElement | null = null;

  /** The left edge of the table, inside its scrolling wrapper. */
  const tableLeft = (table: Element): number =>
    Math.max(
      table.getBoundingClientRect().left,
      table.parentElement?.getBoundingClientRect().left ?? Number.NEGATIVE_INFINITY,
    );

  /**
   * The anchor of a handle. Row and column: the cell stretched to the edge of the table, so that
   * `hide` hides the handle of a cell scrolled out of the table wrapper. Table: its corner.
   */
  function anchorRect(kind: HandleKind) {
    const table = cell?.closest('table');
    if (!cell || !table) return rect(0, 0, 0, 0);
    const box = cell.getBoundingClientRect();
    const top = table.getBoundingClientRect().top;
    const left = tableLeft(table);
    if (kind === 'row') return rect(left, box.top, Math.max(box.right - left, 0), box.height);
    if (kind === 'column') return rect(box.left, top, box.width, box.bottom - top);
    return rect(left - GAP, top, 0, 0);
  }

  const handles: Handle[] = SPECS.map(({ kind, labelKey, icon, placement, groups }) => {
    const label = messages[labelKey];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `stilo-table-handle stilo-table-handle--${kind}`;
    button.tabIndex = -1;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.hidden = true;
    button.append(createIcon(icon));
    container.append(button);

    const actions = createTableActions(editor, {
      groups,
      label,
      messages,
      close: () => popover.close(),
    });
    actions.element.classList.add('stilo-table-handle-menu');
    const popover = createPopover({
      anchor: button,
      content: actions.element,
      container,
      onClose: (reason) => {
        button.setAttribute('aria-expanded', 'false');
        if (reason === 'escape') editor.focus();
        update();
      },
    });
    const anchor: VirtualElement = {
      getBoundingClientRect: () => anchorRect(kind),
      get contextElement() {
        return cell ?? undefined;
      },
    };
    return { kind, button, anchor, placement, actions, popover, generation: 0 };
  });

  /** While a menu is open, its handle stays where it is. */
  const isFrozen = (): boolean => handles.some((handle) => handle.popover.isOpen);

  function position(handle: Handle): void {
    // Ignore results that arrive after the handle moved to another cell.
    const generation = ++handle.generation;
    Promise.resolve(
      computePosition(handle.anchor, handle.button, {
        strategy: 'absolute',
        placement: handle.placement,
        middleware: handle.kind === 'table' ? [offset(GAP)] : [offset(GAP), hide()],
      }).then(({ x, y, middlewareData }) => {
        if (handle.generation !== generation) return;
        handle.button.style.left = `${x}px`;
        handle.button.style.top = `${y}px`;
        handle.button.style.visibility = middlewareData.hide?.referenceHidden ? 'hidden' : '';
      }),
    );
  }

  /** The cell holding the head of the selection, or `null`. */
  function selectionCell(): HTMLElement | null {
    const { node, offset: index } = view.domAtPos(editor.state.selection.head);
    const child = node.childNodes[index];
    const element =
      child instanceof Element ? child : node instanceof Element ? node : node.parentElement;
    const found = element?.closest<HTMLElement>('td, th');
    return found && view.dom.contains(found) ? found : null;
  }

  function show(next: HTMLElement | null): void {
    if (next === cell) return;
    cell = next;
    for (const handle of handles) {
      handle.stopAutoUpdate?.();
      handle.stopAutoUpdate = undefined;
      handle.generation++;
      handle.button.hidden = !cell;
      if (cell) {
        handle.stopAutoUpdate = autoUpdate(handle.anchor, handle.button, () => position(handle));
      }
    }
  }

  function update(): void {
    if (isFrozen()) return;
    if (hovered && !hovered.isConnected) hovered = null;
    const cursor = view.hasFocus() ? selectionCell() : null;
    show(editor.isEditable ? (hovered ?? cursor) : null);
  }

  /** Whether the mouse is within {@link NEAR} px of the table of `element`. */
  function isNear(element: HTMLElement, event: MouseEvent): boolean {
    const box = element.closest('table')?.getBoundingClientRect();
    if (!box) return false;
    const { clientX: x, clientY: y } = event;
    return (
      x >= box.left - NEAR && x <= box.right + NEAR && y >= box.top - NEAR && y <= box.bottom + NEAR
    );
  }

  function open(handle: Handle): void {
    if (!cell) return;
    const table = cell.closest('table');
    const pos = view.posAtDOM(cell, 0);
    // The handles stay on this cell while the menu is open.
    hovered = cell;
    if (handle.kind === 'row') editor.commands.selectRow(pos);
    else if (handle.kind === 'column') editor.commands.selectColumn(pos);
    // The corner keeps a selection inside its table (cells to merge); otherwise the whole table.
    else if (selectionCell()?.closest('table') !== table) editor.commands.selectTable(pos);
    handle.popover.open();
    handle.button.setAttribute('aria-expanded', 'true');
    handle.actions.refresh();
    handle.actions.focusFirst();
  }

  const onMousemove = (event: MouseEvent): void => {
    const target = event.target as Element;
    if (isFrozen() || target.closest('.stilo-table-handle')) return;
    const over = target.closest<HTMLElement>('td, th');
    if (over && view.dom.contains(over)) hovered = over;
    else if (hovered && !isNear(hovered, event)) hovered = null;
    update();
  };
  const onMouseleave = (): void => {
    hovered = null;
    update();
  };
  // The editor keeps the focus and the selection while a handle is clicked.
  const onMousedown = (event: MouseEvent): void => {
    if ((event.target as Element).closest('.stilo-table-handle')) event.preventDefault();
  };
  const onClick = (event: MouseEvent): void => {
    const button = (event.target as Element).closest('.stilo-table-handle');
    const handle = handles.find((h) => h.button === button);
    if (!handle) return;
    if (handle.popover.isOpen) {
      handle.popover.close();
      editor.focus();
    } else {
      open(handle);
    }
  };

  container.addEventListener('mousemove', onMousemove);
  container.addEventListener('mouseleave', onMouseleave);
  container.addEventListener('mousedown', onMousedown);
  container.addEventListener('click', onClick);
  editor.on('transaction', update);
  editor.on('focus', update);
  editor.on('blur', update);

  function destroy(): void {
    container.removeEventListener('mousemove', onMousemove);
    container.removeEventListener('mouseleave', onMouseleave);
    container.removeEventListener('mousedown', onMousedown);
    container.removeEventListener('click', onClick);
    editor.off('transaction', update);
    editor.off('focus', update);
    editor.off('blur', update);
    // Closing an open menu updates the handles: hide them afterwards.
    for (const handle of handles) handle.popover.destroy();
    show(null);
    for (const handle of handles) {
      handle.actions.destroy();
      handle.button.remove();
    }
  }

  return { update, destroy };
}
