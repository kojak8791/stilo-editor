import type { MarkType } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /** Removes every formatting mark (all marks except links) from the selection. */
    clearFormatting: () => Command;
  }
}

/** Command: removes the marks of `types` from the selection, or from the stored marks. */
function clearMarks(types: readonly MarkType[]): Command {
  return (state, dispatch) => {
    const { empty, $from, ranges } = state.selection;
    if (empty) {
      const marks = state.storedMarks ?? $from.marks();
      const kept = marks.filter((mark) => !types.includes(mark.type));
      if (kept.length === marks.length) return false;
      dispatch?.(state.tr.setStoredMarks(kept));
      return true;
    }

    const hasMark = ranges.some((range) =>
      types.some((type) => state.doc.rangeHasMark(range.$from.pos, range.$to.pos, type)),
    );
    if (!hasMark) return false;

    if (dispatch) {
      const tr = state.tr;
      for (const range of ranges) {
        for (const type of types) tr.removeMark(range.$from.pos, range.$to.pos, type);
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

/**
 * The `clearFormatting` command, docs/SPEC.md F-212: removes the marks of the `formatting`
 * group (docs/ARCHITECTURE.md §7.2), so links stay.
 */
export const ClearFormatting = defineExtension({
  name: 'clearFormatting',
  commands: ({ schema }) => {
    const types = Object.values(schema.marks).filter((type) =>
      (type.spec.group ?? '').split(' ').includes('formatting'),
    );
    return { clearFormatting: () => clearMarks(types) };
  },
  keymap: ({ editor }) => ({
    'Mod-\\': () => editor.commands.clearFormatting(),
  }),
});
