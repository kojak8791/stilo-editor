import { DOMSerializer, type Fragment, type Schema } from 'prosemirror-model';

/**
 * Serializes a fragment (usually `doc.content`) to a canonical HTML string
 * (docs/ARCHITECTURE.md §7): `DOMSerializer.fromSchema(schema).serializeFragment()` into a
 * container element of a detached document (`document.implementation.createHTMLDocument('')`),
 * then the container's `innerHTML`.
 */
export function serializeHTML(schema: Schema, fragment: Fragment): string {
  const doc = document.implementation.createHTMLDocument('');
  const container = doc.createElement('div');
  container.append(DOMSerializer.fromSchema(schema).serializeFragment(fragment, { document: doc }));
  return container.innerHTML;
}
