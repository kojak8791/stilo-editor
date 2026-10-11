import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { markInputRule } from '../../core/helpers/input-rules';
import { setMark, toggleMark, unsetMark } from '../../core/helpers/marks';

declare module '../../core/types' {
  interface Commands {
    /** Adds inline code to the selection. */
    setCode: () => Command;
    /** Removes inline code from the selection. */
    unsetCode: () => Command;
    /** Removes inline code if the whole selection is code, otherwise adds it. */
    toggleCode: () => Command;
  }
}

/**
 * The `code` mark (`<code>`), docs/SPEC.md F-205.
 */
export const Code = defineExtension({
  name: 'code',
  marks: () => ({
    code: {
      parseDOM: [{ tag: 'code' }],
      excludes: 'formatting',
      group: 'formatting',
      code: true,
      toDOM: () => ['code', 0],
    },
  }),
  commands: ({ schema }) => {
    const type = schema.marks.code!;
    return {
      setCode: () => setMark(type),
      unsetCode: () => unsetMark(type),
      toggleCode: () => toggleMark(type),
    };
  },
  keymap: ({ editor }) => ({
    'Mod-e': () => editor.commands.toggleCode(),
  }),
  inputRules: ({ schema }) => [markInputRule(/(?:^|[^`])`([^`]+)`$/, schema.marks.code!)],
});
