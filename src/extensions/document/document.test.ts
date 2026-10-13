import { AllSelection, NodeSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection } from '../../../tests/helpers';

describe('Document: select', () => {
  it.each([
    ['<p>Hello world</p>', 1, 6, '<p>[Hello] world</p>'],
    ['<p>Hello world</p>', 3, undefined, '<p>He|llo world</p>'],
    ['<p>ab</p><p>cd</p>', 2, 6, '<p>a[b</p><p>c]d</p>'],
    ['<p>ab</p><p>cd</p>', 0, 0, '<p>|ab</p><p>cd</p>'],
  ])('in %j, select(%j, %j) gives %j', (html, from, to, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.select(from, to)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('keeps the direction: head before anchor', () => {
    const editor = createTestEditor({ html: '<p>Hello</p>' });
    editor.commands.select(6, 1);
    expect(editor.state.selection.anchor).toBe(6);
    expect(editor.state.selection.head).toBe(1);
  });

  it('returns false outside the document, without changes', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    expect(editor.commands.select.can(-1, 2)).toBe(false);
    expect(editor.commands.select(1, 99)).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|b</p>');
  });

  it('is followed by a mark command on the selected text', () => {
    const editor = createTestEditor({ html: '<p>Hello world</p>' });
    editor.commands.select(1, 6);
    editor.commands.toggleBold();
    expect(editor.getHTML()).toBe('<p><strong>Hello</strong> world</p>');
  });
});

describe('Document: selectNode', () => {
  it('selects the node at the position', () => {
    const editor = createTestEditor({ html: '<p>a</p><hr><p>b</p>' });
    expect(editor.commands.selectNode(3)).toBe(true);
    const { selection } = editor.state;
    expect(selection).toBeInstanceOf(NodeSelection);
    expect((selection as NodeSelection).node.type.name).toBe('horizontalRule');
  });

  it.each([
    [-1, 'before the document'],
    [99, 'after the document'],
    [1, 'a text node'],
  ])('returns false at %j (%s)', (pos) => {
    const editor = createTestEditor({ html: '<p>a|</p><hr>' });
    expect(editor.commands.selectNode.can(pos)).toBe(false);
    expect(editor.commands.selectNode(pos)).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|</p><hr>');
  });
});

describe('Document: selectAll', () => {
  it('selects the whole document', () => {
    const editor = createTestEditor({ html: '<p>a|b</p><p>c</p>' });
    expect(editor.commands.selectAll()).toBe(true);
    const { selection, doc } = editor.state;
    expect(selection).toBeInstanceOf(AllSelection);
    expect([selection.from, selection.to]).toEqual([0, doc.content.size]);
  });
});
