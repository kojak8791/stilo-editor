import { defineExtension } from '../../core/extension';

/** The top-level `doc` node: one or more blocks. */
export const Document = defineExtension({
  name: 'doc',
  nodes: () => ({
    doc: { content: 'block+' },
  }),
});
