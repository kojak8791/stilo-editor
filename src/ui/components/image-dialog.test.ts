import { NodeSelection } from 'prosemirror-state';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor } from '../../../tests/helpers';
import { defaultExtensions } from '../../index';
import { createToolbar } from '../index';

const FIGURE =
  '<figure><img src="a.png" alt="A" width="40" height="20"><figcaption>cap</figcaption></figure>';

function setup(html: string, extensions = [defaultExtensions()]) {
  const editor = createTestEditor({ html, extensions });
  const host = editor.view.dom.parentElement!;
  document.body.append(host);
  // jsdom has no layout: coordsAtPos needs Range.getClientRects.
  vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 0 });
  const container = document.createElement('div');
  document.body.append(container);
  const toolbar = createToolbar(editor, { container });
  const button = toolbar.element.querySelector<HTMLButtonElement>('[data-item="image"]')!;
  const dialog = host.querySelector<HTMLElement>('.stilo-image-dialog')!;
  const field = (index: number) =>
    dialog.querySelectorAll<HTMLInputElement>('.stilo-image-dialog__field input')[index]!;
  const parts = dialog && {
    url: dialog.querySelector<HTMLInputElement>('.stilo-image-dialog__url')!,
    file: dialog.querySelector<HTMLInputElement>('input[type="file"]')!,
    preview: dialog.querySelector<HTMLImageElement>('.stilo-image-dialog__preview')!,
    alt: field(0),
    title: field(1),
    caption: field(2),
    width: field(3),
    error: dialog.querySelector<HTMLElement>('.stilo-image-dialog__error')!,
    submit: dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!,
  };
  const imageButton = host.querySelector<HTMLButtonElement>('.stilo-image-button')!;
  return { editor, toolbar, host, button, dialog, imageButton, ...parts };
}

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Chooses `file` in the file field, as the browser's file picker does. */
function choose(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
}

function pngFile(size = 8): File {
  return new File([new Uint8Array(size)], 'photo.png', { type: 'image/png' });
}

function mouse(target: Element, type: string): void {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('image button', () => {
  it('inserts or edits: enabled where a figure fits, pressed on an image or a figure', () => {
    const { editor, toolbar, button } = setup(`<p>a|<img src="b.png"></p>${FIGURE}`);
    expect(button.getAttribute('title')).toBe('Image');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.hasAttribute('aria-disabled')).toBe(false);
    editor.commands.selectNode(2);
    toolbar.update();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    editor.commands.select(7);
    toolbar.update();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.hasAttribute('aria-disabled')).toBe(false);
    editor.setEditable(false);
    toolbar.update();
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('is not rendered without the Image extension, nor the dialog', () => {
    const { toolbar, dialog, imageButton } = setup('<p>ab</p>', [
      defaultExtensions({ image: false }),
    ]);
    expect(toolbar.element.querySelector('[data-item="image"]')).toBeNull();
    expect(dialog).toBeNull();
    expect(imageButton).toBeNull();
  });
});

describe('image dialog: insert', () => {
  it('opens from the toolbar button with empty fields and the focus in the address', () => {
    const { button, dialog, url, caption, submit, preview } = setup('<p>a|</p>');
    expect(dialog.hidden).toBe(true);
    button.click();
    expect(dialog.hidden).toBe(false);
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Insert image');
    expect(document.activeElement).toBe(url);
    expect(url.value).toBe('');
    expect(caption.closest('label')!.hidden).toBe(false);
    expect(submit.textContent).toBe('Insert');
    expect(preview.hidden).toBe(true);
  });

  it('inserts a figure from an address, with the caption as plain text', () => {
    const { editor, button, dialog, url, alt, title, caption, width, submit, preview } =
      setup('<p>a|</p>');
    button.click();
    type(url, ' https://x.test/a.png ');
    expect(preview.hidden).toBe(false);
    expect(preview.getAttribute('src')).toBe('https://x.test/a.png');
    alt.value = 'A';
    title.value = 'T';
    caption.value = 'Photo **by** <b>me</b>';
    width.value = '200';
    submit.click();
    expect(dialog.hidden).toBe(true);
    expect(editor.getHTML()).toBe(
      '<p>a</p><figure><img src="https://x.test/a.png" alt="A" title="T" width="200"><figcaption>Photo **by** &lt;b&gt;me&lt;/b&gt;</figcaption></figure><p></p>',
    );
  });

  it('asks for a source, and refuses an address that is not allowed', () => {
    const { editor, button, dialog, url, error, submit } = setup('<p>a|</p>');
    button.click();
    submit.click();
    expect(dialog.hidden).toBe(false);
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe('Choose a file or enter an address');
    type(url, 'javascript:alert(1)');
    expect(error.hidden).toBe(true);
    submit.click();
    expect(error.textContent).toBe('This address cannot be used');
    expect(url.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(url);
    expect(editor.getHTML()).toBe('<p>a</p>');
  });

  it('inserts a chosen file as a data URL', async () => {
    const { editor, button, url, file, preview, submit } = setup('<p>a|</p>');
    button.click();
    expect(file.accept).toBe('image/png,image/jpeg,image/gif,image/webp');
    choose(file, pngFile());
    await vi.waitFor(() => expect(url.value).toBe('photo.png'));
    const src = `data:image/png;base64,${btoa('\0'.repeat(8))}`;
    expect(preview.getAttribute('src')).toBe(src);
    submit.click();
    expect(editor.getHTML()).toBe(`<p>a</p><figure><img src="${src}"></figure><p></p>`);
  });

  it('refuses a file of another type, and a file over maxInlineBytes', async () => {
    const { button, file, error, submit } = setup('<p>a|</p>', [
      defaultExtensions({ image: { maxInlineBytes: 4 } }),
    ]);
    button.click();
    choose(file, new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }));
    expect(error.textContent).toBe('Use a PNG, JPEG, GIF or WebP image');
    choose(file, pngFile());
    await vi.waitFor(() => expect(error.hidden).toBe(true));
    submit.click();
    expect(error.textContent).toBe('The image is too large');
  });

  it('closes on Escape, giving the focus back to the editor', () => {
    const { editor, button, dialog, url } = setup('<p>a|</p>');
    button.click();
    url.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.hidden).toBe(true);
    expect(editor.view.hasFocus()).toBe(true);
  });
});

describe('image dialog: edit', () => {
  it('edits the selected image, keeping its size while the width does not change', () => {
    const { editor, toolbar, button, dialog, url, alt, title, caption, width, submit } = setup(
      '<p>a<img src="a.png" alt="A" width="40" height="20"></p>',
    );
    editor.commands.selectNode(2);
    toolbar.update();
    button.click();
    expect(dialog.getAttribute('aria-label')).toBe('Edit image');
    expect(submit.textContent).toBe('Apply');
    expect(url.value).toBe('a.png');
    expect(alt.value).toBe('A');
    expect(title.value).toBe('');
    expect(width.value).toBe('40');
    expect(caption.closest('label')!.hidden).toBe(true);
    alt.value = '';
    title.value = 'T';
    submit.click();
    expect(editor.getHTML()).toBe('<p>a<img src="a.png" title="T" width="40" height="20"></p>');
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
  });

  it('sets the height from the ratio of the image, and an empty width removes the size', () => {
    const { editor, button, width, submit } = setup(FIGURE);
    editor.commands.selectNode(0);
    button.click();
    width.value = '100';
    submit.click();
    expect(editor.getHTML()).toContain('<img src="a.png" alt="A" width="100" height="50">');
    button.click();
    width.value = '';
    submit.click();
    expect(editor.getHTML()).toContain('<img src="a.png" alt="A"><figcaption>cap');
  });

  it('edits the figure whose caption holds the cursor, never its caption', () => {
    const { editor, button, url, caption, submit } = setup(
      '<figure><img src="a.png"><figcaption>c<strong>a</strong>p</figcaption></figure>',
    );
    editor.commands.select(2);
    button.click();
    expect(caption.closest('label')!.hidden).toBe(true);
    type(url, 'b.png');
    submit.click();
    expect(editor.getHTML()).toBe(
      '<figure><img src="b.png"><figcaption>c<strong>a</strong>p</figcaption></figure>',
    );
  });

  it('shows an embedded image by name and keeps it', () => {
    const src = `data:image/png;base64,${btoa('\0'.repeat(8))}`;
    const { editor, button, url, alt, submit } = setup(`<p>a<img src="${src}"></p>`);
    editor.commands.selectNode(2);
    button.click();
    expect(url.value).toBe('Embedded image');
    alt.value = 'A';
    submit.click();
    expect(editor.getHTML()).toBe(`<p>a<img src="${src}" alt="A"></p>`);
  });
});

describe('image edit button', () => {
  const html = `<p>a<img src="b.png"></p>${FIGURE}`;
  const box = (editor: ReturnType<typeof setup>['editor'], index: number) =>
    editor.view.dom.querySelectorAll('.stilo-image')[index]!;

  it('is a hidden dialog button over the editor', () => {
    const { host, imageButton } = setup(html);
    expect(imageButton.parentElement).toBe(host);
    expect(imageButton.hidden).toBe(true);
    expect(imageButton.tabIndex).toBe(-1);
    expect(imageButton.getAttribute('aria-label')).toBe('Edit image');
    expect(imageButton.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('shows over the image under the mouse, until the mouse leaves it', () => {
    const { editor, host, imageButton } = setup(html);
    mouse(box(editor, 1), 'mousemove');
    expect(imageButton.hidden).toBe(false);
    mouse(imageButton, 'mousemove');
    expect(imageButton.hidden).toBe(false);
    mouse(editor.view.dom.querySelector('p')!, 'mousemove');
    expect(imageButton.hidden).toBe(true);
    mouse(box(editor, 0), 'mousemove');
    host.dispatchEvent(new MouseEvent('mouseleave'));
    expect(imageButton.hidden).toBe(true);
  });

  it('shows for the selected image while the editor has the focus, never read-only', () => {
    const { editor, imageButton } = setup(html);
    editor.focus();
    editor.commands.selectNode(4);
    expect(imageButton.hidden).toBe(false);
    editor.view.dom.blur();
    expect(imageButton.hidden).toBe(true);
    editor.setEditable(false);
    mouse(box(editor, 0), 'mousemove');
    expect(imageButton.hidden).toBe(true);
  });

  it('selects its image and opens the dialog to edit it, keeping the focus on mouse down', () => {
    const { editor, dialog, imageButton, url } = setup(html);
    mouse(box(editor, 1), 'mousemove');
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    imageButton.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    imageButton.click();
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    expect(editor.state.selection.from).toBe(4);
    expect(dialog.hidden).toBe(false);
    expect(dialog.getAttribute('aria-label')).toBe('Edit image');
    expect(url.value).toBe('a.png');
  });

  it('is removed by toolbar.destroy()', () => {
    const { toolbar, host } = setup(html);
    toolbar.destroy();
    expect(host.querySelector('.stilo-image-button')).toBeNull();
    expect(host.querySelector('.stilo-image-dialog')).toBeNull();
  });
});
