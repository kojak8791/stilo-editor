import { wrappingInputRule } from 'prosemirror-inputrules';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { toggleList } from '../../core/helpers/lists';

declare module '../../core/types' {
  interface Commands {
    /** Wraps the selection in a bullet list, lifts it out, or converts another list type. */
    toggleBulletList: () => Command;
  }
}

/** The `bulletList` node (`<ul>`), docs/SPEC.md F-401, F-405. Requires `ListItem`. */
export const BulletList = defineExtension({
  name: 'bulletList',
  nodes: () => ({
    bulletList: {
      group: 'block list',
      content: 'listItem+',
      parseDOM: [{ tag: 'ul' }],
      toDOM: () => ['ul', 0],
    },
  }),
  commands: ({ schema }) => ({
    toggleBulletList: () => toggleList(schema.nodes.bulletList!, schema.nodes.listItem!),
  }),
  keymap: ({ editor }) => ({
    'Mod-Shift-8': () => editor.commands.toggleBulletList(),
  }),
  inputRules: ({ schema }) => [wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bulletList!)],
});
