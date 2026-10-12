import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { setMark, toggleMark, unsetMark } from '../../core/helpers/marks';

declare module '../../core/types' {
  interface Commands {
    /** Makes the selection superscript (replacing subscript). */
    setSuperscript: () => Command;
    /** Removes superscript from the selection. */
    unsetSuperscript: () => Command;
    /** Removes superscript if the whole selection is superscript, otherwise adds it. */
    toggleSuperscript: () => Command;
  }
}

/**
 * The `superscript` mark (`<sup>`), docs/SPEC.md F-207. Also parsed from
 * `vertical-align: super`. Subscript and superscript exclude each other through the mark group
 * `script`.
 */
export const Superscript = defineExtension({
  name: 'superscript',
  marks: () => ({
    superscript: {
      parseDOM: [
        { tag: 'sup' },
        { style: 'vertical-align', getAttrs: (value: string) => value === 'super' && null },
      ],
      group: 'formatting script',
      excludes: 'script',
      toDOM: () => ['sup', 0],
    },
  }),
  commands: ({ schema }) => {
    const type = schema.marks.superscript!;
    return {
      setSuperscript: () => setMark(type),
      unsetSuperscript: () => unsetMark(type),
      toggleSuperscript: () => toggleMark(type),
    };
  },
  keymap: ({ editor }) => ({
    'Mod-.': () => editor.commands.toggleSuperscript(),
  }),
});
