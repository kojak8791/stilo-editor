# 0001 — Tight list items in the HTML output

- Status: accepted
- Date: 2026-10-11

## Context

The `listItem` node has content `paragraph block*` (ARCHITECTURE §7.1): text always lives in a
textblock, so every command (headings, alignment, Enter, Backspace) works on one structure, and
an item can hold several blocks without ambiguity.

Serialized as is, every item gets a `<p>`: `<ul><li><p>one</p></li></ul>`. The HTML is valid, but
for one-line items the `<p>` is redundant, and its default margins make every list look spaced
out in the stylesheets of the sites that display our output. HTML is our public format (VISION
§2, D-02), so the output should be what a person would write. CommonMark makes the same
distinction: *tight* lists (`<li>one</li>`) and *loose* lists (`<li><p>one</p>…</li>`).

## Decision

- The document model does not change: `listItem` keeps `paragraph block*`.
- `serializeHTML` unwraps a `<p>` that is the **only child** of an `<li>` and has **no
  attributes**: `<li><p>one</p></li>` becomes `<li>one</li>`.
- This is the default. The editor option `compactParagraphs: false` keeps ProseMirror's
  standard output (`<li><p>one</p></li>`) for integrations that expect it.
- Table cells (`<td>`, `<th>`, M2) follow the same rule and the same option: their content is
  `block+`, so they would otherwise always get a `<p>`.
- Items with several blocks keep their paragraphs:
  `<li><p>one</p><p>more</p></li>`, `<li><p>one</p><ul>…</ul></li>`.
- A paragraph with attributes (e.g. `text-align`, M2) is never unwrapped, so nothing is lost.
- Parsing needs nothing: ProseMirror wraps the loose inline content of an `<li>` in a paragraph.
- `<blockquote><p>` is unchanged: there the paragraph is meaningful (WHATWG examples use it).

## Consequences

- `getHTML()` produces tight items; `setHTML(getHTML())` stays idempotent in both forms (tested
  in the lists task, T-007).
- One generic rule in `src/core/html/serialize.ts`, independent of the list extensions; it also
  applies to task items and, when added to its container list, table cells (M2).
- New public option `EditorOptions.compactParagraphs` (default `true`).
- The clipboard (`copy`) uses ProseMirror's own serializer and still writes `<li><p>`. This is
  harmless: pasting it back parses to the same document.
- ARCHITECTURE §5 (`EditorOptions`), §7.1 (`listItem` row) and §13 (D-12) reflect this ADR.
