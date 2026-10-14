import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import type { TextAlignment } from '../../core/helpers/block-style';
import { setTextblockAttr } from '../../core/helpers/nodes';
import { normalizeStyleValue } from '../../core/html/css';

declare module '../../core/types' {
  interface Commands {
    /**
     * Aligns the selected paragraphs and headings. `false` for another value, or when no
     * selected block can be aligned.
     */
    setTextAlign: (alignment: TextAlignment) => Command;
  }
}

/**
 * Text alignment of paragraphs and headings (docs/SPEC.md F-308): the command and its
 * shortcuts. The `textAlign` attribute itself belongs to the `paragraph` and `heading` nodes, so
 * aligned content keeps its alignment without this extension.
 */
export const TextAlign = defineExtension({
  name: 'textAlign',
  // Its keymap goes before the marks': without a Shift binding there, ProseMirror falls back to
  // the key without Shift, and Mod-Shift-e would toggle code (Mod-e) with Caps Lock on.
  priority: 101,
  commands: () => ({
    setTextAlign: (alignment) => {
      const value = normalizeStyleValue('text-align', alignment);
      if (!value) return () => false;
      return setTextblockAttr('textAlign', value === 'left' ? null : value);
    },
  }),
  keymap: ({ editor }) => ({
    'Mod-Shift-l': () => editor.commands.setTextAlign('left'),
    'Mod-Shift-e': () => editor.commands.setTextAlign('center'),
    'Mod-Shift-r': () => editor.commands.setTextAlign('right'),
    'Mod-Shift-j': () => editor.commands.setTextAlign('justify'),
  }),
});

export type { TextAlignment } from '../../core/helpers/block-style';
