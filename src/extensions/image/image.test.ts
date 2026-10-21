import { Slice } from 'prosemirror-model';
import { NodeSelection } from 'prosemirror-state';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  copySelection,
  createTestEditor,
  getHTMLWithSelection,
  pasteHTML,
  pasteText,
  pressKey,
  typeText,
} from '../../../tests/helpers';
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

const FIGURE = '<figure><img src="a.png"><figcaption>cap</figcaption></figure>';

/** The HTML of the editor; a selected node is shown as `{<pos>}` after it. */
function htmlWithNode(editor: Editor): string {
  const { selection } = editor.state;
  return selection instanceof NodeSelection
    ? `${editor.getHTML()} {${selection.from}}`
    : getHTMLWithSelection(editor);
}

describe('Figure: parse and serialize', () => {
  it.each([
    [
      '<figure><img src="a.png" alt="A" title="T" width="300" height="200"><figcaption>Fig. <strong>1</strong></figcaption></figure>',
      '<figure><img src="a.png" alt="A" title="T" width="300" height="200"><figcaption>Fig. <strong>1</strong></figcaption></figure>',
    ],
    ['<figure><img src="a.png"></figure>', '<figure><img src="a.png"></figure>'],
    [
      '<figure><img src="a.png"><figcaption></figcaption></figure>',
      '<figure><img src="a.png"></figure>',
    ],
    [
      '<figure><img src="a.png"><figcaption>by <a href="https://x.test">X</a><br><em>2</em></figcaption></figure>',
      '<figure><img src="a.png"><figcaption>by <a href="https://x.test">X</a><br><em>2</em></figcaption></figure>',
    ],
    [
      '<figure><figcaption>c</figcaption><img src="a.png" width="10"></figure>',
      '<figure><img src="a.png" width="10"><figcaption>c</figcaption></figure>',
    ],
    [
      '<figure><figcaption>a<img src="q.png">b</figcaption><img src="a.png"></figure>',
      '<figure><img src="a.png"><figcaption>ab</figcaption></figure>',
    ],
    [
      '<figure><img src="a.png"><figcaption><p>a</p><ul><li><b>b</b></li></ul></figcaption></figure>',
      '<figure><img src="a.png"><figcaption>a<br><strong>b</strong></figcaption></figure>',
    ],
    ['<figure><figcaption>x</figcaption></figure>', '<p>x</p>'],
    ['<figure><img src="javascript:alert(1)"><figcaption>x</figcaption></figure>', '<p>x</p>'],
    ['<figcaption>x</figcaption>', '<p>x</p>'],
    [
      '<table><tr><td><figure><img src="a.png"></figure></td></tr></table>',
      '<table><tbody><tr><td><figure><img src="a.png"></figure></td></tr></tbody></table>',
    ],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html: `<p>a</p><figure><img src="a.png" alt="A" width="10" height="20"><figcaption>x <em>y</em><br>z</figcaption></figure><figure><img src="${PNG}"></figure>`,
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('keeps the caption as text without the extension', () => {
    const editor = createTestEditor({
      html: FIGURE,
      extensions: [defaultExtensions({ image: false })],
    });
    expect(editor.getHTML()).toBe('<p>cap</p>');
  });

  it('copies a figure with its image and caption', () => {
    const editor = createTestEditor({ html: `<p>a</p>${FIGURE}` });
    editor.commands.selectNode(3);
    expect(copySelection(editor).html).toContain(
      '<img src="a.png"><figcaption>cap</figcaption></figure>',
    );
  });
});

describe('Figure: insertFigure', () => {
  it('splits the textblock and puts the cursor after the figure; the caption is plain text', () => {
    const editor = createTestEditor({ html: '<p>ab|cd</p>' });
    expect(editor.commands.insertFigure({ src: 'a.png', caption: '**x** <b>' })).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(
      '<p>ab</p><figure><img src="a.png"><figcaption>**x** &lt;b&gt;</figcaption></figure><p>|cd</p>',
    );
  });

  it('adds a paragraph when no textblock follows', () => {
    const editor = createTestEditor({ html: '<p>ab|</p>' });
    editor.commands.insertFigure({ src: 'a.png', alt: 'A', title: 'T', width: 30, height: 20 });
    expect(getHTMLWithSelection(editor)).toBe(
      '<p>ab</p><figure><img src="a.png" alt="A" title="T" width="30" height="20"></figure><p>|</p>',
    );
  });

  it('leaves out empty texts and sizes that are not whole pixels', () => {
    const editor = createTestEditor({ html: '<p>|</p>' });
    editor.commands.insertFigure({ src: ' a.png ', alt: '', title: '', width: 1.5, height: 0 });
    expect(editor.getHTML()).toBe('<figure><img src="a.png"></figure><p></p>');
  });

  it('is one undo step', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    editor.commands.insertFigure({ src: 'a.png', caption: 'c' });
    editor.commands.undo();
    expect(editor.getHTML()).toBe('<p>a</p>');
  });

  it.each(['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', ''])(
    'refuses the src %j',
    (src) => {
      const editor = createTestEditor({ html: '<p>a|</p>' });
      expect(editor.commands.insertFigure.can({ src })).toBe(false);
    },
  );

  it('refuses a data URL larger than maxInlineBytes', () => {
    const editor = createTestEditor({
      html: '<p>a|</p>',
      extensions: [defaultExtensions({ image: { maxInlineBytes: 6 } })],
    });
    const src = (bytes: number) => `data:image/png;base64,${btoa('\0'.repeat(bytes))}`;
    expect(editor.commands.insertFigure.can({ src: src(6) })).toBe(true);
    expect(editor.commands.insertFigure.can({ src: src(7) })).toBe(false);
  });

  it('refuses a caption as the place', () => {
    const editor = createTestEditor({ html: FIGURE });
    editor.commands.select(3);
    expect(editor.commands.insertFigure.can({ src: 'b.png' })).toBe(false);
  });
});

describe('Image: updateImage', () => {
  it('changes the given attributes of the selected image and keeps it selected', () => {
    const editor = createTestEditor({
      html: '<p>a<img src="a.png" alt="A" width="10" height="5">b</p>',
    });
    editor.commands.selectNode(2);
    const attributes = { alt: 'B', title: 'T', width: null, height: null };
    expect(editor.commands.updateImage(attributes)).toBe(true);
    expect(htmlWithNode(editor)).toBe('<p>a<img src="a.png" alt="B" title="T">b</p> {2}');
    editor.commands.undo();
    expect(editor.getHTML()).toBe('<p>a<img src="a.png" alt="A" width="10" height="5">b</p>');
  });

  it('changes the selected figure, or the figure whose caption holds the cursor', () => {
    const editor = createTestEditor({ html: `<p>a</p>${FIGURE}` });
    editor.commands.selectNode(3);
    editor.commands.updateImage({ src: 'b.png', width: 40, height: 30 });
    expect(htmlWithNode(editor)).toBe(
      '<p>a</p><figure><img src="b.png" width="40" height="30"><figcaption>cap</figcaption></figure> {3}',
    );
    editor.commands.select(6);
    editor.commands.updateImage({ alt: 'A' });
    expect(getHTMLWithSelection(editor)).toBe(
      '<p>a</p><figure><img src="b.png" alt="A" width="40" height="30"><figcaption>c|ap</figcaption></figure>',
    );
  });

  it('refuses a selection without an image and a src that insertFigure refuses', () => {
    const editor = createTestEditor({ html: '<p>a|<img src="a.png"></p>' });
    expect(editor.commands.updateImage.can({ alt: 'A' })).toBe(false);
    editor.commands.selectNode(2);
    expect(editor.commands.updateImage.can({ src: 'javascript:alert(1)' })).toBe(false);
  });

  it('dispatches nothing when nothing changes', () => {
    const editor = createTestEditor({ html: '<p>a<img src="a.png" alt="A"></p>' });
    editor.commands.selectNode(2);
    const onTransaction = vi.fn();
    editor.on('transaction', onTransaction);
    expect(editor.commands.updateImage({ src: 'a.png', alt: 'A' })).toBe(true);
    expect(onTransaction).not.toHaveBeenCalled();
  });
});

describe('Figure: caption', () => {
  const html = '<p>a</p><figure><img src="a.png"><figcaption>c|ap</figcaption></figure><p>b</p>';

  it('Enter leaves the caption for a new paragraph after the figure', () => {
    const editor = createTestEditor({ html });
    expect(pressKey(editor, 'Enter')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(`<p>a</p>${FIGURE}<p>|</p><p>b</p>`);
  });

  it('Shift-Enter inserts a hard break', () => {
    const editor = createTestEditor({ html });
    pressKey(editor, 'Shift-Enter');
    expect(getHTMLWithSelection(editor)).toBe(
      '<p>a</p><figure><img src="a.png"><figcaption>c<br>|ap</figcaption></figure><p>b</p>',
    );
  });

  it('Backspace at its start selects the figure, then deletes it', () => {
    const editor = createTestEditor({
      html: '<p>a</p><figure><img src="a.png"><figcaption>|cap</figcaption></figure><p>b</p>',
    });
    expect(pressKey(editor, 'Backspace')).toBe(true);
    expect(htmlWithNode(editor)).toBe(`<p>a</p>${FIGURE}<p>b</p> {3}`);
    pressKey(editor, 'Backspace');
    expect(editor.getHTML()).toBe('<p>a</p><p>b</p>');
  });

  it('Backspace and Delete next to a figure select it instead of merging', () => {
    const after = createTestEditor({ html: `<p>a</p>${FIGURE}<p>|b</p>` });
    pressKey(after, 'Backspace');
    expect(htmlWithNode(after)).toBe(`<p>a</p>${FIGURE}<p>b</p> {3}`);
    const before = createTestEditor({ html: `<p>a|</p>${FIGURE}<p>b</p>` });
    pressKey(before, 'Delete');
    expect(htmlWithNode(before)).toBe(`<p>a</p>${FIGURE}<p>b</p> {3}`);
  });

  it('Delete at its end does nothing', () => {
    const editor = createTestEditor({
      html: '<p>a</p><figure><img src="a.png"><figcaption>cap|</figcaption></figure><p>b</p>',
    });
    expect(pressKey(editor, 'Delete')).toBe(true);
    expect(editor.getHTML()).toBe(`<p>a</p>${FIGURE}<p>b</p>`);
  });

  it('takes marks but no block commands', () => {
    const editor = createTestEditor({
      html: '<figure><img src="a.png"><figcaption>[cap]</figcaption></figure>',
    });
    expect(editor.commands.setHeading.can({ level: 1 })).toBe(false);
    expect(editor.commands.toggleBulletList.can()).toBe(false);
    expect(editor.commands.toggleBlockquote.can()).toBe(false);
    expect(editor.commands.toggleCodeBlock.can()).toBe(false);
    editor.commands.toggleBold();
    editor.commands.setColor('#ff0000');
    editor.commands.setLink({ href: 'https://x.test' });
    expect(editor.getHTML()).toBe(
      '<figure><img src="a.png"><figcaption><a href="https://x.test"><span style="color: #ff0000"><strong>cap</strong></span></a></figcaption></figure>',
    );
  });

  it('pastes blocks as lines and leaves images out', () => {
    const editor = createTestEditor({ html });
    pasteHTML(editor, '<h1>T</h1><ul><li>x</li></ul><p>y<img src="b.png"><em>z</em></p>');
    expect(getHTMLWithSelection(editor)).toBe(
      '<p>a</p><figure><img src="a.png"><figcaption>cT<br>x<br>y<em>z|</em>ap</figcaption></figure><p>b</p>',
    );
  });

  it('pastes lines of plain text as lines', () => {
    const editor = createTestEditor({ html });
    pasteText(editor, 'x\ny');
    expect(getHTMLWithSelection(editor)).toBe(
      '<p>a</p><figure><img src="a.png"><figcaption>cx<br>y|ap</figcaption></figure><p>b</p>',
    );
  });

  it('ignores pasted image files', async () => {
    const editor = createTestEditor({ html });
    expect(pasteFiles(editor, [pngFile()])).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(editor.getHTML()).toBe(`<p>a</p>${FIGURE}<p>b</p>`);
  });

  it('shows the placeholder while its figure is selected or holds the cursor', () => {
    const editor = createTestEditor({
      html: '<p>a</p><figure><img src="a.png"></figure><p>b</p>',
    });
    const figure = () => editor.view.dom.querySelector('figure')!;
    const placeholder = () => figure().querySelector('figcaption')!.dataset.placeholder;
    expect(figure().className).toBe('stilo-figure stilo-figure--empty');
    expect(placeholder()).toBeUndefined();
    editor.commands.selectNode(3);
    expect(figure().classList).toContain('stilo-figure--active');
    expect(placeholder()).toBe('Caption');
    editor.commands.select(5);
    expect(placeholder()).toBe('Caption');
    typeText(editor, 'x');
    expect(placeholder()).toBeUndefined();
    expect(figure().className).toBe('stilo-figure stilo-figure--active');
    editor.commands.select(1);
    expect(figure().className).toBe('stilo-figure');
  });

  it('takes captionPlaceholder, and shows none when it is empty', () => {
    const placeholder = (captionPlaceholder: string) => {
      const editor = createTestEditor({
        html: '<figure><img src="a.png"></figure>',
        extensions: [defaultExtensions({ image: { captionPlaceholder } })],
      });
      editor.commands.selectNode(0);
      return editor.view.dom.querySelector('figcaption')!.dataset.placeholder;
    };
    expect(placeholder('Didascalia')).toBe('Didascalia');
    expect(placeholder('')).toBeUndefined();
  });

  it('is selected by a click on its image, not on its caption', () => {
    const editor = createTestEditor({ html: `<p>a</p>${FIGURE}` });
    const { view } = editor;
    const click = (target: Element) =>
      view.someProp('handleClickOn', (handler) =>
        handler(view, 4, view.state.doc.nodeAt(3)!, 3, { target } as unknown as MouseEvent, true),
      );
    expect(click(view.dom.querySelector('figcaption')!)).toBeFalsy();
    expect(click(view.dom.querySelector('figure img')!)).toBe(true);
    expect(htmlWithNode(editor)).toBe(`<p>a</p>${FIGURE} {3}`);
  });

  it('is resized by the handles of its image', () => {
    const editor = createTestEditor({ html: `<p>a</p>${FIGURE}` });
    document.body.append(editor.view.dom.parentElement ?? editor.view.dom);
    editor.commands.selectNode(3);
    const img = editor.view.dom.querySelector('img')!;
    vi.spyOn(img, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 100));
    const handle = editor.view.dom.querySelector('.stilo-image__handle--right')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, button: 0, bubbles: true }));
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 50 }));
    document.dispatchEvent(new PointerEvent('pointerup'));
    expect(editor.getHTML()).toBe(
      '<p>a</p><figure><img src="a.png" width="250" height="125"><figcaption>cap</figcaption></figure>',
    );
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });
});

describe('Image: drop of image files', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Drops `files` (and `html`) at the document position `pos`. */
  function dropFiles(editor: Editor, pos: number, files: File[], html = '', moved = false) {
    const { view } = editor;
    vi.spyOn(view, 'posAtCoords').mockReturnValue({ pos, inside: -1 });
    const event = {
      clientX: 0,
      clientY: 0,
      preventDefault: vi.fn(),
      dataTransfer: { files, getData: (format: string) => (format === 'text/html' ? html : '') },
    } as unknown as DragEvent;
    return view.someProp('handleDrop', (handler) => handler(view, event, Slice.empty, moved));
  }

  it('inserts each image file as a data URL where it is dropped', async () => {
    const editor = createTestEditor({ html: '<p>ab|</p><p>cd</p>' });
    expect(dropFiles(editor, 6, [pngFile()])).toBe(true);
    await vi.waitFor(() =>
      expect(editor.getHTML()).toBe(
        `<p>ab</p><p>c<img src="data:image/png;base64,${btoa('\0'.repeat(8))}">d</p>`,
      ),
    );
  });

  it('puts an image dropped on a caption before or after the figure', async () => {
    const editor = createTestEditor({ html: `<p>a</p>${FIGURE}` });
    dropFiles(editor, 6, [pngFile()]);
    await vi.waitFor(() =>
      expect(editor.getHTML()).toMatch(/^<p>a<\/p><p><img src="data:[^"]+"><\/p><figure>/),
    );
  });

  it('leaves a drop with HTML, a move or other files to ProseMirror', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    expect(dropFiles(editor, 2, [pngFile()], '<img src="https://x.test/a.png">')).toBeFalsy();
    expect(dropFiles(editor, 2, [pngFile()], '', true)).toBeFalsy();
    const text = new File(['x'], 'a.txt', { type: 'text/plain' });
    expect(dropFiles(editor, 2, [text])).toBeFalsy();
  });

  it('rejects a file larger than maxInlineBytes with imageRejected', async () => {
    const editor = createTestEditor({
      html: '<p>ab</p>',
      extensions: [defaultExtensions({ image: { maxInlineBytes: 5 } })],
    });
    const rejected = vi.fn();
    editor.on('imageRejected', rejected);
    const large = pngFile('large.png', 6);
    dropFiles(editor, 2, [large]);
    await vi.waitFor(() => expect(rejected).toHaveBeenCalledOnce());
    expect(rejected).toHaveBeenCalledWith({ editor, file: large, reason: 'tooLarge' });
    expect(editor.getHTML()).toBe('<p>ab</p>');
  });
});
