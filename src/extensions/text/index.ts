import { defineExtension } from '../../core/extension';

/** The `text` node. */
export const Text = defineExtension({
  name: 'text',
  nodes: () => ({
    text: { group: 'inline' },
  }),
});
