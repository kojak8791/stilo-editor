import type { Node } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';

/** Smallest width, in pixels, that the handles give an image. */
const MIN_WIDTH = 32;

/** The attributes of an `image` node, in HTML output order. */
const ATTRIBUTES = ['src', 'alt', 'title', 'width', 'height'] as const;

/** The HTML attributes of an `image` node, in output order, without the empty ones. */
export function imageAttributes(node: Node): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const name of ATTRIBUTES) {
    const value = node.attrs[name];
    if (value != null && value !== '') attributes[name] = String(value);
  }
  return attributes;
}

/**
 * The `image` node in the editor: the `<img>` inside a `span.stilo-image` with two side handles,
 * shown while the image is selected (docs/SPEC.md F-607). Dragging a handle changes the width
 * and keeps the aspect ratio; releasing it sets `width` and `height` in one transaction.
 */
export class ImageView implements NodeView {
  readonly dom: HTMLElement;
  private readonly img: HTMLImageElement;
  private node: Node;

  constructor(
    node: Node,
    private readonly view: EditorView,
    private readonly getPos: () => number | undefined,
  ) {
    this.node = node;
    this.dom = document.createElement('span');
    this.dom.className = 'stilo-image';
    this.img = document.createElement('img');
    this.dom.append(this.createHandle('left'), this.img, this.createHandle('right'));
    this.render();
  }

  update(node: Node): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.render();
    return true;
  }

  /** The handles handle their own pointer events: ProseMirror must not select or drag. */
  stopEvent(event: Event): boolean {
    return event.target instanceof HTMLElement && event.target.dataset.handle !== undefined;
  }

  /** The view changes only the inline width of the `<img>` while a handle is dragged. */
  ignoreMutation(): boolean {
    return true;
  }

  private render(): void {
    const attributes = imageAttributes(this.node);
    for (const name of ATTRIBUTES) {
      const value = attributes[name];
      if (value === undefined) this.img.removeAttribute(name);
      else this.img.setAttribute(name, value);
    }
  }

  private createHandle(side: 'left' | 'right'): HTMLElement {
    const handle = document.createElement('span');
    handle.className = `stilo-image__handle stilo-image__handle--${side}`;
    handle.dataset.handle = side;
    handle.setAttribute('aria-hidden', 'true');
    handle.addEventListener('pointerdown', (event) => this.startResize(event, side));
    return handle;
  }

  private startResize(event: PointerEvent, side: 'left' | 'right'): void {
    if (!this.view.editable || event.button !== 0) return;
    event.preventDefault();
    const rect = this.img.getBoundingClientRect();
    const { naturalWidth, naturalHeight } = this.img;
    const ratio =
      naturalWidth && naturalHeight ? naturalHeight / naturalWidth : rect.height / rect.width;
    const maxWidth = this.view.dom.clientWidth || Number.POSITIVE_INFINITY;
    const direction = side === 'left' ? -1 : 1;
    const startX = event.clientX;
    let width: number | null = null;

    const onMove = (move: PointerEvent): void => {
      const wanted = rect.width + direction * (move.clientX - startX);
      width = Math.round(Math.min(Math.max(wanted, MIN_WIDTH), maxWidth));
      this.img.style.width = `${width}px`;
    };
    const onUp = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      this.img.style.removeProperty('width');
      if (width !== null) {
        this.setSize(width, Number.isFinite(ratio) ? Math.round(width * ratio) : null);
      }
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  /** Sets `width` and `height`; attribute steps keep the image selected. */
  private setSize(width: number, height: number | null): void {
    const pos = this.getPos();
    const { attrs } = this.node;
    if (pos === undefined || (attrs.width === width && attrs.height === height)) return;
    const tr = this.view.state.tr
      .setNodeAttribute(pos, 'width', width)
      .setNodeAttribute(pos, 'height', height);
    this.view.dispatch(tr);
  }
}
