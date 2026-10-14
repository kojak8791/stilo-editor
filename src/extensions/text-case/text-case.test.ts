import { AllSelection, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection } from '../../../tests/helpers';
import type { LetterCase } from '.';

describe('setTextCase()', () => {
  it.each<[LetterCase, string, string]>([
    ['upper', '<p>a[bc Dé]f</p>', '<p>a[BC DÉ]f</p>'],
    ['lower', '<p>A[BC Dé]F</p>', '<p>A[bc dé]F</p>'],
    ['title', '<p>[the QUICK brown-fox]</p>', '<p>[The Quick Brown-Fox]</p>'],
    ['title', "<p>[dell'anno l’amico 3rd]</p>", "<p>[Dell'anno L’amico 3rd]</p>"],
    ['title', '<p>wo[rd one]</p>', '<p>wo[rd One]</p>'],
    [
      'sentence',
      '<p>[HELLO WORLD. IT IS 3.5 KG! OK? YES… NO]</p>',
      '<p>[Hello world. It is 3.5 kg! Ok? Yes… No]</p>',
    ],
    ['sentence', '<p>One. [TWO THREE]</p>', '<p>One. [Two three]</p>'],
    ['toggle', '<p>[Caps LOCK on]</p>', '<p>[cAPS lock ON]</p>'],
  ])('%s: %s → %s', (textCase, html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.setTextCase(textCase)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('keeps the marks, also inside a word', () => {
    const editor = createTestEditor({
      html: '<p>[wo<strong>rd</strong> <a href="x">link</a> <span style="color: #ff0000">red</span>]</p>',
    });
    editor.commands.setTextCase('title');
    expect(getHTMLWithSelection(editor)).toBe(
      '<p>[Wo<strong>rd</strong> <a href="x">Link</a> <span style="color: #ff0000">Red]</span></p>',
    );
  });

  it('changes every block of the selection, in lists and tables, in one undo step', () => {
    const editor = createTestEditor({
      html: '<h1>[a</h1><ul><li>b</li></ul><table><tbody><tr><td>c]</td></tr></tbody></table>',
    });
    editor.commands.setTextCase('upper');
    expect(getHTMLWithSelection(editor)).toBe(
      '<h1>[A</h1><ul><li>B</li></ul><table><tbody><tr><td>C]</td></tr></tbody></table>',
    );
    editor.commands.undo();
    expect(editor.getHTML()).toBe(
      '<h1>a</h1><ul><li>b</li></ul><table><tbody><tr><td>c</td></tr></tbody></table>',
    );
  });

  it('keeps the selection when the text gets longer (ß → SS)', () => {
    const editor = createTestEditor({ html: '<p>[straße] x</p>' });
    editor.commands.setTextCase('upper');
    expect(getHTMLWithSelection(editor)).toBe('<p>[STRASSE] x</p>');
  });

  it('keeps the direction of the selection', () => {
    const editor = createTestEditor({ html: '<p>abc</p>' });
    const { state } = editor;
    editor.view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, 4, 1)));
    editor.commands.setTextCase('upper');
    expect(editor.state.selection.anchor).toBe(4);
    expect(editor.state.selection.head).toBe(1);
  });

  it('keeps a whole-document selection', () => {
    const editor = createTestEditor({ html: '<p>a</p><p>b</p>' });
    editor.view.dispatch(editor.state.tr.setSelection(new AllSelection(editor.state.doc)));
    editor.commands.setTextCase('upper');
    expect(editor.getHTML()).toBe('<p>A</p><p>B</p>');
    expect(editor.state.selection).toBeInstanceOf(AllSelection);
  });

  it('adds no undo step when nothing changes', () => {
    const editor = createTestEditor({ html: '<p>x</p><p>[AB]</p>' });
    editor.commands.setTextCase('upper');
    expect(editor.commands.undo.can()).toBe(false);
  });

  it('refuses an empty selection', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    expect(editor.commands.setTextCase.can('upper')).toBe(false);
    expect(editor.commands.setTextCase('upper')).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|b</p>');
  });
});
