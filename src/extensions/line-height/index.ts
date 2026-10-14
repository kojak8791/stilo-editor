import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { setTextblockAttr } from '../../core/helpers/nodes';
import { normalizeStyleValue } from '../../core/html/css';

declare module '../../core/types' {
  interface Commands {
    /**
     * Sets the line height of the selected paragraphs and headings: a number (`1.5`) or a
     * percentage (`'150%'`). `false` for another value, or when no selected block has one.
     */
    setLineHeight: (lineHeight: number | string) => Command;
    /** Removes the line height of the selected paragraphs and headings. */
    unsetLineHeight: () => Command;
  }
}

/**
 * Line spacing of paragraphs and headings (docs/SPEC.md F-312): the commands. The `lineHeight`
 * attribute itself belongs to the `paragraph` and `heading` nodes, so content keeps its line
 * spacing without this extension.
 */
export const LineHeight = defineExtension({
  name: 'lineHeight',
  commands: () => ({
    setLineHeight: (lineHeight) => {
      const value = normalizeStyleValue('line-height', String(lineHeight));
      return value ? setTextblockAttr('lineHeight', value) : () => false;
    },
    unsetLineHeight: () => setTextblockAttr('lineHeight', null),
  }),
});
