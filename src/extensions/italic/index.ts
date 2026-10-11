import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { markInputRule } from '../../core/helpers/input-rules';
import { setMark, toggleMark, unsetMark } from '../../core/helpers/marks';

declare module '../../core/types' {
  interface Commands {
    /** Adds italic to the selection. */
    setItalic: () => Command;
    /** Removes italic from the selection. */
    unsetItalic: () => Command;
    /** Removes italic if the whole selection is italic, otherwise adds it. */
    toggleItalic: () => Command;
  }
}

/**
 * The `italic` mark (`<em>`), docs/SPEC.md F-202. Also parsed from `<i>` and an italic
 * `font-style`.
 */
export const Italic = defineExtension({
  name: 'italic',
  marks: () => ({
    italic: {
      parseDOM: [
        { tag: 'em' },
        { tag: 'i' },
        {
          style: 'font-style',
          getAttrs: (value) => value === 'italic' && null,
        },
      ],
      group: 'formatting',
      toDOM: () => ['em', 0],
    },
  }),
  commands: ({ schema }) => {
    const type = schema.marks.italic!;
    return {
      setItalic: () => setMark(type),
      unsetItalic: () => unsetMark(type),
      toggleItalic: () => toggleMark(type),
    };
  },
  keymap: ({ editor }) => ({
    'Mod-i': () => editor.commands.toggleItalic(),
  }),
  inputRules: ({ schema }) => [
    markInputRule(/(?:^|[^*])\*([^*]+)\*$/, schema.marks.italic!),
    markInputRule(/(?:^|\s)_([^_]+)_$/, schema.marks.italic!),
  ],
});
