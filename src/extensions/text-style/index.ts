import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { setMark, unsetMark } from '../../core/helpers/marks';
import { buildStyle, normalizeStyleValue, readStyle } from '../../core/html/css';

declare module '../../core/types' {
  interface Commands {
    /** Colors the selection. Returns `false` when `color` is not a valid CSS color. */
    setColor: (color: string) => Command;
    /** Removes the text color from the selection. */
    unsetColor: () => Command;
  }
}

/** The `textStyle` attributes of a parsed color, `false` (no mark) when it is missing or invalid. */
function colorAttrs(color: string | null): { color: string } | false {
  return color ? { color } : false;
}

/**
 * The `textStyle` mark (`<span style="color: x">`), docs/SPEC.md F-208. Also parsed from
 * `<font color>`. Font family and size (F-210, F-211) will be further attributes of this mark.
 */
export const TextStyle = defineExtension({
  name: 'textStyle',
  priority: 102,
  marks: () => ({
    textStyle: {
      attrs: { color: { default: null } },
      parseDOM: [
        { tag: 'span[style]', getAttrs: (node) => colorAttrs(readStyle(node, 'color')) },
        {
          tag: 'font[color]',
          getAttrs: (node) =>
            colorAttrs(normalizeStyleValue('color', node.getAttribute('color') ?? '')),
        },
      ],
      group: 'formatting',
      toDOM: (mark) => ['span', { style: buildStyle({ color: mark.attrs.color }) }, 0],
    },
  }),
  commands: ({ schema }) => {
    const type = schema.marks.textStyle!;
    return {
      setColor: (color) => {
        const value = normalizeStyleValue('color', color);
        return value ? setMark(type, { color: value }) : () => false;
      },
      unsetColor: () => unsetMark(type),
    };
  },
});
