# 0005 — Table column widths in the HTML output

- Status: proposed
- Date: 2026-10-14

## Context

F-507 lets the user resize table columns by dragging their border. `prosemirror-tables` (already
a dependency) stores the result on the cells: every cell has a `colwidth` attribute, an array of
pixel widths with one entry per column it spans (`null` when no width is set), and its default
node specs write it as `data-colwidth="120"` (`"120,80"` for a cell with `colspan="2"`). In the
editor, its `TableView` draws a `<colgroup>` from the first row and gives the table a `width`
(every column has a width) or a `min-width` (some do not).

HTML is our public format (D-02) and is displayed by pages that do not load the editor. A
`data-` attribute means nothing to a browser, so with `data-colwidth` alone the resized widths
are lost outside the editor. The standard place for column widths is `<colgroup>` with one
`<col>` per column. ARCHITECTURE §7.4 left the choice to this ADR; `colgroup`, `col` and
`data-colwidth` are already in the sanitizer allowlist (§8).

Reading widths back from a `<colgroup>` alone would mean finding the column of every cell
(`colspan`, and `rowspan` of the rows above) while parsing, outside ProseMirror's per-element
parse rules.

## Decision

- The model is the one of `prosemirror-tables`: `colwidth` on `tableCell` and `tableHeader`.
- **Output, both forms**, and only when at least one column has a width:
  - every cell with a width keeps `data-colwidth` (whole pixels, comma separated, one per
    spanned column): it is what the editor reads back;
  - the table starts with a `<colgroup>` of one `<col>` per column, taken from the cells of the
    first row (as `TableView` does): `<col style="width: 120px">` for a column with a width,
    a bare `<col>` for the others. It is what other pages display.

  ```html
  <table><colgroup><col style="width: 120px"><col></colgroup><tbody><tr><td
  data-colwidth="120">a</td><td>b</td></tr></tbody></table>
  ```

  A table without widths has neither: `<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>`.
- The table itself gets no `width` style: a browser lays out the columns from the `<col>`
  widths, and the table stays free to fit the page that displays it.
- `width` joins the style allowlist (§7.3) for this use only: whole pixels (`^\d+(\.\d+)?px$`,
  rounded); any other unit is dropped.
- **Input**: widths come from `data-colwidth` only, accepted when it lists one positive whole
  number per spanned column (otherwise the cell has no width). The `<colgroup>` is ignored, since
  it is derived from the cells. Widths written only as `<col>` or as cell `width` (Word, Excel,
  Google Sheets) are not read: paste of tables from spreadsheets is F-509 (M3).

## Consequences

- `table` writes the `<colgroup>` in its `toDOM`, the cells write `data-colwidth`; no
  post-processing in `serialize.ts`.
- `src/core/html/css.ts` gains `width` (`normalizeWidth`), §7.3 its row.
- Output is a little longer for resized tables (the widths are written twice); tables never
  resized are unchanged. Two places to keep consistent, both written by our own `toDOM`.
- HTML from other ProseMirror-based editors that write `data-colwidth` keeps its widths.
- ARCHITECTURE §7.1 (table rows), §7.3, §7.4 and §13 (D-16) reflect this ADR.
