import { Slice } from 'prosemirror-model';
import { NodeSelection } from 'prosemirror-state';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pasteHTML } from '../../../tests/helpers';
import type { Editor } from '../../core/editor';
import { defaultExtensions } from '../index';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('Image: parse and serialize', () => {
  it.each([
    [
      '<p>a<img src="https://x.test/a.png" alt="A" title="T" width="300" height="200">b</p>',
      '<p>a<img src="https://x.test/a.png" alt="A" title="T" width="300" height="200">b</p>',
    ],
    ['<p><img src="a.png" alt="" title=""></p>', '<p><img src="a.png"></p>'],
    ['<p><img src="a.png" width="50%" height="auto"></p>', '<p><img src="a.png"></p>'],
    [`<p><img src="${PNG}"></p>`, `<p><img src="${PNG}"></p>`],
    ['<img src="a.png">', '<p><img src="a.png"></p>'],
    ['<p>a<img>b</p>', '<p>ab</p>'],
    ['<p><img src="javascript:alert(1)"></p>', '<p></p>'],
    ['<p><img src="data:image/svg+xml;base64,PHN2Zz4="></p>', '<p></p>'],
    ['<h2>a <img src="a.png"></h2>', '<h2>a <img src="a.png"></h2>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html: `<p>a<img src="a.png" alt="A" width="10" height="20">b</p><p><img src="${PNG}"></p>`,
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('drops images without the extension', () => {
    const editor = createTestEditor({
      html: '<p>a<img src="a.png">b</p>',
      extensions: [defaultExtensions({ image: false })],
    });
    expect(editor.getHTML()).toBe('<p>ab</p>');
  });

  it('pastes HTML images through the sanitizer', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    pasteHTML(editor, '<img src="https://x.test/a.png" onerror="alert(1)"><img src="x:y">');
    expect(editor.getHTML()).toBe('<p>a<img src="https://x.test/a.png">b</p>');
  });
});

/** Sends a paste event with `files` (and `html`, if any) to the editor's paste handlers. */
function pasteFiles(editor: Editor, files: File[], html = ''): boolean {
  const event = {
    clipboardData: { files, getData: (format: string) => (format === 'text/html' ? html : '') },
  } as unknown as ClipboardEvent;
  const { view } = editor;
  return view.someProp('handlePaste', (handler) => handler(view, event, Slice.empty)) ?? false;
}

function pngFile(name = 'a.png', size = 8): File {
  return new File([new Uint8Array(size)], name, { type: 'image/png' });
}

describe('Image: paste of image files', () => {
  const dataURL = (size: number) => `data:image/png;base64,${btoa('\0'.repeat(size))}`;

  it('inserts each image file as a data URL in place of the selection', async () => {
    const editor = createTestEditor({ html: '<p>a[x]b</p>' });
    expect(pasteFiles(editor, [pngFile(), pngFile('b.png', 3)])).toBe(true);
    await vi.waitFor(() =>
      expect(getHTMLWithSelection(editor)).toBe(
        `<p>a<img src="${dataURL(8)}"><img src="${dataURL(3)}">|b</p>`,
      ),
    );
  });

  it('leaves a paste with HTML to ProseMirror', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    expect(pasteFiles(editor, [pngFile()], '<img src="https://x.test/a.png">')).toBe(false);
  });

  it('leaves a paste without image files to ProseMirror', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    const text = new File(['x'], 'a.txt', { type: 'text/plain' });
    expect(pasteFiles(editor, [text])).toBe(false);
  });

  it('rejects a file larger than maxInlineBytes with imageRejected', async () => {
    const editor = createTestEditor({
      html: '<p>a|b</p>',
      extensions: [defaultExtensions({ image: { maxInlineBytes: 5 } })],
    });
    const rejected = vi.fn();
    editor.on('imageRejected', rejected);
    const large = pngFile('large.png', 6);
    expect(pasteFiles(editor, [large, pngFile('small.png', 5)])).toBe(true);
    await vi.waitFor(() => expect(editor.getHTML()).toBe(`<p>a<img src="${dataURL(5)}">b</p>`));
    expect(rejected).toHaveBeenCalledOnce();
    expect(rejected).toHaveBeenCalledWith({ editor, file: large, reason: 'tooLarge' });
  });

  it('rejects an SVG file as unsupportedType', async () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    const rejected = vi.fn();
    editor.on('imageRejected', rejected);
    const svg = new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' });
    expect(pasteFiles(editor, [svg])).toBe(true);
    await vi.waitFor(() => expect(rejected).toHaveBeenCalledOnce());
    expect(rejected).toHaveBeenCalledWith({ editor, file: svg, reason: 'unsupportedType' });
    expect(editor.getHTML()).toBe('<p>ab</p>');
  });
});

describe('Image: resize handles', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  /** An editor in the document with `html`, the image at `pos` selected, rendered 200×100. */
  function setup(html = '<p>a<img src="a.png">b</p>', pos = 2) {
    const editor = createTestEditor({ html });
    document.body.append(editor.view.dom.parentElement ?? editor.view.dom);
    editor.commands.selectNode(pos);
    const img = editor.view.dom.querySelector('img')!;
    vi.spyOn(img, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 100));
    const handle = (side: 'left' | 'right') =>
      editor.view.dom.querySelector<HTMLElement>(`.stilo-image__handle--${side}`)!;
    return { editor, img, handle };
  }

  function drag(handle: HTMLElement, from: number, to: number | null): void {
    handle.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: from, button: 0, bubbles: true }),
    );
    if (to !== null) document.dispatchEvent(new PointerEvent('pointermove', { clientX: to }));
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: to ?? from }));
  }

  it('renders the image between two handles', () => {
    const { editor } = setup();
    const wrapper = editor.view.dom.querySelector('.stilo-image')!;
    expect([...wrapper.children].map((el) => el.className)).toEqual([
      'stilo-image__handle stilo-image__handle--left',
      '',
      'stilo-image__handle stilo-image__handle--right',
    ]);
    expect(wrapper.querySelector('img')!.getAttribute('src')).toBe('a.png');
  });

  it('the right handle sets width and height, keeping the ratio, in one undo step', () => {
    const { editor, handle } = setup();
    drag(handle('right'), 100, 150);
    expect(editor.getHTML()).toBe('<p>a<img src="a.png" width="250" height="125">b</p>');
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    editor.commands.undo();
    expect(editor.getHTML()).toBe('<p>a<img src="a.png">b</p>');
  });

  it('the left handle grows the image when dragged to the left', () => {
    const { editor, handle } = setup();
    drag(handle('left'), 100, 60);
    expect(editor.getHTML()).toBe('<p>a<img src="a.png" width="240" height="120">b</p>');
  });

  it('keeps at least 32px of width', () => {
    const { editor, handle } = setup();
    drag(handle('right'), 300, 0);
    expect(editor.getHTML()).toBe('<p>a<img src="a.png" width="32" height="16">b</p>');
  });

  it('changes nothing without a move, or when the editor is not editable', () => {
    const { editor, handle } = setup();
    drag(handle('right'), 100, null);
    expect(editor.getHTML()).toBe('<p>a<img src="a.png">b</p>');
    editor.setEditable(false);
    drag(handle('right'), 100, 150);
    expect(editor.getHTML()).toBe('<p>a<img src="a.png">b</p>');
  });

  it('shows the new size while dragging', () => {
    const { img, handle } = setup();
    handle('right').dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 0, button: 0, bubbles: true }),
    );
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 20 }));
    expect(img.style.width).toBe('220px');
    document.dispatchEvent(new PointerEvent('pointerup'));
    expect(img.style.width).toBe('');
  });
});
