import { CellSelection } from 'prosemirror-tables';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor } from '../../../tests/helpers';
import { defaultExtensions } from '../../index';
import { createToolbar } from '../index';

const TABLE = '<table><tr><td>a|</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table><p>x</p>';

function setup(html = TABLE) {
  const editor = createTestEditor({ html });
  // jsdom has no layout: scrolling the selection into view needs coordsAtPos.
  vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 0 });
  // Column resizing looks for a cell border under the mouse.
  vi.spyOn(editor.view, 'posAtCoords').mockReturnValue(null);
  const host = editor.view.dom.parentElement!;
  document.body.append(host);
  const container = document.createElement('div');
  document.body.append(container);
  const toolbar = createToolbar(editor, { container });
  const handle = (kind: string) =>
    host.querySelector<HTMLButtonElement>(`.stilo-table-handle--${kind}`)!;
  const cell = (text: string) =>
    [...editor.view.dom.querySelectorAll<HTMLElement>('td, th')].find(
      (td) => td.textContent === text,
    )!;
  const menu = () => host.querySelector<HTMLElement>('.stilo-table-handle-menu:not([hidden])');
  return { editor, toolbar, host, handle, cell, menu };
}

function mouse(target: Element, type: string, clientX = 0, clientY = 0): void {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY }));
}

/** The text of the selected cells, or '' without a cell selection. */
function selected(editor: ReturnType<typeof createTestEditor>): string {
  const { selection } = editor.state;
  if (!(selection instanceof CellSelection)) return '';
  const texts: string[] = [];
  selection.forEachCell((node) => texts.push(node.textContent));
  return texts.join(',');
}

const isShown = (button: HTMLElement) => !button.hidden;

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('table handles', () => {
  it('are three hidden menu buttons over the editor', () => {
    const { host, handle } = setup();
    const labels = ['row', 'column', 'table'].map((kind) => {
      const button = handle(kind);
      expect(button.parentElement).toBe(host);
      expect(button.hidden).toBe(true);
      expect(button.tabIndex).toBe(-1);
      expect(button.getAttribute('aria-haspopup')).toBe('menu');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(button.querySelector('svg')).not.toBeNull();
      return button.getAttribute('aria-label');
    });
    expect(labels).toEqual(['Row', 'Column', 'Table']);
  });

  it('show for the cell with the cursor while the editor has the focus', () => {
    const { editor, handle } = setup();
    editor.focus();
    expect(isShown(handle('row'))).toBe(true);
    expect(isShown(handle('column'))).toBe(true);
    expect(isShown(handle('table'))).toBe(true);
    editor.view.dom.blur();
    expect(isShown(handle('row'))).toBe(false);
  });

  it('hide with the cursor outside a table', () => {
    const { editor, handle } = setup(`${TABLE.replace('|', '')}<p>y|</p>`);
    editor.focus();
    expect(isShown(handle('row'))).toBe(false);
  });

  it('show for the cell under the mouse, until the mouse goes away from the table', () => {
    const { editor, host, handle, cell } = setup(TABLE.replace('|', ''));
    mouse(cell('d'), 'mousemove');
    expect(isShown(handle('row'))).toBe(true);
    // Near the table (jsdom: every box at 0, 0): the handles stay.
    mouse(editor.view.dom, 'mousemove', 10, 10);
    expect(isShown(handle('row'))).toBe(true);
    mouse(editor.view.dom, 'mousemove', 500, 500);
    expect(isShown(handle('row'))).toBe(false);
    mouse(cell('d'), 'mousemove');
    host.dispatchEvent(new MouseEvent('mouseleave'));
    expect(isShown(handle('row'))).toBe(false);
  });

  it('hide in a read-only editor', () => {
    const { editor, handle, cell } = setup();
    editor.setEditable(false);
    mouse(cell('d'), 'mousemove');
    expect(isShown(handle('row'))).toBe(false);
  });

  it('keep the focus in the editor on mouse down', () => {
    const { handle, cell } = setup();
    mouse(cell('d'), 'mousemove');
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    handle('row').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('table handles: menus', () => {
  const items = (menu: HTMLElement | null) =>
    [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])].map((item) => item.textContent);

  it('row: selects the row and opens its menu, focused on the first item', () => {
    const { editor, handle, cell, menu } = setup();
    mouse(cell('d'), 'mousemove');
    handle('row').click();
    expect(selected(editor)).toBe('c,d');
    expect(handle('row').getAttribute('aria-expanded')).toBe('true');
    expect(menu()?.getAttribute('role')).toBe('menu');
    expect(menu()?.getAttribute('aria-label')).toBe('Row');
    expect(items(menu())).toEqual(['Insert row above', 'Insert row below', 'Delete row']);
    expect(document.activeElement?.textContent).toBe('Insert row above');
  });

  it('row: runs an operation on the row of the handle', () => {
    const { editor, handle, cell, menu } = setup();
    mouse(cell('d'), 'mousemove');
    handle('row').click();
    (document.activeElement as HTMLElement).click();
    expect(menu()).toBeNull();
    expect(editor.getHTML()).toBe(
      '<table><tbody><tr><td>a</td><td>b</td></tr><tr><td></td><td></td></tr>' +
        '<tr><td>c</td><td>d</td></tr></tbody></table><p>x</p>',
    );
  });

  it('column: selects the column; delete removes it', () => {
    const { editor, handle, cell, menu } = setup();
    mouse(cell('b'), 'mousemove');
    handle('column').click();
    expect(selected(editor)).toBe('b,d');
    expect(items(menu())).toEqual(['Insert column left', 'Insert column right', 'Delete column']);
    menu()!.querySelector<HTMLElement>('.stilo-table-menu__item--deleteColumn')!.click();
    expect(editor.getHTML()).toBe(
      '<table><tbody><tr><td>a</td></tr><tr><td>c</td></tr></tbody></table><p>x</p>',
    );
  });

  it('corner: selects the whole table when the selection is outside it', () => {
    const { editor, handle, cell, menu } = setup(`${TABLE.replace('|', '')}<p>y|</p>`);
    mouse(cell('a'), 'mousemove');
    handle('table').click();
    expect(selected(editor)).toBe('a,b,c,d');
    expect(menu()?.getAttribute('aria-label')).toBe('Table');
    expect(items(menu())).toEqual(['Merge cells', 'Split cell', 'Delete table']);
    menu()!.querySelector<HTMLElement>('.stilo-table-menu__item--deleteTable')!.click();
    expect(editor.getHTML()).toBe('<p>x</p><p>y</p>');
  });

  it('corner: keeps the cells selected in its table, to merge them', () => {
    const { editor, handle, cell, menu } = setup();
    editor.commands.selectRow();
    mouse(cell('d'), 'mousemove');
    handle('table').click();
    expect(selected(editor)).toBe('a,b');
    const merge = menu()!.querySelector<HTMLElement>('.stilo-table-menu__item--mergeCells')!;
    expect(merge.getAttribute('aria-disabled')).toBeNull();
    merge.click();
    expect(editor.getHTML()).toBe(
      '<table><tbody><tr><td colspan="2"><p>a</p><p>b</p></td></tr>' +
        '<tr><td>c</td><td>d</td></tr></tbody></table><p>x</p>',
    );
  });

  it('disables the operations that cannot run', () => {
    const { handle, cell, menu } = setup('<table><tr><td>a|</td></tr></table>');
    mouse(cell('a'), 'mousemove');
    handle('row').click();
    const deleteRow = menu()!.querySelector('.stilo-table-menu__item--deleteRow')!;
    expect(deleteRow.getAttribute('aria-disabled')).toBe('true');
  });

  it('keeps the handles in place while the menu is open', () => {
    const { handle, cell } = setup();
    mouse(cell('d'), 'mousemove');
    handle('row').click();
    mouse(cell('a'), 'mousemove', 500, 500);
    expect(isShown(handle('row'))).toBe(true);
    expect(handle('row').getAttribute('aria-expanded')).toBe('true');
  });

  it('closes on Escape and on a second click, giving the focus back to the editor', () => {
    const { editor, handle, cell, menu } = setup();
    mouse(cell('d'), 'mousemove');
    handle('row').click();
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(menu()).toBeNull();
    expect(handle('row').getAttribute('aria-expanded')).toBe('false');
    expect(editor.view.hasFocus()).toBe(true);
    handle('row').click();
    handle('row').click();
    expect(menu()).toBeNull();
    expect(editor.view.hasFocus()).toBe(true);
  });

  it('are removed by toolbar.destroy()', () => {
    const { toolbar, host, handle, cell } = setup();
    mouse(cell('d'), 'mousemove');
    handle('row').click();
    toolbar.destroy();
    expect(host.querySelector('.stilo-table-handle')).toBeNull();
    expect(host.querySelector('.stilo-table-handle-menu')).toBeNull();
  });

  it('do not exist without the Table extension', () => {
    const editor = createTestEditor({
      html: '<p>a</p>',
      extensions: [defaultExtensions({ table: false })],
    });
    const host = editor.view.dom.parentElement!;
    createToolbar(editor, { container: document.createElement('div') });
    expect(host.querySelector('.stilo-table-handle')).toBeNull();
  });
});
