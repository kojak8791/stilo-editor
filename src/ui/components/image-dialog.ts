import type { VirtualElement } from '@floating-ui/dom';
import type { Editor, ImageAttributes } from '../../index';
import type { MessageKey, Messages } from '../i18n/types';
import { createPopover } from './popover';

/** Options of {@link createImageDialog}. */
export interface ImageDialogOptions {
  /** The element the dialog scrolls with: the parent of the editable element. */
  container: HTMLElement;
  messages: Messages;
}

/** The image dialog: inserts a figure, or edits the selected image or figure. */
export interface ImageDialog {
  readonly isOpen: boolean;
  /** Opens the dialog; does nothing when {@link canEditImage} is false. */
  open(): void;
  close(): void;
  destroy(): void;
}

/** Any allowed URL: asks `commands.insertFigure.can()` whether a figure can go here. */
const PROBE_SRC = 'https://example.com/a.png';

/** The image types the file field takes (docs/SPEC.md NFR-2). */
const FILE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/** Whether the selection is on an image or a figure (selected, or the cursor in its caption). */
export function isImageSelected(editor: Editor): boolean {
  return editor.isActive('image') || editor.isActive('figure');
}

/**
 * Whether the editor is editable and the selection is on an image or a figure (to edit), or
 * where a figure can be inserted.
 */
export function canEditImage(editor: Editor): boolean {
  return (
    editor.isEditable &&
    (isImageSelected(editor) || editor.commands.insertFigure.can({ src: PROBE_SRC }))
  );
}

/**
 * The `span.stilo-image` (the image and its handles) of the selected image or figure, or of the
 * figure whose caption holds the cursor; `null` otherwise.
 */
export function selectedImageElement(editor: Editor): HTMLElement | null {
  if (!isImageSelected(editor)) return null;
  const { view } = editor;
  const { from } = editor.state.selection;
  const dom = view.nodeDOM(from) ?? view.domAtPos(from).node;
  const element = dom instanceof Element ? dom : dom.parentElement;
  const figure = element?.closest('.stilo-figure');
  const box = figure
    ? figure.querySelector(':scope > .stilo-image')
    : element?.closest('.stilo-image');
  return box instanceof HTMLElement && view.dom.contains(box) ? box : null;
}

/** The document position of the `image` or `figure` node drawn by `box` (a `span.stilo-image`). */
export function imageNodePos(editor: Editor, box: HTMLElement): number {
  const dom = box.closest('.stilo-figure') ?? box;
  const parent = dom.parentNode!;
  return editor.view.posAtDOM(parent, Array.prototype.indexOf.call(parent.childNodes, dom));
}

/** A labeled text field of the dialog. */
function createField(
  labelText: string,
  type: 'text' | 'number',
): { label: HTMLLabelElement; input: HTMLInputElement } {
  const label = document.createElement('label');
  label.className = 'stilo-image-dialog__field';
  const input = document.createElement('input');
  input.type = type;
  input.className = 'stilo-image-dialog__input';
  input.autocomplete = 'off';
  label.append(labelText, input);
  return { label, input };
}

/** Reads a file as a `data:` URL, `''` when it cannot be read. */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Creates the image dialog (closed). It opens under the selected image or figure to edit it
 * (`updateImage`), otherwise under the selection to insert a figure (`insertFigure`).
 */
export function createImageDialog(editor: Editor, options: ImageDialogOptions): ImageDialog {
  const { container, messages } = options;
  /** The image being edited, `null` while inserting. */
  let editing: HTMLElement | null = null;
  /** The `data:` URL of a chosen file or of the embedded image; `null` for the address field. */
  let embedded: string | null = null;
  /** The width the dialog opened with, as text. */
  let initialWidth = '';
  let initialSrc = '';

  const anchor: VirtualElement = {
    contextElement: editor.view.dom,
    getBoundingClientRect: () => {
      if (editing?.isConnected) return editing.getBoundingClientRect();
      const { from, to } = editor.state.selection;
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const left = Math.min(start.left, end.left);
      const right = Math.max(start.right, end.right);
      return new DOMRect(left, start.top, right - left, end.bottom - start.top);
    },
  };

  const content = document.createElement('div');
  content.className = 'stilo-image-dialog';
  content.setAttribute('role', 'dialog');

  const form = document.createElement('form');
  form.className = 'stilo-image-dialog__form';

  const source = document.createElement('div');
  source.className = 'stilo-image-dialog__source';
  const url = document.createElement('input');
  url.type = 'text';
  url.inputMode = 'url';
  url.className = 'stilo-image-dialog__input stilo-image-dialog__url';
  url.placeholder = 'https://';
  url.autocomplete = 'off';
  url.spellcheck = false;
  url.setAttribute('aria-label', messages['image.url']);
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = FILE_TYPES.join(',');
  file.hidden = true;
  const choose = createButton('button', messages['image.chooseFile']);
  source.append(url, choose, file);

  const preview = document.createElement('img');
  preview.className = 'stilo-image-dialog__preview';
  preview.alt = '';
  preview.hidden = true;

  const alt = createField(messages['image.alt'], 'text');
  const title = createField(messages['image.title'], 'text');
  const caption = createField(messages['image.caption'], 'text');
  const width = createField(messages['image.width'], 'number');
  width.input.min = '1';
  width.input.step = '1';

  const error = document.createElement('p');
  error.className = 'stilo-image-dialog__error';
  error.setAttribute('role', 'alert');
  error.hidden = true;

  const actions = document.createElement('div');
  actions.className = 'stilo-image-dialog__actions';
  const submit = createButton('submit', '');
  submit.classList.add('stilo-image-dialog__button--primary');
  actions.append(submit);

  form.append(source, preview, alt.label, title.label, caption.label, width.label, error, actions);
  content.append(form);

  const popover = createPopover({
    anchor,
    content,
    container,
    onClose: (reason) => {
      if (reason === 'escape') editor.focus();
    },
  });

  function showError(key: MessageKey | null): void {
    error.hidden = key === null;
    error.textContent = key ? messages[key] : '';
    if (key) url.setAttribute('aria-invalid', 'true');
    else url.removeAttribute('aria-invalid');
  }

  function showPreview(src: string): void {
    preview.hidden = !src;
    if (src) preview.src = src;
    else preview.removeAttribute('src');
  }

  /** The height for `value` px of width: the ratio of the loaded preview, else of the image. */
  function heightFor(value: number): number | null {
    const { naturalWidth, naturalHeight } = preview;
    if (!preview.hidden && naturalWidth && naturalHeight) {
      return Math.round((value * naturalHeight) / naturalWidth);
    }
    const attrs = editor.getAttributes(editor.isActive('image') ? 'image' : 'figure');
    const [w, h] = [attrs.width, attrs.height];
    return typeof w === 'number' && typeof h === 'number' ? Math.round((value * h) / w) : null;
  }

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    const src = embedded ?? url.value.trim();
    if (!src) {
      showError('image.required');
      url.focus();
      return;
    }
    const attributes: Partial<ImageAttributes> = {
      src,
      alt: alt.input.value.trim(),
      title: title.input.value.trim(),
    };
    // The size is set only when the width or the image changed: the handles keep theirs.
    if (width.input.value !== initialWidth || src !== initialSrc) {
      const value = Number(width.input.value);
      const valid = Number.isInteger(value) && value > 0;
      attributes.width = valid ? value : null;
      attributes.height = valid ? heightFor(value) : null;
    }
    const done = editing
      ? editor.commands.updateImage(attributes)
      : editor.commands.insertFigure({ ...attributes, src, caption: caption.input.value.trim() });
    if (!done) {
      showError(embedded ? 'image.tooLarge' : 'image.invalidUrl');
      url.focus();
      return;
    }
    popover.close();
    editor.focus();
  };

  const onUrlInput = (): void => {
    embedded = null;
    showError(null);
    showPreview(url.value.trim());
  };

  const onChoose = (): void => {
    file.click();
  };

  const onFileChange = async (): Promise<void> => {
    const chosen = file.files?.[0];
    file.value = '';
    if (!chosen) return;
    if (!FILE_TYPES.includes(chosen.type)) {
      showError('image.unsupported');
      return;
    }
    const src = await readAsDataURL(chosen);
    if (!src) return;
    embedded = src;
    url.value = chosen.name;
    showError(null);
    showPreview(src);
    if (!alt.input.value) alt.input.focus();
  };

  // The width field shows the natural width of the image as a hint.
  const onPreviewLoad = (): void => {
    width.input.placeholder = preview.naturalWidth ? String(preview.naturalWidth) : '';
  };

  form.addEventListener('submit', onSubmit);
  url.addEventListener('input', onUrlInput);
  choose.addEventListener('click', onChoose);
  file.addEventListener('change', onFileChange);
  preview.addEventListener('load', onPreviewLoad);

  function open(): void {
    if (popover.isOpen || !canEditImage(editor)) return;
    editing = isImageSelected(editor) ? selectedImageElement(editor) : null;
    const attrs = editing
      ? editor.getAttributes(editor.isActive('image') ? 'image' : 'figure')
      : {};
    const text = (value: unknown): string => (typeof value === 'string' ? value : '');
    initialSrc = text(attrs.src);
    embedded = initialSrc.startsWith('data:') ? initialSrc : null;
    url.value = embedded ? messages['image.embedded'] : initialSrc;
    alt.input.value = text(attrs.alt);
    title.input.value = text(attrs.title);
    caption.input.value = '';
    caption.label.hidden = editing !== null;
    initialWidth = typeof attrs.width === 'number' ? String(attrs.width) : '';
    width.input.value = initialWidth;
    width.input.placeholder = '';
    const label = messages[editing ? 'image.edit' : 'image.insert'];
    content.setAttribute('aria-label', label);
    submit.textContent = messages[editing ? 'image.apply' : 'image.insertButton'];
    showError(null);
    showPreview(initialSrc);
    popover.open();
    // The position arrives asynchronously: a scrolling focus would jump to the container's top.
    url.focus({ preventScroll: true });
    url.select();
  }

  function destroy(): void {
    form.removeEventListener('submit', onSubmit);
    url.removeEventListener('input', onUrlInput);
    choose.removeEventListener('click', onChoose);
    file.removeEventListener('change', onFileChange);
    preview.removeEventListener('load', onPreviewLoad);
    popover.destroy();
  }

  return {
    get isOpen() {
      return popover.isOpen;
    },
    open,
    close: () => popover.close(),
    destroy,
  };
}

function createButton(type: 'submit' | 'button', label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = type;
  button.className = 'stilo-image-dialog__button';
  button.textContent = label;
  return button;
}
