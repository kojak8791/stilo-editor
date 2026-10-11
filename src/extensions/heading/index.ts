import { setBlockType } from 'prosemirror-commands';
import { textblockTypeInputRule } from 'prosemirror-inputrules';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { isNodeActive } from '../../core/helpers/active';

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
 * The `heading` node (`<h1>`…`<h6>`), docs/SPEC.md F-302.
 */
export const Heading = defineExtension<HeadingOptions>({
  name: 'heading',
  defaultOptions: { levels: [1, 2, 3, 4, 5, 6] },
  nodes: ({ levels }) => ({
    heading: {
      group: 'block',
      content: 'inline*',
      defining: true,
      attrs: { level: { default: levels[0] ?? 1 } },
      parseDOM: levels.map((level) => ({ tag: `h${level}`, attrs: { level } })),
      toDOM: (node) => [`h${node.attrs.level}`, 0],
    },
  }),
  commands: ({ schema, options }) => {
    const heading = schema.nodes.heading!;
    const setHeading = (attrs: { level: HeadingLevel }): Command => {
      if (!options.levels.includes(attrs.level)) return () => false;
      return setBlockType(heading, { level: attrs.level });
    };
    return {
      setHeading,
      toggleHeading: (attrs) => {
        return (state, dispatch) => {
          if (isNodeActive(state, heading, { level: attrs.level })) {
            return setBlockType(schema.nodes.paragraph!)(state, dispatch);
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
