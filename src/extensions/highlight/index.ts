import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { markInputRule } from '../../core/helpers/input-rules';
import { setMark, toggleMark, unsetMark } from '../../core/helpers/marks';
import { buildStyle, normalizeStyleValue, readStyle } from '../../core/html/css';

/** Attributes of the `highlight` mark. */
export interface HighlightAttributes {
  /** Background color; omitted or `null` for a plain `<mark>` (the browser's yellow). */
  color?: string | null;
}

declare module '../../core/types' {
  interface Commands {
    /** Highlights the selection. Returns `false` when `color` is not a valid CSS color. */
    setHighlight: (attributes?: HighlightAttributes) => Command;
    /** Removes the highlight from the selection. */
    unsetHighlight: () => Command;
    /**
     * Removes the highlight if the whole selection is highlighted (with `attributes.color` when
     * `attributes` is given), otherwise sets it.
     */
    toggleHighlight: (attributes?: HighlightAttributes) => Command;
  }
}

/**
 * Normalizes a background color: `null` when missing, invalid or `transparent` (Google Docs
 * writes `background-color: transparent` on every span).
 */
function normalizeHighlight(value: string | null | undefined): string | null {
  const color = value == null ? null : normalizeStyleValue('background-color', value);
  return color === 'transparent' ? null : color;
}

/** The mark attributes for `attributes`, `null` when the color is given but invalid. */
function highlightAttrs({ color = null }: HighlightAttributes): { color: string | null } | null {
  if (color === null) return { color };
  const value = normalizeHighlight(color);
  return value ? { color: value } : null;
}

/**
 * The `highlight` mark (`<mark>`, or `<mark style="background-color: x">` with a color),
 * docs/SPEC.md F-209. Also parsed from a `background-color` style.
 */
export const Highlight = defineExtension({
  name: 'highlight',
  priority: 101,
  marks: () => ({
    highlight: {
      attrs: { color: { default: null } },
      parseDOM: [
        {
          tag: 'mark',
          getAttrs: (node) => ({ color: normalizeHighlight(readStyle(node, 'background-color')) }),
        },
        {
          style: 'background-color',
          getAttrs: (value: string) => {
            const color = normalizeHighlight(value);
            return color ? { color } : false;
          },
        },
      ],
      group: 'formatting',
      toDOM: (mark) =>
        mark.attrs.color
          ? ['mark', { style: buildStyle({ 'background-color': mark.attrs.color }) }, 0]
          : ['mark', 0],
    },
  }),
  commands: ({ schema }) => {
    const type = schema.marks.highlight!;
    return {
      setHighlight: (attributes = {}) => {
        const attrs = highlightAttrs(attributes);
        return attrs ? setMark(type, attrs) : () => false;
      },
      unsetHighlight: () => unsetMark(type),
      toggleHighlight: (attributes) => {
        if (!attributes) return toggleMark(type);
        const attrs = highlightAttrs(attributes);
        return attrs ? toggleMark(type, attrs) : () => false;
      },
    };
  },
  keymap: ({ editor }) => ({
    'Mod-Shift-h': () => editor.commands.toggleHighlight(),
  }),
  inputRules: ({ schema }) => [markInputRule(/(?:^|[^=])==([^=]+)==$/, schema.marks.highlight!)],
});
