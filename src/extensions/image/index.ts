import { DOMParser, Fragment, type Node, type Schema, Slice } from 'prosemirror-model';
import {
  type Command,
  type EditorState,
  NodeSelection,
  Plugin,
  TextSelection,
} from 'prosemirror-state';
import { dropPoint } from 'prosemirror-transform';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import type { Editor } from '../../core/editor';
import { defineExtension } from '../../core/extension';
import { insertBlock } from '../../core/helpers/nodes';
import { isAllowedImageSrc } from '../../core/html/sanitize';
import { ImageView, imageAttributes } from './image-view';

/** Attributes of an `image` or a `figure` (docs/ARCHITECTURE.md §7.1). */
export interface ImageAttributes {
  src: string;
  alt?: string | null;
  title?: string | null;
  /** Whole pixels; `null` for the natural size. */
  width?: number | null;
  height?: number | null;
}

/** What `insertFigure` takes: the image and its caption, as plain text. */
export interface FigureAttributes extends ImageAttributes {
  caption?: string;
}

declare module '../../core/types' {
  interface Commands {
    /**
     * Inserts a `figure` in place of the selection and puts the cursor in the textblock after
     * it. Returns `false` when `src` is not allowed or is a `data:` URL larger than
     * `maxInlineBytes`, or where the selection's container does not take a block.
     */
    insertFigure: (attributes: FigureAttributes) => Command;
    /**
     * Changes the attributes given (`null` clears one) of the selected `image` or `figure`, or
     * of the figure whose caption holds the selection. Returns `false` without one, or for a
     * `src` that `insertFigure` refuses.
     */
    updateImage: (attributes: Partial<ImageAttributes>) => Command;
  }

  interface EditorEvents {
    /**
     * A pasted or dropped image file was not inserted: larger than `maxInlineBytes`
     * (`tooLarge`), or not a PNG, JPEG, GIF or WebP image (`unsupportedType`).
     */
    imageRejected: { editor: Editor; file: File; reason: 'tooLarge' | 'unsupportedType' };
  }
}

/** Options of {@link Image}. */
export interface ImageOptions {
  /**
   * Largest image, in bytes, inserted as a data URL by paste, drop, `insertFigure` and
   * `updateImage`. Default: 5 MB.
   */
  maxInlineBytes: number;
  /** The hint shown in an empty caption while its figure is being edited. Default: `'Caption'`. */
  captionPlaceholder: string;
}

/** The attributes of the `image` and `figure` nodes. */
const IMAGE_ATTRS = {
  src: {},
  alt: { default: null },
  title: { default: null },
  width: { default: null },
  height: { default: null },
};

/**
 * The `<figure>` of a `figure` node with its `<img>`, and the figure itself as the content
 * element (a content hole must be alone in its parent). An empty caption is left out.
 */
function renderFigure(node: Node): HTMLElement | { dom: HTMLElement; contentDOM: HTMLElement } {
  const figure = document.createElement('figure');
  const img = figure.appendChild(document.createElement('img'));
  for (const [name, value] of Object.entries(imageAttributes(node))) img.setAttribute(name, value);
  return node.firstChild?.content.size ? { dom: figure, contentDOM: figure } : figure;
}

/** The image files of a paste or a drop, or none when it also has HTML (inserted as such). */
function imageFiles(data: DataTransfer | null): File[] {
  if (!data || data.getData('text/html')) return [];
  return [...data.files].filter((file) => file.type.startsWith('image/'));
}

/** The file as a `data:` URL, `''` when it cannot be read. */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/** A `width` or `height` attribute in pixels: a whole number, `null` otherwise (`50%`). */
function parseDimension(value: string | null): number | null {
  return value && /^\d+$/.test(value) ? Number(value) : null;
}

/** The attributes of an `<img>`. */
function parseImage(img: Element): ImageAttributes {
  return {
    src: img.getAttribute('src') ?? '',
    alt: img.getAttribute('alt') || null,
    title: img.getAttribute('title') || null,
    width: parseDimension(img.getAttribute('width')),
    height: parseDimension(img.getAttribute('height')),
  };
}

/** The bytes a base64 `data:` URL holds (about), 0 for any other URL. */
function dataBytes(src: string): number {
  return /^data:/i.test(src) ? Math.floor(((src.length - src.indexOf(',') - 1) * 3) / 4) : 0;
}

/** The node attributes of `attributes`: empty texts and sizes that are not whole pixels → `null`. */
function nodeAttrs(attributes: Partial<ImageAttributes>): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  if (attributes.src !== undefined) attrs.src = attributes.src.trim();
  for (const name of ['alt', 'title'] as const) {
    if (attributes[name] !== undefined) attrs[name] = attributes[name] || null;
  }
  for (const name of ['width', 'height'] as const) {
    const value = attributes[name];
    if (value !== undefined) attrs[name] = Number.isInteger(value) && value! > 0 ? value : null;
  }
  return attrs;
}

/**
 * The content of `slice` that a caption takes: the inline nodes of the `caption` group with
 * their marks, a hard break (a space without `hardBreak`) between two textblocks.
 */
function captionContent(slice: Slice, schema: Schema): Fragment {
  const caption = schema.nodes.figcaption!.contentMatch;
  const lineBreak = schema.nodes.hardBreak;
  const nodes: Node[] = [];
  slice.content.descendants((node) => {
    if (node.isTextblock && nodes.length > 0) {
      nodes.push(lineBreak ? lineBreak.create() : schema.text(' '));
    }
    if (node.isInline && caption.matchType(node.type)) nodes.push(node);
    return !node.isInline;
  });
  return Fragment.from(nodes);
}

/**
 * The image or figure that the selection is on: a selected `image` or `figure`, or the figure
 * whose caption holds the selection.
 */
function selectedImage(state: EditorState): { node: Node; pos: number } | null {
  const { selection } = state;
  const { schema } = state;
  if (selection instanceof NodeSelection) {
    const { node } = selection;
    const isImage = node.type === schema.nodes.image || node.type === schema.nodes.figure;
    return isImage ? { node, pos: selection.from } : null;
  }
  const { $from, $to } = selection;
  if ($from.parent.type !== schema.nodes.figcaption || !$from.sameParent($to)) return null;
  return { node: $from.node(-1), pos: $from.before(-1) };
}

/**
 * The `image` node (`<img src alt title width height>`, inline), docs/SPEC.md F-601, and the
 * `figure` node (`<figure>` with an `<img>` and a `<figcaption>`, a block), F-602, with:
 *
 * - paste and drop of image files (F-603, F-604, F-608): when the data has HTML, ProseMirror
 *   inserts it (an image copied from a web page keeps its URL); otherwise each image file becomes
 *   an `image` with a base64 `data:` URL, in place of the selection (paste) or where it is
 *   dropped, once the files have been read. A file larger than `maxInlineBytes` or of another
 *   type is skipped and reported with the `imageRejected` event;
 * - `insertFigure` and `updateImage` (F-605, F-606) and the resize handles (F-607);
 * - the caption: inline content (the `caption` group: text, hard breaks) with any mark. `Enter`
 *   leaves it for a new paragraph after the figure; `Backspace` at its start selects the figure.
 *   While its figure is selected or holds the cursor, an empty caption shows
 *   `captionPlaceholder`.
 */
export const Image = defineExtension<ImageOptions>({
  name: 'image',
  defaultOptions: { maxInlineBytes: 5 * 1024 * 1024, captionPlaceholder: 'Caption' },
  nodes: () => ({
    image: {
      inline: true,
      group: 'inline',
      atom: true,
      draggable: true,
      attrs: IMAGE_ATTRS,
      parseDOM: [{ tag: 'img[src]', getAttrs: (img: HTMLElement) => ({ ...parseImage(img) }) }],
      toDOM: (node) => ['img', imageAttributes(node)],
    },
    figure: {
      group: 'block',
      content: 'figcaption',
      draggable: true,
      isolating: true,
      attrs: IMAGE_ATTRS,
      parseDOM: [
        {
          tag: 'figure',
          getAttrs: (figure: HTMLElement) => {
            const images = [...figure.querySelectorAll('img[src]')];
            const img = images.find((image) => !image.closest('figcaption'));
            return img ? { ...parseImage(img) } : false;
          },
          // The image is read by getAttrs; the caption keeps only what it takes.
          getContent: (figure, schema) => {
            const caption = (figure as HTMLElement).querySelector('figcaption');
            const slice = caption ? DOMParser.fromSchema(schema).parseSlice(caption) : Slice.empty;
            return Fragment.from(
              schema.nodes.figcaption!.create(null, captionContent(slice, schema)),
            );
          },
        },
      ],
      toDOM: renderFigure,
    },
    figcaption: {
      content: 'caption*',
      toDOM: () => ['figcaption', 0],
    },
  }),
  commands: ({ schema, options }) => {
    const accepts = (src: string): boolean =>
      isAllowedImageSrc(src) && dataBytes(src.trim()) <= options.maxInlineBytes;

    const insertFigure =
      ({ caption, ...attributes }: FigureAttributes): Command =>
      (state, dispatch) => {
        if (!accepts(attributes.src)) return false;
        const text = caption ? schema.text(caption) : null;
        const content = schema.nodes.figcaption!.create(null, text);
        return insertBlock(schema.nodes.figure!, nodeAttrs(attributes), content)(state, dispatch);
      };

    const updateImage =
      (attributes: Partial<ImageAttributes>): Command =>
      (state, dispatch) => {
        const target = selectedImage(state);
        if (!target || (attributes.src !== undefined && !accepts(attributes.src))) return false;
        if (dispatch) {
          const tr = state.tr;
          for (const [name, value] of Object.entries(nodeAttrs(attributes))) {
            if (target.node.attrs[name] !== value) tr.setNodeAttribute(target.pos, name, value);
          }
          if (tr.docChanged) dispatch(tr);
        }
        return true;
      };

    return { insertFigure, updateImage };
  },
  keymap: ({ schema }) => {
    const inCaption = (state: EditorState) => {
      const { $from, empty } = state.selection;
      return $from.parent.type === schema.nodes.figcaption ? { $from, empty } : null;
    };
    const leaveCaption: Command = (state, dispatch) => {
      const caption = inCaption(state);
      if (!caption) return false;
      const after = caption.$from.after(-1);
      if (dispatch) {
        const tr = state.tr.insert(after, schema.nodes.paragraph!.create());
        dispatch(tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView());
      }
      return true;
    };
    const selectFigure: Command = (state, dispatch) => {
      const caption = inCaption(state);
      if (!caption?.empty || caption.$from.parentOffset !== 0) return false;
      dispatch?.(state.tr.setSelection(NodeSelection.create(state.doc, caption.$from.before(-1))));
      return true;
    };
    // The caption never merges with the block after it.
    const stayInCaption: Command = (state) => {
      const caption = inCaption(state);
      return !!caption?.empty && caption.$from.parentOffset === caption.$from.parent.content.size;
    };
    return { Enter: leaveCaption, Backspace: selectFigure, Delete: stayInCaption };
  },
  plugins: ({ schema, options, editor, emit }) => {
    const type = schema.nodes.image!;

    /** The image nodes of `files`, once read; the rejected files are reported. */
    async function readFiles(files: File[]): Promise<Node[]> {
      const nodes: Node[] = [];
      for (const file of files) {
        if (file.size > options.maxInlineBytes) {
          emit('imageRejected', { editor, file, reason: 'tooLarge' });
          continue;
        }
        const src = await readAsDataURL(file);
        if (!src) continue;
        if (isAllowedImageSrc(src)) nodes.push(type.create({ src }));
        else emit('imageRejected', { editor, file, reason: 'unsupportedType' });
      }
      return nodes;
    }

    async function pasteFiles(view: EditorView, files: File[]): Promise<void> {
      const nodes = await readFiles(files);
      if (nodes.length === 0 || view.isDestroyed) return;
      const slice = new Slice(Fragment.from(nodes), 0, 0);
      view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
    }

    async function dropFiles(view: EditorView, files: File[], pos: number): Promise<void> {
      const nodes = await readFiles(files);
      if (nodes.length === 0 || view.isDestroyed) return;
      const slice = new Slice(Fragment.from(nodes), 0, 0);
      const { doc } = view.state;
      const at = dropPoint(doc, Math.min(pos, doc.content.size), slice);
      if (at === null) return;
      view.focus();
      view.dispatch(view.state.tr.replaceRange(at, at, slice));
    }

    const figure = schema.nodes.figure!;
    const decorations = (state: EditorState): DecorationSet | null => {
      const target = selectedImage(state);
      if (target?.node.type !== figure) return null;
      const { pos, node } = target;
      const active = [Decoration.node(pos, pos + node.nodeSize, { class: 'stilo-figure--active' })];
      const caption = node.firstChild!;
      if (caption.content.size === 0 && options.captionPlaceholder) {
        active.push(
          Decoration.node(pos + 1, pos + 1 + caption.nodeSize, {
            class: 'stilo-placeholder',
            'data-placeholder': options.captionPlaceholder,
          }),
        );
      }
      return DecorationSet.create(state.doc, active);
    };

    return [
      new Plugin({
        props: {
          // In a caption, only what it takes: no images, blocks become lines.
          handlePaste: (view, event, slice) => {
            const { selection, tr } = view.state;
            if (selection.$from.parent.type === schema.nodes.figcaption) {
              const content = captionContent(slice, schema);
              if (content.size > 0) view.dispatch(tr.replaceSelection(new Slice(content, 0, 0)));
              return true;
            }
            const files = imageFiles(event.clipboardData);
            if (files.length === 0) return false;
            void pasteFiles(view, files);
            return true;
          },
          handleDrop: (view, event, _slice, moved) => {
            const files = moved ? [] : imageFiles(event.dataTransfer);
            const target = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (files.length === 0 || !target) return false;
            event.preventDefault();
            void dropFiles(view, files, target.pos);
            return true;
          },
          // A figure is not an atom: ProseMirror selects it on a click only with Ctrl.
          handleClickOn: (view, _pos, node, nodePos, event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (node.type !== figure || !target?.closest('.stilo-image')) return false;
            view.dispatch(
              view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)),
            );
            return true;
          },
          decorations,
          nodeViews: {
            image: (node, view, getPos) => new ImageView(node, view, getPos),
            figure: (node, view, getPos) => new ImageView(node, view, getPos),
          },
        },
      }),
    ];
  },
});
