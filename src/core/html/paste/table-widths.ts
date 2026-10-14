import { readStyle } from '../css';

/**
 * Writes the column widths a pasted table carries as `data-colwidth` on its cells
 * (docs/decisions/0005): from its `<col>` elements (`width` attribute or `style="width"`), else
 * from the cells that span one column. Only pixel widths count; a table without them, or whose
 * cells already have `data-colwidth`, is left as it is.
 */
export function readTableWidths(body: HTMLElement): void {
  for (const table of body.querySelectorAll('table')) {
    if (table.querySelector('[data-colwidth]') === null) writeColumnWidths(table);
  }
}

function writeColumnWidths(table: HTMLTableElement): void {
  const widths: (number | null)[] = [];
  for (const col of table.querySelectorAll<HTMLElement>(':scope > colgroup > col, :scope > col')) {
    const span = Math.max(1, Number.parseInt(col.getAttribute('span') ?? '', 10) || 1);
    widths.push(...Array<number | null>(span).fill(pixelWidth(col)));
  }

  // The first column of every cell, skipping the columns taken by `rowspan` from above.
  const columns = new Map<HTMLTableCellElement, number>();
  const taken: number[][] = [];
  for (const [rowIndex, row] of [...table.rows].entries()) {
    const used = taken[rowIndex] ?? [];
    let column = 0;
    for (const cell of row.cells) {
      while (used.includes(column)) column++;
      columns.set(cell, column);
      for (let r = 1; r < cell.rowSpan; r++) {
        taken[rowIndex + r] ??= [];
        for (let c = 0; c < cell.colSpan; c++) taken[rowIndex + r]!.push(column + c);
      }
      if (cell.colSpan === 1 && widths[column] == null) widths[column] = pixelWidth(cell);
      column += cell.colSpan;
    }
  }

  for (const [cell, column] of columns) {
    const spanned = widths.slice(column, column + cell.colSpan);
    if (spanned.length === cell.colSpan && spanned.every((width) => width != null)) {
      cell.setAttribute('data-colwidth', spanned.join(','));
    }
  }
}

/** Whole pixels of a `width` attribute (`200`, `200px`) or of `style="width: 200px"`. */
function pixelWidth(element: HTMLElement): number | null {
  const attribute = element
    .getAttribute('width')
    ?.trim()
    .match(/^(\d+(?:\.\d+)?)(?:px)?$/i);
  const pixels = attribute
    ? Math.round(Number(attribute[1]!))
    : Number.parseInt(readStyle(element, 'width') ?? '', 10);
  return pixels > 0 ? pixels : null;
}
