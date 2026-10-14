import { NodeSelection } from 'prosemirror-state';
import { CellSelection } from 'prosemirror-tables';
import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey } from '../../../tests/helpers';
import { Editor } from '../../core/editor';
import { defaultExtensions } from '../default-extensions';
import { getTableHeaders } from '.';

const T = (rows: string) => `<table><tbody>${rows}</tbody></table>`;

/** Selects the cells from the `anchor`-th to the `head`-th cell of the document. */
function selectCells(editor: Editor, anchor: number, head: number): void {
  const cells: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.spec.tableRole?.endsWith('cell')) cells.push(pos);
  });
  const { doc, tr } = editor.state;
  editor.view.dispatch(tr.setSelection(CellSelection.create(doc, cells[anchor]!, cells[head]!)));
}

describe('Table: parse and serialize', () => {
  it.each([
    ['<table><tr><td>a</td><td>b</td></tr></table>', T('<tr><td>a</td><td>b</td></tr>')],
    [
      '<table><thead><tr><th>h</th></tr></thead><tbody><tr><td>a</td></tr></tbody>' +
        '<tfoot><tr><td>f</td></tr></tfoot></table>',
      T('<tr><th>h</th></tr><tr><td>a</td></tr><tr><td>f</td></tr>'),
    ],
    [
      '<table><tr><td colspan="2">a</td></tr><tr><td rowspan="2">b</td><td>c</td></tr>' +
        '<tr><td>d</td></tr></table>',
      T(
        '<tr><td colspan="2">a</td></tr><tr><td rowspan="2">b</td><td>c</td></tr><tr><td>d</td></tr>',
      ),
    ],
    ['<table><tr><td colspan="x">a</td></tr></table>', T('<tr><td>a</td></tr>')],
    [
      '<table><tr><td data-colwidth="120">a</td><td>b</td></tr></table>',
      '<table><colgroup><col style="width: 120px"><col></colgroup><tbody><tr>' +
        '<td data-colwidth="120">a</td><td>b</td></tr></tbody></table>',
    ],
    [
      '<table><tr><td colspan="2" data-colwidth="100,50">a</td></tr></table>',
      '<table><colgroup><col style="width: 100px"><col style="width: 50px"></colgroup><tbody>' +
        '<tr><td colspan="2" data-colwidth="100,50">a</td></tr></tbody></table>',
    ],
    ['<table><tr><td data-colwidth="100,50">a</td></tr></table>', T('<tr><td>a</td></tr>')],
    ['<table><tr><td data-colwidth="0">a</td></tr></table>', T('<tr><td>a</td></tr>')],
    ['<table><tr><td data-colwidth="1em">a</td></tr></table>', T('<tr><td>a</td></tr>')],
    [
      '<table><colgroup><col style="width: 50px"></colgroup><tr><td>a</td></tr></table>',
      T('<tr><td>a</td></tr>'),
    ],
    ['<table><tr><td><p>a</p></td></tr></table>', T('<tr><td>a</td></tr>')],
    ['<table><tr><td><p>a</p><p>b</p></td></tr></table>', T('<tr><td><p>a</p><p>b</p></td></tr>')],
    [
      '<table><tr><td><p style="text-align: center">a</p></td></tr></table>',
      T('<tr><td><p style="text-align: center">a</p></td></tr>'),
    ],
    [
      '<table><tr><td><ul><li>a</li></ul></td></tr></table>',
      T('<tr><td><ul><li>a</li></ul></td></tr>'),
    ],
    ['<table><tr><td></td></tr></table>', T('<tr><td></td></tr>')],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('keeps the paragraphs of the cells with compactParagraphs: false', () => {
    const element = document.createElement('div');
    const editor = new Editor({
      element,
      extensions: [defaultExtensions()],
      content: '<table><tr><th>a</th><td>b</td></tr></table>',
      compactParagraphs: false,
    });
    expect(editor.getHTML()).toBe(T('<tr><th><p>a</p></th><td><p>b</p></td></tr>'));
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html:
        '<table><tr><th data-colwidth="80">a</th><th colspan="2">b</th></tr>' +
        '<tr><td rowspan="2"><p>c</p><p>d</p></td><td>e</td><td>f</td></tr>' +
        '<tr><td>g</td><td>h</td></tr></table><p>i</p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });
});

describe('Table: irregular tables', () => {
  const html = '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td></tr></table>';
  const fixed = T('<tr><td>a</td><td>b</td></tr><tr><td>c</td><td></td></tr>');

  it('fixes them on load, without an undo step', () => {
    const editor = createTestEditor({ html });
    expect(editor.getHTML()).toBe(fixed);
    expect(editor.commands.undo.can()).toBe(false);
  });

  it.each([{}, { resetHistory: true }])('fixes them in setHTML(html, %j)', (options) => {
    const editor = createTestEditor();
    editor.setHTML(html, options);
    expect(editor.getHTML()).toBe(fixed);
  });

  it('fixes a table that a transaction breaks, also when every block changes', () => {
    const editor = createTestEditor({
      html: `<p>x</p>${T('<tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr>')}<p>y</p>`,
    });
    let cell = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.spec.tableRole === 'cell' && node.textContent === 'd') cell = pos;
    });
    const tr = editor.state.tr.delete(cell, cell + editor.state.doc.nodeAt(cell)!.nodeSize);
    tr.insertText('!', 1).insertText('!', tr.doc.content.size - 1);
    editor.view.dispatch(tr);
    expect(editor.getHTML()).toBe(
      `<p>!x</p>${T('<tr><td>a</td><td>b</td></tr><tr><td>c</td><td></td></tr>')}<p>y!</p>`,
    );
  });

  it('turns a selected cell node into a cell selection', () => {
    const editor = createTestEditor({ html: `<p>x</p>${T('<tr><td>a</td></tr>')}` });
    const { doc, tr } = editor.state;
    editor.view.dispatch(tr.setSelection(NodeSelection.create(doc, 5)));
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
  });

  it('gives every cell of a column the width of the column', () => {
    const editor = createTestEditor({
      html: '<table><tr><td data-colwidth="80">a</td></tr><tr><td>b</td></tr></table>',
    });
    expect(editor.getHTML()).toBe(
      '<table><colgroup><col style="width: 80px"></colgroup><tbody>' +
        '<tr><td data-colwidth="80">a</td></tr><tr><td data-colwidth="80">b</td></tr></tbody></table>',
    );
  });
});

describe('Table: insertTable', () => {
  it('inserts a table with a header row, the cursor in the first cell', () => {
    const editor = createTestEditor({ html: '<p>a|</p><p>b</p>' });
    expect(editor.commands.insertTable({ rows: 2, cols: 2 })).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(
      `<p>a</p>${T('<tr><th>|</th><th></th></tr><tr><td></td><td></td></tr>')}<p>b</p>`,
    );
  });

  it('splits the paragraph around the cursor', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    editor.commands.insertTable({ rows: 1, cols: 1, withHeaderRow: false });
    expect(getHTMLWithSelection(editor)).toBe(`<p>a</p>${T('<tr><td>|</td></tr>')}<p>b</p>`);
  });

  it('inserts a table without a header row, then a paragraph at the end of the document', () => {
    const editor = createTestEditor({ html: '<p>|</p>' });
    expect(editor.commands.insertTable({ rows: 1, cols: 3, withHeaderRow: false })).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(
      `${T('<tr><td>|</td><td></td><td></td></tr>')}<p></p>`,
    );
  });

  it('inserts a 3 × 3 table by default', () => {
    const editor = createTestEditor({ html: '<p>|</p>' });
    editor.commands.insertTable();
    expect(editor.getHTML().match(/<th>/g)).toHaveLength(3);
    expect(editor.getHTML().match(/<td>/g)).toHaveLength(6);
  });

  it.each([[{ rows: 0 }], [{ cols: -1 }], [{ rows: 1.5 }]])('refuses %j', (options) => {
    const editor = createTestEditor({ html: '<p>|</p>' });
    expect(editor.commands.insertTable(options)).toBe(false);
    expect(editor.getHTML()).toBe('<p></p>');
  });

  it('refuses inside a table', () => {
    const editor = createTestEditor({ html: '<table><tr><td>a|</td></tr></table>' });
    expect(editor.commands.insertTable.can()).toBe(false);
  });

  it('refuses where a table is not allowed', () => {
    const editor = createTestEditor({ html: '<ul><li>a|</li></ul>' });
    expect(editor.commands.insertTable()).toBe(false);
  });
});

describe('Table: row and column commands', () => {
  const html = '<table><tr><td>a</td><td>b|</td></tr><tr><td>c</td><td>d</td></tr></table>';

  it.each([
    [
      'addRowBefore',
      '<tr><td></td><td></td></tr><tr><td>a</td><td>b|</td></tr><tr><td>c</td><td>d</td></tr>',
    ],
    [
      'addRowAfter',
      '<tr><td>a</td><td>b|</td></tr><tr><td></td><td></td></tr><tr><td>c</td><td>d</td></tr>',
    ],
    ['deleteRow', '<tr><td>|c</td><td>d</td></tr>'],
    [
      'addColumnBefore',
      '<tr><td>a</td><td></td><td>b|</td></tr><tr><td>c</td><td></td><td>d</td></tr>',
    ],
    [
      'addColumnAfter',
      '<tr><td>a</td><td>b|</td><td></td></tr><tr><td>c</td><td>d</td><td></td></tr>',
    ],
    ['deleteColumn', '<tr><td>a</td></tr><tr><td>|c</td></tr>'],
  ] as const)('%s', (command, rows) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(T(rows));
  });

  it('changes a whole column in one step, undone at once', () => {
    const editor = createTestEditor({ html: `<p>x</p>${html}` });
    const steps: number[] = [];
    editor.on('transaction', ({ transaction }) => steps.push(transaction.steps.length));
    editor.commands.toggleHeaderColumn();
    editor.commands.addColumnAfter();
    expect(steps).toEqual([1, 1]);
    expect(getHTMLWithSelection(editor)).toBe(
      `<p>x</p>${T('<tr><th>a</th><td>b|</td><td></td></tr><tr><th>c</th><td>d</td><td></td></tr>')}`,
    );
    editor.commands.undo();
    editor.commands.undo();
    expect(getHTMLWithSelection(editor)).toBe(
      `<p>x</p>${T('<tr><td>a</td><td>b|</td></tr><tr><td>c</td><td>d</td></tr>')}`,
    );
  });

  it.each([
    ['deleteRow', '<table><tr><td>a|</td><td>b</td></tr></table>'],
    ['deleteColumn', '<table><tr><td>a|</td></tr><tr><td>b</td></tr></table>'],
  ] as const)('%s refuses to delete every row or column', (command, html) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command].can()).toBe(false);
    expect(editor.commands[command]()).toBe(false);
    expect(editor.commands.deleteTable.can()).toBe(true);
  });

  it('deleteRow refuses when every row is selected', () => {
    const editor = createTestEditor({ html });
    selectCells(editor, 0, 3);
    expect(editor.commands.deleteRow.can()).toBe(false);
    expect(editor.commands.deleteColumn.can()).toBe(false);
  });

  it('deletes the table', () => {
    const editor = createTestEditor({ html: `<p>x</p>${html}<p>y</p>` });
    expect(editor.commands.deleteTable()).toBe(true);
    expect(editor.getHTML()).toBe('<p>x</p><p>y</p>');
  });

  it.each([
    'deleteTable',
    'addRowBefore',
    'addRowAfter',
    'deleteRow',
    'addColumnBefore',
    'addColumnAfter',
    'deleteColumn',
    'mergeCells',
    'splitCell',
    'toggleHeaderRow',
    'toggleHeaderColumn',
    'goToNextCell',
    'goToPreviousCell',
  ] as const)('%s is false outside a table', (command) => {
    expect(createTestEditor({ html: '<p>a|</p>' }).commands[command].can()).toBe(false);
  });
});

describe('Table: merge and split', () => {
  const html = '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>';

  it('merges the selected cells and splits them back', () => {
    const editor = createTestEditor({ html });
    expect(editor.commands.mergeCells.can()).toBe(false);
    selectCells(editor, 0, 1);
    expect(editor.commands.mergeCells()).toBe(true);
    expect(editor.getHTML()).toBe(
      T('<tr><td colspan="2"><p>a</p><p>b</p></td></tr><tr><td>c</td><td>d</td></tr>'),
    );
    expect(editor.commands.splitCell()).toBe(true);
    expect(editor.getHTML()).toBe(
      T('<tr><td><p>a</p><p>b</p></td><td></td></tr><tr><td>c</td><td>d</td></tr>'),
    );
  });

  it('cannot split a single cell', () => {
    expect(createTestEditor({ html: T('<tr><td>a|</td></tr>') }).commands.splitCell()).toBe(false);
  });
});

describe('Table: select row, column, table', () => {
  const html = '<p>x</p><table><tr><td>a</td><td>b|</td></tr><tr><td>c</td><td>d</td></tr></table>';

  /** The text of the selected cells. */
  function selected(editor: Editor): string {
    const { selection } = editor.state;
    if (!(selection instanceof CellSelection)) return '';
    const texts: string[] = [];
    selection.forEachCell((cell) => texts.push(cell.textContent));
    return texts.join(',');
  }

  /** The position inside the cell holding `text`. */
  function cellPos(editor: Editor, text: string): number {
    let found = -1;
    editor.state.doc.descendants((node, pos) => {
      if (found < 0 && node.type.spec.tableRole === 'cell' && node.textContent === text)
        found = pos + 1;
      return found < 0;
    });
    return found;
  }

  it.each([
    ['selectRow', 'a,b'],
    ['selectColumn', 'b,d'],
    ['selectTable', 'a,b,c,d'],
  ] as const)('%s selects around the selection', (command, cells) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(true);
    expect(selected(editor)).toBe(cells);
  });

  it.each([
    ['selectRow', 'c,d'],
    ['selectColumn', 'a,c'],
    ['selectTable', 'a,b,c,d'],
  ] as const)('%s selects around a position', (command, cells) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command](cellPos(editor, 'c'))).toBe(true);
    expect(selected(editor)).toBe(cells);
  });

  it('selects every row a merged cell spans', () => {
    const editor = createTestEditor({
      html: T('<tr><td rowspan="2">a</td><td>b</td></tr><tr><td>c|</td></tr>'),
    });
    editor.commands.selectRow(cellPos(editor, 'a'));
    expect(selected(editor)).toBe('a,b,c');
  });

  it.each(['selectRow', 'selectColumn', 'selectTable'] as const)(
    '%s is false outside a table or at an invalid position',
    (command) => {
      const editor = createTestEditor({ html: `<p>x|</p>${T('<tr><td>a</td></tr>')}` });
      expect(editor.commands[command]()).toBe(false);
      expect(editor.commands[command](-1)).toBe(false);
      expect(editor.commands[command](1000)).toBe(false);
    },
  );
});

describe('Table: header row and column', () => {
  it('toggles the header row and the header column', () => {
    const editor = createTestEditor({
      html: '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d|</td></tr></table>',
    });
    expect(getTableHeaders(editor)).toEqual({ row: false, column: false });
    expect(editor.commands.toggleHeaderRow()).toBe(true);
    expect(editor.getHTML()).toBe(T('<tr><th>a</th><th>b</th></tr><tr><td>c</td><td>d</td></tr>'));
    expect(getTableHeaders(editor)).toEqual({ row: true, column: false });
    expect(editor.commands.toggleHeaderColumn()).toBe(true);
    expect(editor.getHTML()).toBe(T('<tr><th>a</th><th>b</th></tr><tr><th>c</th><td>d</td></tr>'));
    expect(getTableHeaders(editor)).toEqual({ row: true, column: true });
    expect(editor.commands.toggleHeaderRow()).toBe(true);
    expect(editor.getHTML()).toBe(T('<tr><th>a</th><td>b</td></tr><tr><th>c</th><td>d</td></tr>'));
    expect(getTableHeaders(editor)).toEqual({ row: false, column: true });
  });

  it('has no headers outside a table', () => {
    expect(getTableHeaders(createTestEditor({ html: '<p>a|</p>' }))).toBeNull();
  });
});

describe('Table: keys', () => {
  const html = '<table><tr><td>a|</td><td>b</td></tr></table><p>c</p>';

  it('Tab goes to the next cell, Shift-Tab back', () => {
    const editor = createTestEditor({ html });
    expect(pressKey(editor, 'Tab')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(`${T('<tr><td>a</td><td>[b]</td></tr>')}<p>c</p>`);
    expect(pressKey(editor, 'Shift-Tab')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(`${T('<tr><td>[a]</td><td>b</td></tr>')}<p>c</p>`);
  });

  it('Tab in the last cell adds a row', () => {
    const editor = createTestEditor({ html });
    pressKey(editor, 'Tab');
    expect(pressKey(editor, 'Tab')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(
      `${T('<tr><td>a</td><td>b</td></tr><tr><td>|</td><td></td></tr>')}<p>c</p>`,
    );
    editor.commands.undo();
    expect(editor.getHTML()).toBe(`${T('<tr><td>a</td><td>b</td></tr>')}<p>c</p>`);
  });

  it('Tab is not handled outside a table', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(pressKey(editor, 'Tab')).toBe(false);
    expect(pressKey(editor, 'Shift-Tab')).toBe(false);
  });
});
