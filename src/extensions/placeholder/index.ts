import { type EditorState, Plugin } from 'prosemirror-state';
import { Decoration as PMDecoration, DecorationSet as PMDecorationSet } from 'prosemirror-view';
import { defineExtension } from '../../core/extension';

/** Options of {@link Placeholder}. */
export interface PlaceholderOptions {
  /** The hint text shown when the document is empty. Default: `''` (no placeholder). */
  placeholder: string;
}

/**
 * Shows a hint text when the document is empty, docs/SPEC.md F-011.
 *
 * The empty paragraph gets a node decoration with `class="stilo-placeholder"` and
 * `data-placeholder="<the text>"`. "Empty" follows `Editor.isEmpty`: one child,
 * a `paragraph`, with content size 0.
 */
export const Placeholder = defineExtension<PlaceholderOptions>({
  name: 'placeholder',
  defaultOptions: { placeholder: '' },
  plugins: ({ options }) => [
    new Plugin({
      props: {
        decorations(state: EditorState) {
          if (!options.placeholder) return null;
          const { doc } = state;
          if (doc.childCount !== 1) return null;
          const first = doc.firstChild;
          if (first?.type.name !== 'paragraph' || first.content.size !== 0) return null;
          return PMDecorationSet.create(doc, [
            PMDecoration.node(0, first.nodeSize, {
              class: 'stilo-placeholder',
              'data-placeholder': options.placeholder,
            }),
          ]);
        },
      },
    }),
  ],
});
