import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { isNodeActive } from '../../core/helpers/active';
import { blockStyleAttrs, blockStyleDOM, parseBlockStyle } from '../../core/helpers/block-style';
import { textblockTypeInputRule } from '../../core/helpers/input-rules';
import { setTextblockType } from '../../core/helpers/nodes';

declare module '../../core/types' {
  interface Commands {
    /** Turns the selected textblocks into a heading of the given level. */
    setHeading: (attrs: { level: HeadingLevel }) => Command;
    /** Toggles the heading level: removes it when the whole selection matches, otherwise sets it. */
    toggleHeading: (attrs: { level: HeadingLevel }) => Command;
  }
}

/** A heading level. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Options of {@link Heading}. */
export interface HeadingOptions {
  /** Allowed levels. Default: all six. */
  levels: HeadingLevel[];
}

/**
 * The `heading` node (`<h1>`…`<h6>`, with `style` for its alignment and line height),
 * docs/SPEC.md F-302.
 */
export const Heading = defineExtension<HeadingOptions>({
  name: 'heading',
  defaultOptions: { levels: [1, 2, 3, 4, 5, 6] },
  nodes: ({ levels }) => ({
    heading: {
      group: 'block',
      content: 'inline*',
      defining: true,
      attrs: { level: { default: levels[0] ?? 1 }, ...blockStyleAttrs() },
      parseDOM: levels.map((level) => ({
        tag: `h${level}`,
        getAttrs: (node: HTMLElement) => ({ level, ...parseBlockStyle(node) }),
      })),
      toDOM: (node) => blockStyleDOM(`h${node.attrs.level}`, node),
    },
  }),
  commands: ({ schema, options }) => {
    const heading = schema.nodes.heading!;
    const setHeading = (attrs: { level: HeadingLevel }): Command => {
      if (!options.levels.includes(attrs.level)) return () => false;
      return setTextblockType(heading, { level: attrs.level });
    };
    return {
      setHeading,
      toggleHeading: (attrs) => {
        return (state, dispatch) => {
          if (isNodeActive(state, heading, { level: attrs.level })) {
            return setTextblockType(schema.nodes.paragraph!)(state, dispatch);
          }
          return setHeading(attrs)(state, dispatch);
        };
      },
    };
  },
  keymap: ({ editor, options }) =>
    Object.fromEntries(
      options.levels.map((level) => [
        `Mod-Alt-${level}`,
        () => editor.commands.toggleHeading({ level }),
      ]),
    ),
  inputRules: ({ schema, options }) =>
    options.levels.map((level) =>
      textblockTypeInputRule(new RegExp(`^#{${level}}\\s$`), schema.nodes.heading!, { level }),
    ),
});
