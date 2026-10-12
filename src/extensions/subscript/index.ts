import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { setMark, toggleMark, unsetMark } from '../../core/helpers/marks';

declare module '../../core/types' {
  interface Commands {
    /** Makes the selection subscript (replacing superscript). */
    setSubscript: () => Command;
    /** Removes subscript from the selection. */
    unsetSubscript: () => Command;
    /** Removes subscript if the whole selection is subscript, otherwise adds it. */
    toggleSubscript: () => Command;
  }
}

/**
 * The `subscript` mark (`<sub>`), docs/SPEC.md F-207. Also parsed from `vertical-align: sub`.
 * Subscript and superscript exclude each other through the mark group `script`.
 */
export const Subscript = defineExtension({
  name: 'subscript',
  marks: () => ({
    subscript: {
      parseDOM: [
        { tag: 'sub' },
        { style: 'vertical-align', getAttrs: (value: string) => value === 'sub' && null },
      ],
      group: 'formatting script',
      excludes: 'script',
      toDOM: () => ['sub', 0],
    },
  }),
  commands: ({ schema }) => {
    const type = schema.marks.subscript!;
    return {
      setSubscript: () => setMark(type),
      unsetSubscript: () => unsetMark(type),
      toggleSubscript: () => toggleMark(type),
    };
  },
  keymap: ({ editor }) => ({
    'Mod-,': () => editor.commands.toggleSubscript(),
  }),
});
