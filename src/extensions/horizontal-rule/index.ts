import { InputRule } from 'prosemirror-inputrules';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { insertBlock, insertBlockNode } from '../../core/helpers/nodes';

declare module '../../core/types' {
  interface Commands {
    /** Inserts a horizontal rule at the cursor. */
    setHorizontalRule: () => Command;
  }
}

/**
 * The `horizontalRule` node (`<hr>`), docs/SPEC.md F-304.
 */
export const HorizontalRule = defineExtension({
  name: 'horizontalRule',
  nodes: () => ({
    horizontalRule: {
      group: 'block',
      parseDOM: [{ tag: 'hr' }],
      toDOM: () => ['hr'],
    },
  }),
  commands: ({ schema }) => {
    return {
      setHorizontalRule: () => insertBlock(schema.nodes.horizontalRule!),
    };
  },
  inputRules: ({ schema }) => [
    new InputRule(/^---$/, (state, _match, start, end) =>
      insertBlockNode(state.tr.delete(start, end), schema.nodes.horizontalRule!.create()),
    ),
  ],
});
