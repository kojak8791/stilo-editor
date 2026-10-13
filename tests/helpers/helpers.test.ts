import { NodeSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import {
  copySelection,
  createTestEditor,
  getHTMLWithSelection,
  pasteHTML,
  pasteText,
  pressKey,
  typeText,
} from '.';

describe('createTestEditor', () => {
  it('uses defaultExtensions and an empty document by default', () => {
    const editor = createTestEditor();
    expect(editor.getHTML()).toBe('<p></p>');
    expect(editor.schema.marks.bold).toBeDefined();
    expect(editor.state.selection.from).toBe(1);
  });

  it.each([
    ['<p>a|b</p>', 2, 2],
    ['<p>|ab</p>', 1, 1],
    ['<p>ab|</p>', 3, 3],
    ['<p>|</p>', 1, 1],
    ['<p>[ab]c</p>', 1, 3],
    ['<p>a[b</p><p>c]d</p>', 2, 6],
    ['<p><strong>a|</strong>b</p>', 2, 2],
  ])('turns the markers of %j into the selection %i–%i', (html, from, to) => {
    const editor = createTestEditor({ html });
    expect(editor.state.selection.from).toBe(from);
    expect(editor.state.selection.to).toBe(to);
    expect(editor.getHTML()).not.toMatch(/[|[\]]/);
  });

  it('removes the markers without leaving a transaction', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    expect(editor.getHTML()).toBe('<p>ab</p>');
    expect(editor.state.doc.textContent).toBe('ab');
  });

  it.each(['<p>a|b|</p>', '<p>]a[</p>', '<p>[a</p>', '<p>|[a]</p>'])(
    'rejects invalid markers in %j',
    (html) => {
      expect(() => createTestEditor({ html })).toThrow(/Invalid selection markers/);
    },
  );
});

describe('getHTMLWithSelection', () => {
  it.each([
    '<p>a|b</p>',
    '<p>|ab</p>',
    '<p>|</p>',
    '<p>[ab]c</p>',
    '<p>a[b</p><p>c]d</p>',
    '<p><strong>a|b</strong></p>',
    '<p><strong>ab|</strong>c</p>',
    '<p>a|<strong>b</strong></p>',
    '<p><strong>[ab]</strong></p>',
    '<p>[a<strong>b]</strong></p>',
    '<p>a<strong>[b]</strong>c</p>',
  ])('round-trips %j', (html) => {
    expect(getHTMLWithSelection(createTestEditor({ html }))).toBe(html);
  });

  it.each([
    ['<p><strong>ab</strong>|c</p>', '<p><strong>ab|</strong>c</p>'],
    ['<p>|<strong>a</strong></p>', '<p><strong>|a</strong></p>'],
    ['<p>a[<strong>b</strong>]c</p>', '<p>a<strong>[b]</strong>c</p>'],
  ])('writes %j in the canonical form %j', (html, expected) => {
    expect(getHTMLWithSelection(createTestEditor({ html }))).toBe(expected);
  });

  it('shows the stored marks at the cursor', () => {
    const editor = createTestEditor({ html: '<p><strong>ab|</strong></p>' });
    const { state } = editor;
    editor.view.dispatch(state.tr.setStoredMarks([]));
    expect(getHTMLWithSelection(editor)).toBe('<p><strong>ab</strong>|</p>');
  });

  it('rejects non-text selections', () => {
    const editor = createTestEditor({ html: '<p>a</p>' });
    const { state } = editor;
    editor.view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, 0)));
    expect(() => getHTMLWithSelection(editor)).toThrow(/text selections only/);
  });
});

describe('typeText and pressKey', () => {
  it('types text at the cursor', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    typeText(editor, 'bc');
    expect(getHTMLWithSelection(editor)).toBe('<p>abc|</p>');
  });

  it('returns whether a keymap handled the key', () => {
    const editor = createTestEditor({ html: '<p>[a]</p>' });
    expect(pressKey(editor, 'Mod-b')).toBe(true);
    expect(pressKey(editor, 'Mod-F12')).toBe(false);
  });
});

describe('pasteHTML, pasteText and copySelection', () => {
  it('pasteText returns true and inserts text', () => {
    const editor = createTestEditor({ html: '<p>x|y</p>' });
    expect(pasteText(editor, 'a')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>xa|y</p>');
  });

  it('pasteHTML returns true and inserts HTML', () => {
    const editor = createTestEditor({ html: '<p>x|y</p>' });
    expect(pasteHTML(editor, '<strong>a</strong>')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>x<strong>a|</strong>y</p>');
  });

  it('copySelection returns html and text', () => {
    expect(copySelection(createTestEditor({ html: '<p>[ab]</p>' }))).toEqual({
      html: '<p data-pm-slice="1 1 []">ab</p>',
      text: 'ab',
    });
  });
});
