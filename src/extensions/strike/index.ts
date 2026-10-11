import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { markInputRule } from '../../core/helpers/input-rules';
import { setMark, toggleMark, unsetMark } from '../../core/helpers/marks';
import { textDecorationRules } from '../../core/helpers/parse-rules';

declare module '../../core/types' {
  interface Commands {
    /** Adds strike-through to the selection. */
    setStrike: () => Command;
    /** Removes strike-through from the selection. */
    unsetStrike: () => Command;
    /** Removes strike-through if the whole selection is struck through, otherwise adds it. */
    toggleStrike: () => Command;
  }
}

/**
 * The `strike` mark (`<s>`), docs/SPEC.md F-204. Also parsed from `<del>`, `<strike>` and a
 * `text-decoration: line-through`.
 */
export const Strike = defineExtension({
  name: 'strike',
  marks: () => ({
    strike: {
      parseDOM: [
        { tag: 's' },
        { tag: 'del' },
        { tag: 'strike' },
        ...textDecorationRules('line-through'),
      ],
      group: 'formatting',
      toDOM: () => ['s', 0],
    },
  }),
  commands: ({ schema }) => {
    const type = schema.marks.strike!;
    return {
      setStrike: () => setMark(type),
      unsetStrike: () => unsetMark(type),
      toggleStrike: () => toggleMark(type),
    };
  },
  keymap: ({ editor }) => ({
    'Mod-Shift-s': () => editor.commands.toggleStrike(),
  }),
  inputRules: ({ schema }) => [markInputRule(/(?:^|[^~])~~([^~]+)~~$/, schema.marks.strike!)],
});
