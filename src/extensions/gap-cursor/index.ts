import { gapCursor } from 'prosemirror-gapcursor';
import { defineExtension } from '../../core/extension';

/**
 * Creates a gap cursor where no text cursor can go, docs/SPEC.md F-012.
 *
 * Wraps `prosemirror-gapcursor`; everything is handled by the package.
 */
export const GapCursor = defineExtension({
  name: 'gapCursor',
  plugins: () => [gapCursor()],
});
