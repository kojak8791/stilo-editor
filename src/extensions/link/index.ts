import type { MarkType } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { markRangeAt, setMark, unsetMark } from '../../core/helpers/marks';
import { isAllowedHref } from '../../core/html/sanitize';

/** Attributes of the `link` mark. */
export interface LinkAttributes {
  href: string;
  /** `'_blank'` opens the link in a new tab; omitted or `null` for none. */
  target?: '_blank' | null;
}

declare module '../../core/types' {
  interface Commands {
    /**
     * Links the selection, or updates the whole link at the cursor. Returns `false` when `href`
     * is empty or not allowed, or with a cursor outside a link.
     */
    setLink: (attributes: LinkAttributes) => Command;
    /** Removes links from the selection, or the whole link at the cursor. */
    unsetLink: () => Command;
  }
}

/** Reads the attributes of an `<a>`: `false` (not a link) when `href` is empty or not allowed. */
function parseLink(element: HTMLElement): LinkAttributes | false {
  const href = element.getAttribute('href')?.trim() ?? '';
  if (!href || !isAllowedHref(href)) return false;
  return { href, target: element.getAttribute('target') === '_blank' ? '_blank' : null };
}

/** Command: adds the link to the selection, or replaces the link at the cursor. */
function setLink(type: MarkType, { href, target = null }: LinkAttributes): Command {
  return (state, dispatch) => {
    const url = href.trim();
    if (!url || !isAllowedHref(url)) return false;
    const attrs = { href: url, target };
    if (!state.selection.empty) return setMark(type, attrs)(state, dispatch);
    const range = markRangeAt(state.selection.$from, type);
    if (!range) return false;
    dispatch?.(state.tr.addMark(range.from, range.to, type.create(attrs)).scrollIntoView());
    return true;
  };
}

/** Command: removes links from the selection, or the link at the cursor. */
function unsetLink(type: MarkType): Command {
  return (state, dispatch) => {
    if (!state.selection.empty) return unsetMark(type)(state, dispatch);
    const range = markRangeAt(state.selection.$from, type);
    if (!range) return false;
    dispatch?.(state.tr.removeMark(range.from, range.to, type).scrollIntoView());
    return true;
  };
}

/**
 * The `link` mark (`<a href target rel>`), docs/SPEC.md F-206. `rel="noopener noreferrer
 * nofollow"` is written when `target="_blank"`. No shortcut: `Mod-k` belongs to the link popover.
 */
export const Link = defineExtension({
  name: 'link',
  priority: 103,
  marks: () => ({
    link: {
      attrs: { href: {}, target: { default: null } },
      inclusive: false,
      parseDOM: [{ tag: 'a[href]', getAttrs: parseLink }],
      toDOM: (mark) => [
        'a',
        mark.attrs.target === '_blank'
          ? { href: mark.attrs.href, target: '_blank', rel: 'noopener noreferrer nofollow' }
          : { href: mark.attrs.href },
        0,
      ],
    },
  }),
  commands: ({ schema }) => {
    const type = schema.marks.link!;
    return {
      setLink: (attributes) => setLink(type, attributes),
      unsetLink: () => unsetLink(type),
    };
  },
});
