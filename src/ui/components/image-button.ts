import { autoUpdate, computePosition, hide, offset } from '@floating-ui/dom';
import { Pencil } from 'lucide';
import type { Editor } from '../../index';
import type { Messages } from '../i18n/types';
import { createIcon } from './icon';
import { imageNodePos, selectedImageElement } from './image-dialog';

/** Options of {@link createImageButton}. */
export interface ImageButtonOptions {
  /** The element the button scrolls with: the parent of the editable element. */
  container: HTMLElement;
  messages: Messages;
  /** Opens the image dialog on the image, which the button has just selected. */
  onEdit(): void;
}

/** The edit button over the image under the mouse or the selected image. */
export interface ImageButton {
  /** Shows, moves or hides the button after the selection, the focus or the mouse changed. */
  update(): void;
  destroy(): void;
}

/** Distance in px between the button and the corner of the image. */
const GAP = 6;

/**
 * Creates the edit button of images and figures, which follows the editor on its own: over the
 * top right corner of the image under the mouse, else of the selected one while the editor has
 * the focus.
 */
export function createImageButton(editor: Editor, options: ImageButtonOptions): ImageButton {
  const { container, messages, onEdit } = options;
  const { view } = editor;
  /** The `span.stilo-image` the button is on. */
  let box: HTMLElement | null = null;
  /** The `span.stilo-image` under the mouse. */
  let hovered: HTMLElement | null = null;
  let stopAutoUpdate: (() => void) | undefined;
  let generation = 0;

  const label = messages['image.edit'];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'stilo-image-button';
  button.tabIndex = -1;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-haspopup', 'dialog');
  button.hidden = true;
  button.append(createIcon(Pencil));
  container.append(button);

  function position(): void {
    if (!box) return;
    // Ignore results that arrive after the button moved to another image.
    const current = ++generation;
    Promise.resolve(
      computePosition(box, button, {
        strategy: 'absolute',
        placement: 'top-end',
        // Inside the image, in its corner.
        middleware: [
          offset(({ rects }) => ({ mainAxis: -rects.floating.height - GAP, alignmentAxis: GAP })),
          hide(),
        ],
      }).then(({ x, y, middlewareData }) => {
        if (current !== generation) return;
        button.style.left = `${x}px`;
        button.style.top = `${y}px`;
        button.style.visibility = middlewareData.hide?.referenceHidden ? 'hidden' : '';
      }),
    );
  }

  function show(next: HTMLElement | null): void {
    if (next === box) return;
    box = next;
    stopAutoUpdate?.();
    stopAutoUpdate = undefined;
    generation++;
    button.hidden = !box;
    if (box) stopAutoUpdate = autoUpdate(box, button, position);
  }

  function update(): void {
    if (hovered && !hovered.isConnected) hovered = null;
    const selected = view.hasFocus() ? selectedImageElement(editor) : null;
    show(editor.isEditable ? (hovered ?? selected) : null);
  }

  const onMousemove = (event: MouseEvent): void => {
    const target = event.target as Element;
    if (target === button || button.contains(target)) return;
    const over = target.closest<HTMLElement>('.stilo-image');
    hovered = over && view.dom.contains(over) ? over : null;
    update();
  };
  const onMouseleave = (): void => {
    hovered = null;
    update();
  };
  // The editor keeps the focus while the button is clicked.
  const onMousedown = (event: MouseEvent): void => {
    event.preventDefault();
  };
  const onClick = (): void => {
    if (!box) return;
    editor.commands.selectNode(imageNodePos(editor, box));
    onEdit();
  };

  container.addEventListener('mousemove', onMousemove);
  container.addEventListener('mouseleave', onMouseleave);
  button.addEventListener('mousedown', onMousedown);
  button.addEventListener('click', onClick);
  editor.on('transaction', update);
  editor.on('focus', update);
  editor.on('blur', update);

  function destroy(): void {
    container.removeEventListener('mousemove', onMousemove);
    container.removeEventListener('mouseleave', onMouseleave);
    button.removeEventListener('mousedown', onMousedown);
    button.removeEventListener('click', onClick);
    editor.off('transaction', update);
    editor.off('focus', update);
    editor.off('blur', update);
    show(null);
    button.remove();
  }

  return { update, destroy };
}
