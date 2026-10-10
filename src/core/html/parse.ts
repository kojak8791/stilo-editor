import type { Node, Schema } from 'prosemirror-model';
import { notImplemented } from '../errors';

/**
 * Parses HTML into a ProseMirror document: the HTML is sanitized with `sanitizeToDOM` and the
 * resulting element is parsed with `DOMParser.fromSchema(schema)` from prosemirror-model.
 * An empty string produces the empty document (one empty paragraph).
 */
export function parseHTML(_schema: Schema, _html: string): Node {
  return notImplemented('parseHTML');
}
