import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { markInputRule } from '../../core/helpers/input-rules';
import { setMark, toggleMark, unsetMark } from '../../core/helpers/marks';
import { parseStyle } from '../../core/html/css';

declare module '../../core/types' {
  interface Commands {
    /** Adds bold to the selection. */
    setBold: () => Command;
    /** Removes bold from the selection. */
    unsetBold: () => Command;
    /** Removes bold if the whole selection is bold, otherwise adds it. */
    toggleBold: () => Command;
  }
}

/** Whether a CSS `font-weight` value is bold: `bold` or a number ≥ 600. */
function isBoldWeight(value: string): boolean {
  return value === 'bold' || Number(value) >= 600;
}

/**
 * The `bold` mark (`<strong>`), docs/SPEC.md F-201. Also parsed from `<b>` (except the Google Docs
 * wrapper `<b style="font-weight: normal">`) and from a bold `font-weight` style.
 * Reference extension: every extension has this shape.
 */
export const Bold = defineExtension({
  name: 'bold',
  marks: () => ({
    bold: {
      parseDOM: [
        { tag: 'strong' },
        {
          tag: 'b',
          getAttrs: (node) =>
            parseStyle(node.getAttribute('style') ?? '').get('font-weight') !== 'normal' && null,
        },
        { style: 'font-weight', getAttrs: (value) => isBoldWeight(value) && null },
      ],
      toDOM: () => ['strong', 0],
    },
  }),
  commands: ({ schema }) => {
    const type = schema.marks.bold!;
    return {
      setBold: () => setMark(type),
      unsetBold: () => unsetMark(type),
      toggleBold: () => toggleMark(type),
    };
  },
  keymap: ({ editor }) => ({
    'Mod-b': () => editor.commands.toggleBold(),
  }),
  inputRules: ({ schema }) => [markInputRule(/(?:^|[^*])\*\*([^*]+)\*\*$/, schema.marks.bold!)],
});
