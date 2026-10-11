import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { setMark, toggleMark, unsetMark } from '../../core/helpers/marks';
import { textDecorationRules } from '../../core/helpers/parse-rules';

declare module '../../core/types' {
  interface Commands {
    /** Adds underline to the selection. */
    setUnderline: () => Command;
    /** Removes underline from the selection. */
    unsetUnderline: () => Command;
    /** Removes underline if the whole selection is underlined, otherwise adds it. */
    toggleUnderline: () => Command;
  }
}

/**
 * The `underline` mark (`<u>`), docs/SPEC.md F-203. Also parsed from `text-decoration: underline`.
 */
export const Underline = defineExtension({
  name: 'underline',
  marks: () => ({
    underline: {
      parseDOM: [{ tag: 'u' }, ...textDecorationRules('underline')],
      group: 'formatting',
      toDOM: () => ['u', 0],
    },
  }),
  commands: ({ schema }) => {
    const type = schema.marks.underline!;
    return {
      setUnderline: () => setMark(type),
      unsetUnderline: () => unsetMark(type),
      toggleUnderline: () => toggleMark(type),
    };
  },
  keymap: ({ editor }) => ({
    'Mod-u': () => editor.commands.toggleUnderline(),
  }),
});
