import { dropCursor } from 'prosemirror-dropcursor';
import { defineExtension } from '../../core/extension';

/** Options of {@link DropCursor}. */
export interface DropCursorOptions {
  /** CSS color of the cursor. `false` = no inline color; style with `class`. Default: `'currentColor'`. */
  color: string | false;
  /** Width in pixels. Default: `1`. */
  width: number;
  /** Extra CSS class of the cursor element. No default. */
  class?: string;
}

/**
 * Shows a line where a dragged item would be dropped, docs/SPEC.md F-012.
 *
 * Wraps `prosemirror-dropcursor`; everything is handled by the package.
 */
export const DropCursor = defineExtension<DropCursorOptions>({
  name: 'dropCursor',
  defaultOptions: { color: 'currentColor', width: 1 },
  plugins: ({ options }) => [dropCursor(options)],
});
