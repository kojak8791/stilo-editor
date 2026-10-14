import type { Attrs, DOMOutputSpec, Node, NodeSpec, NodeType } from 'prosemirror-model';
import { type Command, EditorState, Plugin, Selection, type Transaction } from 'prosemirror-state';
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  columnResizing,
  deleteColumn,
  deleteRow,
  deleteTable,
  fixTables,
  goToNextCell,
  isInTable,
  mergeCells,
  selectedRect,
  splitCell,
  tableEditing,
  toggleHeader,
} from 'prosemirror-tables';
import { type Editor, LOAD_META } from '../../core/editor';
import { defineExtension } from '../../core/extension';
import { buildStyle } from '../../core/html/css';

declare module '../../core/types' {
  interface Commands {
    /**
     * Inserts a table in place of the selection, the cursor in its first cell. `false` inside a
     * table, or for `rows` / `cols` that are not whole numbers ≥ 1.
     */
    insertTable: (options?: InsertTableOptions) => Command;
    /** Deletes the table around the selection. */
    deleteTable: () => Command;
    /** Adds a row above the selected cells. */
    addRowBefore: () => Command;
    /** Adds a row below the selected cells. */
    addRowAfter: () => Command;
    /** Deletes the rows of the selected cells. */
    deleteRow: () => Command;
    /** Adds a column left of the selected cells. */
    addColumnBefore: () => Command;
    /** Adds a column right of the selected cells. */
    addColumnAfter: () => Command;
    /** Deletes the columns of the selected cells. */
    deleteColumn: () => Command;
    /** Merges the selected cells into one (a rectangle of at least two cells). */
    mergeCells: () => Command;
    /** Splits a merged cell back into single cells. */
    splitCell: () => Command;
    /** Turns the first row into header cells (`<th>`), or back. */
    toggleHeaderRow: () => Command;
    /** Turns the first column into header cells (`<th>`), or back. */
    toggleHeaderColumn: () => Command;
    /** Moves the cursor to the next cell; in the last cell, adds a row first. */
    goToNextCell: () => Command;
    /** Moves the cursor to the previous cell. */
    goToPreviousCell: () => Command;
  }
}

/** Options of the `insertTable` command. */
export interface InsertTableOptions {
  /** Number of rows, header row included. Default: 3. */
  rows?: number;
  /** Number of columns. Default: 3. */
  cols?: number;
  /** Makes the first row of header cells (`<th>`). Default: `true`. */
  withHeaderRow?: boolean;
}

/** Whether the first row and the first column of a table are made of header cells. */
export interface TableHeaders {
  row: boolean;
  column: boolean;
}

/** Browsers clamp `colspan` to 1000 and `rowspan` to 65534 (HTML standard). */
const MAX_COLSPAN = 1000;
const MAX_ROWSPAN = 65534;
const COLWIDTH = /^\d+(,\d+)*$/;

/** A whole number from an attribute, clamped to 1…`max`; 1 when missing or invalid. */
function parseSpan(value: string | null, max: number): number {
  const span = Number.parseInt(value ?? '', 10);
  return Number.isNaN(span) || span < 1 ? 1 : Math.min(span, max);
}

/** The attributes of a `<td>` / `<th>` (docs/decisions/0005). */
function parseCell(element: HTMLElement): Attrs {
  const colspan = parseSpan(element.getAttribute('colspan'), MAX_COLSPAN);
  const value = element.getAttribute('data-colwidth') ?? '';
  const widths = COLWIDTH.test(value) ? value.split(',').map(Number) : null;
  const valid = widths !== null && widths.length === colspan && widths.every((w) => w > 0);
  return {
    colspan,
    rowspan: parseSpan(element.getAttribute('rowspan'), MAX_ROWSPAN),
    colwidth: valid ? widths : null,
  };
}

/** The `<td>` / `<th>` of a cell: `colspan`, `rowspan`, `data-colwidth` in whole pixels. */
function cellDOM(tag: string, node: Node): DOMOutputSpec {
  const { colspan, rowspan, colwidth } = node.attrs;
  const attrs: Record<string, string> = {};
  if (colspan !== 1) attrs.colspan = String(colspan);
  if (rowspan !== 1) attrs.rowspan = String(rowspan);
  if (colwidth) attrs['data-colwidth'] = (colwidth as number[]).map(Math.round).join(',');
  return [tag, attrs, 0];
}

/** The width of each column, from the cells of the first row; `null` when none has one. */
function columnWidths(table: Node): (number | null)[] | null {
  const widths: (number | null)[] = [];
  table.firstChild?.forEach((cell) => {
    const colwidth = cell.attrs.colwidth as number[] | null;
    for (let i = 0; i < cell.attrs.colspan; i++) widths.push(colwidth?.[i] ?? null);
  });
  return widths.some((width) => width !== null) ? widths : null;
}

/** `<table>`, with a `<colgroup>` when a column has a width (docs/decisions/0005). */
function tableDOM(node: Node): DOMOutputSpec {
  const widths = columnWidths(node);
  if (!widths) return ['table', ['tbody', 0]];
  const cols = widths.map((width): DOMOutputSpec => {
    const style = width === null ? null : buildStyle({ width: `${width}px` });
    return ['col', style ? { style } : {}];
  });
  return ['table', ['colgroup', ...cols], ['tbody', 0]];
}

function cellSpec(tag: 'td' | 'th', tableRole: string): NodeSpec {
  return {
    content: 'block+',
    attrs: {
      colspan: { default: 1 },
      rowspan: { default: 1 },
      colwidth: { default: null },
    },
    tableRole,
    isolating: true,
    parseDOM: [{ tag, getAttrs: parseCell }],
    toDOM: (node) => cellDOM(tag, node),
  };
}

/** A whole number ≥ 1. */
function isCount(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

/** Puts the cursor in the first cell of the last row of the table at `tablePos`. */
function selectLastRow(tr: Transaction, tablePos: number): Transaction {
  const table = tr.doc.nodeAt(tablePos)!;
  const rowPos = tablePos + table.nodeSize - 1 - table.lastChild!.nodeSize;
  return tr.setSelection(Selection.near(tr.doc.resolve(rowPos + 1)));
}

/** The position of the innermost table around `selection`, -1 outside a table. */
function tablePosAround(selection: Selection): number {
  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.spec.tableRole === 'table') return $from.before(depth);
  }
  return -1;
}

/** `selection` as JSON, its positions moved by `offset`. */
function shiftedSelection(selection: Selection, offset: number): Record<string, unknown> {
  const json = selection.toJSON() as Record<string, unknown>;
  for (const key of ['anchor', 'head']) {
    if (typeof json[key] === 'number') json[key] = json[key] + offset;
  }
  return json;
}

/**
 * Runs a table command on a document holding only the table around the selection, then
 * replaces the table in one step. The commands of `prosemirror-tables` make a step per changed
 * cell (a column, a header column), and every step copies the list of top-level blocks: 164 ms
 * for a header column of 200 rows in 50,000 paragraphs (Chromium).
 */
function inTable(command: Command): Command {
  return (state, dispatch) => {
    const tablePos = tablePosAround(state.selection);
    if (tablePos < 0) return false;
    const table = state.doc.nodeAt(tablePos)!;
    const doc = state.schema.topNodeType.create(null, table);
    const selection = Selection.fromJSON(doc, shiftedSelection(state.selection, -tablePos));
    let result: Transaction | undefined;
    const done = command(
      EditorState.create({ doc, selection }),
      dispatch &&
        ((tr) => {
          result = tr;
        }),
    );
    if (done && dispatch && result) {
      const tr = state.tr.replaceWith(tablePos, tablePos + table.nodeSize, result.doc.content);
      tr.setSelection(Selection.fromJSON(tr.doc, shiftedSelection(result.selection, tablePos)));
      dispatch(tr.scrollIntoView());
    }
    return done;
  };
}

/** Whether `doc` contains a table, without entering textblocks. */
function hasTable(state: EditorState): boolean {
  let found = false;
  state.doc.descendants((node) => {
    if (node.type.spec.tableRole === 'table') found = true;
    return !found && !node.isTextblock;
  });
  return found;
}

/**
 * Fixes the irregular tables of a loaded document (missing cells, overlapping spans, column
 * widths that disagree), as `tableEditing` does for the tables a transaction changes: the
 * output then does not change after the first edit. One walk of the blocks per load.
 */
function fixLoadedTables(): Plugin {
  return new Plugin({
    appendTransaction: (transactions, _old, state) => {
      if (!transactions.some((tr) => tr.getMeta(LOAD_META)) || !hasTable(state)) return null;
      return fixTables(state)?.setMeta('addToHistory', false) ?? null;
    },
  });
}

/**
 * Whether the first row and the first column of the table around the selection are made of
 * header cells; `null` outside a table. For a UI showing the state of the header toggles.
 */
export function getTableHeaders(editor: Editor): TableHeaders | null {
  const { state } = editor;
  if (!isInTable(state)) return null;
  const { map, table } = selectedRect(state);
  const allHeaders = (right: number, bottom: number) =>
    map
      .cellsInRect({ left: 0, top: 0, right, bottom })
      .every((pos) => table.nodeAt(pos)?.type.spec.tableRole === 'header_cell');
  return { row: allHeaders(map.width, 1), column: allHeaders(1, map.height) };
}

/**
 * The `table`, `tableRow`, `tableCell` and `tableHeader` nodes (`<table><tbody><tr><td|th>`),
 * on `prosemirror-tables`, docs/SPEC.md F-501…F-507. Column widths: docs/decisions/0005.
 */
export const Table = defineExtension({
  name: 'table',
  nodes: () => ({
    table: {
      group: 'block',
      content: 'tableRow+',
      tableRole: 'table',
      isolating: true,
      parseDOM: [{ tag: 'table' }],
      toDOM: tableDOM,
    },
    tableRow: {
      content: '(tableCell | tableHeader)*',
      tableRole: 'row',
      parseDOM: [{ tag: 'tr' }],
      toDOM: () => ['tr', 0],
    },
    tableCell: cellSpec('td', 'cell'),
    tableHeader: cellSpec('th', 'header_cell'),
  }),
  commands: ({ schema }) => {
    const nodes = schema.nodes;

    const createTable = (rows: number, cols: number, withHeaderRow: boolean): Node => {
      const row = (type: NodeType) =>
        nodes.tableRow!.create(
          null,
          Array.from({ length: cols }, () => type.createAndFill()!),
        );
      return nodes.table!.create(
        null,
        Array.from({ length: rows }, (_, i) =>
          row(i === 0 && withHeaderRow ? nodes.tableHeader! : nodes.tableCell!),
        ),
      );
    };

    const insertTable =
      ({ rows = 3, cols = 3, withHeaderRow = true }: InsertTableOptions = {}): Command =>
      (state, dispatch) => {
        if (!isCount(rows) || !isCount(cols) || isInTable(state)) return false;
        const { $from } = state.selection;
        const depth = $from.parent.isTextblock ? $from.depth - 1 : $from.depth;
        const container = $from.node(depth);
        if (!container.canReplaceWith($from.index(depth), $from.indexAfter(depth), nodes.table!))
          return false;
        if (dispatch) {
          const table = createTable(rows, cols, withHeaderRow);
          const tr = state.tr.replaceSelectionWith(table);
          // The table is in the range the last step inserted.
          let tablePos = -1;
          tr.steps
            .at(-1)!
            .getMap()
            .forEach((_from, _to, start, end) => {
              tr.doc.nodesBetween(start, end, (node, pos) => {
                if (tablePos < 0 && node.type === table.type) tablePos = pos;
                return tablePos < 0 && !node.isTextblock;
              });
            });
          const end = tablePos + table.nodeSize;
          if (!tr.doc.resolve(end).nodeAfter) tr.insert(end, nodes.paragraph!.create());
          tr.setSelection(Selection.near(tr.doc.resolve(tablePos + 1)));
          dispatch(tr.scrollIntoView());
        }
        return true;
      };

    const nextCellOrRow: Command = (state, dispatch) => {
      if (goToNextCell(1)(state, dispatch)) return true;
      if (!isInTable(state)) return false;
      return addRowAfter(
        state,
        dispatch &&
          ((tr) => dispatch(selectLastRow(tr, tablePosAround(tr.selection)).scrollIntoView())),
      );
    };

    return {
      insertTable,
      deleteTable: () => deleteTable,
      addRowBefore: () => inTable(addRowBefore),
      addRowAfter: () => inTable(addRowAfter),
      deleteRow: () => inTable(deleteRow),
      addColumnBefore: () => inTable(addColumnBefore),
      addColumnAfter: () => inTable(addColumnAfter),
      deleteColumn: () => inTable(deleteColumn),
      mergeCells: () => inTable(mergeCells),
      splitCell: () => inTable(splitCell),
      toggleHeaderRow: () => inTable(toggleHeader('row')),
      toggleHeaderColumn: () => inTable(toggleHeader('column')),
      goToNextCell: () => nextCellOrRow,
      goToPreviousCell: () => goToNextCell(-1),
    };
  },
  keymap: ({ editor }) => ({
    Tab: () => editor.commands.goToNextCell(),
    'Shift-Tab': () => editor.commands.goToPreviousCell(),
  }),
  // Column resizing comes first: tableEditing would otherwise take its mouse events.
  plugins: () => [columnResizing(), tableEditing(), fixLoadedTables()],
});
