import type { Fragment, Schema } from 'prosemirror-model';
import { notImplemented } from '../errors';

/**
 * Serializes a fragment (usually `doc.content`) to a canonical HTML string
 * (docs/ARCHITECTURE.md §7): `DOMSerializer.fromSchema(schema).serializeFragment()` into a
 * container element of a detached document (`document.implementation.createHTMLDocument('')`),
 * then the container's `innerHTML`.
 */
export function serializeHTML(schema: Schema, fragment: Fragment): string {
  return notImplemented('serializeHTML');
}
