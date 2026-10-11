import { wrappingInputRule } from 'prosemirror-inputrules';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { toggleList } from '../../core/helpers/lists';

declare module '../../core/types' {
  interface Commands {
    /** Wraps the selection in an ordered list, lifts it out, or converts another list type. */
    toggleOrderedList: () => Command;
  }
}

/**
 * The `orderedList` node (`<ol start="n">`, `start` omitted when 1), docs/SPEC.md F-402, F-405.
 * Requires `ListItem`.
 */
export const OrderedList = defineExtension({
  name: 'orderedList',
  nodes: () => ({
    orderedList: {
      group: 'block list',
      content: 'listItem+',
      attrs: { start: { default: 1 } },
      parseDOM: [
        {
          tag: 'ol',
          getAttrs: (element: HTMLElement) => ({
            start: parseStart(element),
          }),
        },
      ],
      toDOM: (node) =>
        node.attrs.start === 1 ? ['ol', 0] : ['ol', { start: node.attrs.start }, 0],
    },
  }),
  commands: ({ schema }) => ({
    toggleOrderedList: () => toggleList(schema.nodes.orderedList!, schema.nodes.listItem!),
  }),
  keymap: ({ editor }) => ({
    'Mod-Shift-7': () => editor.commands.toggleOrderedList(),
  }),
  inputRules: ({ schema }) => [
    wrappingInputRule(
      /^(\d+)\.\s$/,
      schema.nodes.orderedList!,
      (match) => ({ start: Number(match[1]) }),
      (match, node) => node.childCount + node.attrs.start === Number(match[1]),
    ),
  ],
});

/**
 * Reads the `start` attribute: a non-negative integer (like the `0. ` input rule), else 1.
 */
function parseStart(element: HTMLElement): number {
  const value = element.getAttribute('start')?.trim() ?? '';
  return /^\d+$/.test(value) ? Number(value) : 1;
}
