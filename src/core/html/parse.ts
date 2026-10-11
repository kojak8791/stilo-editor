import { DOMParser, type Node, type Schema } from 'prosemirror-model';
import { sanitizeToDOM } from './sanitize';

/**
 * Parses HTML into a ProseMirror document: the HTML is sanitized with `sanitizeToDOM` and the
 * resulting element is parsed with `DOMParser.fromSchema(schema)` from prosemirror-model.
 * An empty string produces the empty document (one empty paragraph).
 */
export function parseHTML(schema: Schema, html: string): Node {
  return DOMParser.fromSchema(schema).parse(sanitizeToDOM(html));
}
