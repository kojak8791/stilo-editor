import { GapCursor as GapCursorSelection } from 'prosemirror-gapcursor';
import { TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import { createTestEditor, pressKey } from '../../../tests/helpers';
import { defaultExtensions } from '../default-extensions';

function setGapCursor(editor: ReturnType<typeof createTestEditor>, pos: number): void {
  editor.view.dispatch(
    editor.state.tr.setSelection(new GapCursorSelection(editor.state.doc.resolve(pos))),
  );
}

function gapElements(editor: ReturnType<typeof createTestEditor>): number {
  return editor.view.dom.querySelectorAll('.ProseMirror-gapcursor').length;
}

describe('GapCursor: gap cursor selection', () => {
  it('shows gap cursor between two horizontal rules', () => {
    const editor = createTestEditor({ html: '<hr><hr>' });
    setGapCursor(editor, 1);
    expect(gapElements(editor)).toBe(1);
    expect(editor.getHTML()).toBe('<hr><hr>');
  });

  it('gap cursor hidden when disabled', () => {
    const editor = createTestEditor({
      html: '<hr><hr>',
      extensions: [defaultExtensions({ gapCursor: false })],
    });
    setGapCursor(editor, 1);
    expect(gapElements(editor)).toBe(0);
  });

  it('replaced by text selection', () => {
    const editor = createTestEditor({ html: '<hr><p>a</p>' });
    setGapCursor(editor, 0);
    expect(gapElements(editor)).toBe(1);
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 2)));
    expect(gapElements(editor)).toBe(0);
  });

  it('pressKey Enter converts to text selection', () => {
    const editor = createTestEditor({ html: '<hr><hr>' });
    setGapCursor(editor, 1);
    expect(pressKey(editor, 'Enter')).toBe(true);
    expect(editor.getHTML()).toBe('<hr><p></p><hr>');
    const sel = editor.state.selection;
    expect(sel instanceof TextSelection).toBe(true);
    if (sel instanceof TextSelection) expect(sel.from).toBe(2);
    expect(gapElements(editor)).toBe(0);
  });

  it('adds one plugin', () => {
    const withPlugin = createTestEditor().state.plugins.length;
    const without = createTestEditor({ extensions: [defaultExtensions({ gapCursor: false })] })
      .state.plugins.length;
    expect(withPlugin).toBe(without + 1);
  });
});
