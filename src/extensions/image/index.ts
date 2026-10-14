import { Fragment, type Node, Slice } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Editor } from '../../core/editor';
import { defineExtension } from '../../core/extension';
import { isAllowedImageSrc } from '../../core/html/sanitize';
import { ImageView, imageAttributes } from './image-view';

declare module '../../core/types' {
  interface EditorEvents {
    /**
     * A pasted image file was not inserted: larger than `maxInlineBytes` (`tooLarge`), or not a
     * PNG, JPEG, GIF or WebP image (`unsupportedType`).
     */
    imageRejected: { editor: Editor; file: File; reason: 'tooLarge' | 'unsupportedType' };
  }
}

/** Options of {@link Image}. */
export interface ImageOptions {
  /** Largest image file, in bytes, that paste inserts as a data URL. Default: 5 MB. */
  maxInlineBytes: number;
}

/** The image files of a paste, or none when the clipboard also has HTML (pasted as such). */
function pastedImageFiles(event: ClipboardEvent): File[] {
  const data = event.clipboardData;
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

/**
 * The `image` node (`<img src alt title width height>`, inline), docs/SPEC.md F-601, with the
 * paste of image files (F-603, F-608) and the resize handles (F-607).
 *
 * Paste: when the clipboard has HTML, ProseMirror pastes it (an image copied from a web page keeps
 * its URL); otherwise each image file becomes an `image` with a base64 `data:` URL, in place of
 * the selection at the time the files have been read. A file larger than `maxInlineBytes` or of
 * another type is skipped and reported with the `imageRejected` event.
 */
export const Image = defineExtension<ImageOptions>({
  name: 'image',
  defaultOptions: { maxInlineBytes: 5 * 1024 * 1024 },
  nodes: () => ({
    image: {
      inline: true,
      group: 'inline',
      atom: true,
      draggable: true,
      attrs: {
        src: {},
        alt: { default: null },
        title: { default: null },
        width: { default: null },
        height: { default: null },
      },
      parseDOM: [
        {
          tag: 'img[src]',
          getAttrs: (img: HTMLElement) => ({
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt') || null,
            title: img.getAttribute('title') || null,
            width: parseDimension(img.getAttribute('width')),
            height: parseDimension(img.getAttribute('height')),
          }),
        },
      ],
      toDOM: (node) => ['img', imageAttributes(node)],
    },
  }),
  plugins: ({ schema, options, editor, emit }) => {
    const type = schema.nodes.image!;

    async function insertFiles(view: EditorView, files: File[]): Promise<void> {
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
      if (nodes.length === 0 || view.isDestroyed) return;
      const slice = new Slice(Fragment.from(nodes), 0, 0);
      view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
    }

    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const files = pastedImageFiles(event);
            if (files.length === 0) return false;
            void insertFiles(view, files);
            return true;
          },
          nodeViews: {
            image: (node, view, getPos) => new ImageView(node, view, getPos),
          },
        },
      }),
    ];
  },
});
