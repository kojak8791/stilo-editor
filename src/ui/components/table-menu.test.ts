import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor, getHTMLWithSelection } from '../../../tests/helpers';
import { createToolbar } from '../index';

const TABLE = '<table><tr><td>a|</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>';

function setup(html = '<p>|</p>') {
  const editor = createTestEditor({ html });
  // jsdom has no layout: scrolling the selection into view needs coordsAtPos.
  vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 0 });
  document.body.append(editor.view.dom.parentElement!);
  const container = document.createElement('div');
  document.body.append(container);
  const toolbar = createToolbar(editor, { container });
  const button = toolbar.element.querySelector<HTMLButtonElement>('[data-item="table"]')!;
  const menu = toolbar.element.querySelector<HTMLElement>('.stilo-table-menu')!;
  const picker = menu.querySelector<HTMLElement>('.stilo-table-menu__picker')!;
  const actions = menu.querySelector<HTMLElement>('.stilo-table-menu__actions')!;
  const cell = (rows: number, columns: number) =>
    menu.querySelector<HTMLButtonElement>(`[data-rows="${rows}"][data-columns="${columns}"]`)!;
  const item = (command: string) =>
    menu.querySelector<HTMLElement>(`.stilo-table-menu__item--${command}`)!;
  return { editor, toolbar, button, menu, picker, actions, cell, item };
}

function press(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('table menu: insert grid', () => {
  it('is a closed dialog button', () => {
    const { button, menu } = setup();
    expect(button.getAttribute('title')).toBe('Table');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(menu.hidden).toBe(true);
  });

  it('opens the grid outside a table, the focus on the first cell', () => {
    const { button, menu, picker, actions, cell } = setup();
    button.click();
    expect(menu.hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(menu.getAttribute('aria-label')).toBe('Insert table');
    expect(picker.hidden).toBe(false);
    expect(actions.hidden).toBe(true);
    expect(document.activeElement).toBe(cell(1, 1));
    expect(menu.querySelectorAll('.stilo-table-menu__cell')).toHaveLength(80);
    expect(cell(2, 3).getAttribute('aria-label')).toBe('3 × 2');
  });

  it('highlights the size under the mouse and inserts it on click, with a header row', () => {
    const { editor, button, menu, cell } = setup();
    button.click();
    cell(2, 3).dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(menu.querySelectorAll('.stilo-table-menu__cell--active')).toHaveLength(6);
    expect(menu.querySelector('.stilo-table-menu__size')!.textContent).toBe('3 × 2');
    cell(2, 3).click();
    expect(menu.hidden).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(
      '<table><tbody><tr><th>|</th><th></th><th></th></tr><tr><td></td><td></td><td></td></tr>' +
        '</tbody></table><p></p>',
    );
  });

  it('moves with the arrow keys and inserts with Enter, without a header row', () => {
    const { editor, button, menu, cell } = setup();
    button.click();
    menu.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    press(cell(1, 1), 'ArrowRight');
    press(cell(1, 2), 'ArrowDown');
    press(cell(2, 2), 'ArrowUp');
    press(cell(1, 2), 'ArrowLeft');
    press(cell(1, 1), 'ArrowLeft');
    press(cell(1, 1), 'ArrowDown');
    expect(document.activeElement).toBe(cell(2, 1));
    cell(2, 1).click();
    expect(editor.getHTML()).toBe(
      '<table><tbody><tr><td></td></tr><tr><td></td></tr></tbody></table><p></p>',
    );
  });

  it('is disabled where a table cannot go', () => {
    const { button } = setup('<ul><li>a|</li></ul>');
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('table menu: operations', () => {
  it('opens the operations inside a table, with their states', () => {
    const { button, menu, picker, actions, item } = setup(TABLE);
    expect(button.hasAttribute('aria-disabled')).toBe(false);
    button.click();
    expect(menu.getAttribute('aria-label')).toBe('Table');
    expect(picker.hidden).toBe(true);
    expect(actions.hidden).toBe(false);
    expect(actions.getAttribute('role')).toBe('menu');
    expect(document.activeElement).toBe(item('addRowBefore'));
    expect(item('mergeCells').getAttribute('aria-disabled')).toBe('true');
    expect(item('splitCell').getAttribute('aria-disabled')).toBe('true');
    expect(item('deleteRow').hasAttribute('aria-disabled')).toBe(false);
    expect(item('toggleHeaderRow').getAttribute('role')).toBe('menuitemcheckbox');
    expect(item('toggleHeaderRow').getAttribute('aria-checked')).toBe('false');
    expect(item('toggleHeaderColumn').getAttribute('aria-checked')).toBe('false');
  });

  it('runs an operation on click and closes', () => {
    const { editor, button, menu, item } = setup(TABLE);
    button.click();
    item('toggleHeaderRow').click();
    expect(menu.hidden).toBe(true);
    expect(editor.getHTML()).toBe(
      '<table><tbody><tr><th>a</th><th>b</th></tr><tr><td>c</td><td>d</td></tr></tbody></table>',
    );
    button.click();
    expect(item('toggleHeaderRow').getAttribute('aria-checked')).toBe('true');
  });

  it('moves over the enabled items with the arrow keys and runs one with Enter', () => {
    const { editor, button, item } = setup(TABLE);
    button.click();
    press(item('addRowBefore'), 'ArrowUp');
    expect(document.activeElement).toBe(item('deleteTable'));
    press(item('deleteTable'), 'Home');
    press(item('addRowBefore'), 'ArrowDown');
    press(item('addRowAfter'), 'ArrowDown');
    expect(document.activeElement).toBe(item('deleteRow'));
    press(item('deleteRow'), 'Enter');
    expect(editor.getHTML()).toBe('<table><tbody><tr><td>c</td><td>d</td></tr></tbody></table>');
  });

  it('skips the disabled items', () => {
    const { button, item } = setup(TABLE);
    button.click();
    item('deleteColumn').focus();
    press(item('deleteColumn'), 'ArrowDown');
    expect(document.activeElement).toBe(item('toggleHeaderRow'));
  });

  it('closes with Escape and gives the focus to the editor', () => {
    const { editor, button, menu, item } = setup(TABLE);
    button.click();
    press(item('addRowBefore'), 'Escape');
    expect(menu.hidden).toBe(true);
    expect(editor.view.hasFocus()).toBe(true);
  });

  it('is removed by toolbar.destroy()', () => {
    const { toolbar, button } = setup();
    toolbar.destroy();
    expect(document.querySelector('.stilo-table-menu')).toBeNull();
    expect(button.hasAttribute('aria-haspopup')).toBe(false);
  });
});
